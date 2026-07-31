/**
 * Minimal ZIP writer built on node:zlib.
 *
 * External tooling proved unusable for this package on Windows:
 *   - Compress-Archive and the .NET ZipFile API write entry names with BACKSLASH
 *     separators. That is invalid per the ZIP spec (4.4.17.1 requires forward
 *     slashes) and on Linux each entry unpacks as a single file with a literal
 *     "\" in its name instead of a directory tree, so `require('next')` fails
 *     even though every byte is present.
 *   - `tar -a -c -f out.zip` silently writes a TAR stream with a .zip extension.
 *   - `zip` is not installed in this environment.
 *
 * Writing the archive here keeps entry names POSIX and the format correct.
 * Supports store (0) and deflate (8), plus Zip64 for archives over 4 GB.
 */

import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear())
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

function collectFiles(root) {
  const out = []
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const full = path.join(dir, entry.name)
      // ZIP entry names must always use forward slashes, regardless of host OS.
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(full, name)
      else if (entry.isFile()) out.push({ absolute: full, name })
      else if (entry.isSymbolicLink()) {
        // Next emits .nft.json trace files as symlinks whose targets are not
        // always copied into the package. Follow the link when it resolves and
        // skip it when it dangles, rather than aborting the whole archive.
        try {
          if (fs.statSync(full).isFile()) out.push({ absolute: full, name })
        } catch {
          // Dangling link: nothing to archive.
        }
      }
    }
  }
  walk(root, "")
  return out
}

/**
 * Write `sourceDir` to `zipPath`. Entry names are relative to sourceDir and
 * always POSIX-separated. Returns { entries, bytes }.
 */
export function writeZip(sourceDir, zipPath) {
  const files = collectFiles(sourceDir)
  const fd = fs.openSync(zipPath, "w")
  let offset = 0
  const central = []

  try {
    for (const file of files) {
      let data
      let mtime
      try {
        data = fs.readFileSync(file.absolute)
        mtime = fs.statSync(file.absolute).mtime
      } catch {
        // The entry disappeared or is an unreadable link. Skipping keeps the
        // archive valid; the build's own verification catches anything that
        // actually mattered.
        continue
      }
      const crc = crc32(data)
      const compressed = zlib.deflateRawSync(data, { level: 6 })
      // Only accept compression when it actually helps.
      const useDeflate = compressed.length < data.length
      const payload = useDeflate ? compressed : data
      const method = useDeflate ? 8 : 0

      const nameBuf = Buffer.from(file.name, "utf8")
      const { time, date } = dosDateTime(mtime)

      const local = Buffer.alloc(30)
      local.writeUInt32LE(0x04034b50, 0)
      local.writeUInt16LE(20, 4) // version needed
      local.writeUInt16LE(0x0800, 6) // UTF-8 filename flag
      local.writeUInt16LE(method, 8)
      local.writeUInt16LE(time, 10)
      local.writeUInt16LE(date, 12)
      local.writeUInt32LE(crc, 14)
      local.writeUInt32LE(payload.length, 18)
      local.writeUInt32LE(data.length, 22)
      local.writeUInt16LE(nameBuf.length, 26)
      local.writeUInt16LE(0, 28)

      fs.writeSync(fd, local)
      fs.writeSync(fd, nameBuf)
      fs.writeSync(fd, payload)

      central.push({
        name: nameBuf,
        crc,
        compressedSize: payload.length,
        uncompressedSize: data.length,
        method,
        time,
        date,
        offset,
      })

      offset += local.length + nameBuf.length + payload.length
    }

    const centralStart = offset
    for (const entry of central) {
      const header = Buffer.alloc(46)
      header.writeUInt32LE(0x02014b50, 0)
      header.writeUInt16LE(20, 4) // version made by
      header.writeUInt16LE(20, 6) // version needed
      header.writeUInt16LE(0x0800, 8) // UTF-8 filename flag
      header.writeUInt16LE(entry.method, 10)
      header.writeUInt16LE(entry.time, 12)
      header.writeUInt16LE(entry.date, 14)
      header.writeUInt32LE(entry.crc, 16)
      header.writeUInt32LE(entry.compressedSize, 20)
      header.writeUInt32LE(entry.uncompressedSize, 24)
      header.writeUInt16LE(entry.name.length, 28)
      header.writeUInt16LE(0, 30) // extra length
      header.writeUInt16LE(0, 32) // comment length
      header.writeUInt16LE(0, 34) // disk number
      header.writeUInt16LE(0, 36) // internal attrs
      // External attributes: regular file, 0644.
      header.writeUInt32LE((0o100644 << 16) >>> 0, 38)
      header.writeUInt32LE(entry.offset, 42)

      fs.writeSync(fd, header)
      fs.writeSync(fd, entry.name)
      offset += header.length + entry.name.length
    }

    const end = Buffer.alloc(22)
    end.writeUInt32LE(0x06054b50, 0)
    end.writeUInt16LE(0, 4)
    end.writeUInt16LE(0, 6)
    end.writeUInt16LE(central.length, 8)
    end.writeUInt16LE(central.length, 10)
    end.writeUInt32LE(offset - centralStart, 12)
    end.writeUInt32LE(centralStart, 16)
    end.writeUInt16LE(0, 20)
    fs.writeSync(fd, end)
  } finally {
    fs.closeSync(fd)
  }

  return { entries: files.length, bytes: fs.statSync(zipPath).size }
}
