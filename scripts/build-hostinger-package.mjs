#!/usr/bin/env node
/**
 * Builds a self-contained deployment package for Hostinger from a local build.
 *
 * Produces dist-hostinger/ and tina-bakery-hostinger.zip containing a Next.js
 * standalone server. Nothing is installed or compiled on the server, so the
 * shared host never pays the process/CPU cost of `pnpm install` or `next build`.
 *
 * Usage:  node scripts/build-hostinger-package.mjs [--skip-build]
 */

import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT_DIR = path.join(ROOT, "dist-hostinger")
const ZIP_NAME = "tina-bakery-hostinger.zip"
const ZIP_PATH = path.join(ROOT, ZIP_NAME)

// The Linux engine the Hostinger host loads at runtime. Must match a target in
// the `binaryTargets` list in prisma/schema.prisma.
const LINUX_ENGINE = "libquery_engine-debian-openssl-3.0.x.so.node"

const skipBuild = process.argv.includes("--skip-build")

const log = (msg) => console.log(msg)
const step = (msg) => console.log(`\n\x1b[1;33m${msg}\x1b[0m\n${"-".repeat(63)}`)
const ok = (msg) => console.log(`\x1b[0;32m  OK  ${msg}\x1b[0m`)
const warn = (msg) => console.log(`\x1b[1;33m  !!  ${msg}\x1b[0m`)

function fail(msg) {
  console.error(`\x1b[0;31m\nFAILED: ${msg}\x1b[0m`)
  process.exit(1)
}

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: "inherit" })
}

/** Recursively find the first file with the given name under `dir`. */
function findFile(dir, name, depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return null
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isFile() && e.name === name) return full
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findFile(path.join(dir, e.name), name, depth + 1)
      if (found) return found
    }
  }
  return null
}

log("=".repeat(63))
log("  Tina Yene Bakery - Hostinger Standalone Package Builder")
log("=".repeat(63))

// ---------------------------------------------------------------------------
step("Step 1: Pre-flight checks")

if (!fs.existsSync(path.join(ROOT, "package.json"))) {
  fail("package.json not found - run this from the project root.")
}
ok("Found package.json")

const nextConfig = fs.readFileSync(path.join(ROOT, "next.config.mjs"), "utf8")
if (!/output\s*:\s*["']standalone["']/.test(nextConfig)) {
  fail('next.config.mjs must set output: "standalone" for this packaging mode.')
}
ok("next.config.mjs uses standalone output")

const schema = fs.readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8")
if (!schema.includes("debian-openssl-3.0.x")) {
  fail(
    "prisma/schema.prisma must list a Linux binaryTarget (debian-openssl-3.0.x).\n" +
      "Without it the Windows-only engine ships and the server cannot start.",
  )
}
ok("prisma schema targets the Linux query engine")

// ---------------------------------------------------------------------------
step("Step 2: Build")

if (skipBuild) {
  warn("--skip-build passed; reusing the existing .next directory")
} else {
  log("Running prisma generate...")
  run("npx prisma generate")
  log("\nRunning next build...")
  run("npx next build")
}

const standaloneDir = path.join(ROOT, ".next", "standalone")
if (!fs.existsSync(standaloneDir)) {
  fail(".next/standalone was not produced. Check the build output above.")
}
ok("Standalone server bundle produced")

// ---------------------------------------------------------------------------
step("Step 3: Assembling deployment directory")

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

// The standalone bundle is the deployment root: server.js + traced node_modules.
// dereference:true resolves pnpm's symlinks into real files so the package is
// self-contained rather than pointing at a store that will not exist on the server.
fs.cpSync(standaloneDir, OUT_DIR, { recursive: true, dereference: true })
ok("Copied standalone server and traced dependencies (symlinks resolved)")

// Next copies the build-time .env into the standalone output. That file holds
// development secrets and localhost URLs; shipping it would leak credentials and
// break NextAuth callbacks on the server. The server gets its own .env instead.
for (const leaked of [".env", ".env.local", ".env.development", ".env.production"]) {
  const p = path.join(OUT_DIR, leaked)
  if (fs.existsSync(p)) {
    fs.rmSync(p)
    ok(`Removed ${leaked} from the package (server supplies its own)`)
  }
}

// Static assets are deliberately excluded from the standalone trace and must be
// placed back at their served paths, or every CSS/JS/image request 404s.
const staticSrc = path.join(ROOT, ".next", "static")
if (!fs.existsSync(staticSrc)) fail(".next/static missing - build is incomplete.")
fs.cpSync(staticSrc, path.join(OUT_DIR, ".next", "static"), { recursive: true })
ok("Copied .next/static")

const publicSrc = path.join(ROOT, "public")
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(OUT_DIR, "public"), { recursive: true })
  ok("Copied public/")
} else {
  warn("public/ not found - skipping")
}

// Ship the schema and migrations so `prisma migrate deploy` can run on the server.
fs.cpSync(path.join(ROOT, "prisma"), path.join(OUT_DIR, "prisma"), { recursive: true })
ok("Copied prisma/ (schema + migrations)")

// ---------------------------------------------------------------------------
step("Step 3b: Restoring packages the tracer left out of node_modules root")

// Under pnpm, Next's standalone tracer copies some packages only into the nested
// .pnpm store and never creates the top-level entry that Node's CommonJS resolver
// needs. next/dist/server/require-hook.js does a bare `require('styled-jsx/...')`
// at startup, so a missing entry kills the server on boot with MODULE_NOT_FOUND.
// Resolve each required package from the real node_modules and materialise it.
const outNodeModules = path.join(OUT_DIR, "node_modules")

// Packages Next's require-hook resolves eagerly at startup.
const REQUIRED_AT_ROOT = ["styled-jsx", "client-only", "server-only", "scheduler"]

for (const pkg of REQUIRED_AT_ROOT) {
  const target = path.join(outNodeModules, ...pkg.split("/"))
  if (fs.existsSync(path.join(target, "package.json"))) continue

  // Resolve the package's real location from this project's install.
  let sourceDir = null
  try {
    const entry = import.meta.resolve
      ? fileURLToPath(import.meta.resolve(`${pkg}/package.json`))
      : null
    if (entry) sourceDir = path.dirname(entry)
  } catch {
    // Fall through to a manual search of the pnpm store below.
  }

  if (!sourceDir) {
    // Fall back to searching the packaged pnpm store for the package directory.
    const storeRoot = path.join(OUT_DIR, "node_modules", ".pnpm")
    if (fs.existsSync(storeRoot)) {
      for (const entry of fs.readdirSync(storeRoot)) {
        const candidate = path.join(storeRoot, entry, "node_modules", ...pkg.split("/"))
        if (fs.existsSync(path.join(candidate, "package.json"))) {
          sourceDir = candidate
          break
        }
      }
    }
  }

  // Not every package in the list is needed by every build - `server-only` and
  // `client-only`, for instance, are compile-time markers that may be erased. The
  // smoke test in step 5b is the real gate, so a miss here is only a warning.
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    warn(`${pkg} not found in the package; skipping (smoke test will confirm)`)
    continue
  }

  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.cpSync(sourceDir, target, { recursive: true, dereference: true })
  ok(`Restored ${pkg} at node_modules root`)
}

// ---------------------------------------------------------------------------
step("Step 4: Ensuring the Linux Prisma engine is present")

// Next's dependency tracer copies the Prisma client but routinely misses the
// native engine binary, which is loaded at runtime rather than imported. A
// package missing this starts and then fails on the first query - verify it
// explicitly rather than discovering it in production.
const clientDirs = []
const collectClientDirs = (base) => {
  const p = path.join(base, "node_modules", ".prisma", "client")
  if (fs.existsSync(p)) clientDirs.push(p)
}
collectClientDirs(OUT_DIR)

let engineInPackage = findFile(path.join(OUT_DIR, "node_modules"), LINUX_ENGINE)

if (!engineInPackage) {
  warn("Linux engine not traced into the package; copying it manually")
  const sourceEngine = findFile(path.join(ROOT, "node_modules"), LINUX_ENGINE)
  if (!sourceEngine) {
    fail(
      `Could not find ${LINUX_ENGINE} locally.\n` +
        "Run `npx prisma generate` first so the Linux engine is downloaded.",
    )
  }
  const targetDir =
    clientDirs[0] ?? path.join(OUT_DIR, "node_modules", ".prisma", "client")
  fs.mkdirSync(targetDir, { recursive: true })
  fs.copyFileSync(sourceEngine, path.join(targetDir, LINUX_ENGINE))
  engineInPackage = path.join(targetDir, LINUX_ENGINE)
}

const engineSizeMb = (fs.statSync(engineInPackage).size / 1024 / 1024).toFixed(1)
ok(`Linux engine present (${engineSizeMb} MB)`)

// The generated client reads schema.prisma from its own directory at runtime.
for (const dir of clientDirs) {
  const target = path.join(dir, "schema.prisma")
  if (!fs.existsSync(target)) {
    fs.copyFileSync(path.join(ROOT, "prisma", "schema.prisma"), target)
    ok("Restored schema.prisma next to the generated client")
  }
}

// Keep the Windows engine alongside the Linux one by default. Prisma loads only
// the engine matching the current platform, so carrying both is harmless on the
// server and lets you run the exact deployment package locally before uploading.
// Pass --linux-only to strip it and save ~15 MB when you want a minimal upload.
if (process.argv.includes("--linux-only")) {
  const windowsEngine = findFile(
    path.join(OUT_DIR, "node_modules"),
    "query_engine-windows.dll.node",
  )
  if (windowsEngine) {
    fs.rmSync(windowsEngine)
    ok("Removed the Windows engine (--linux-only)")
  }
} else {
  const windowsEngine = findFile(
    path.join(OUT_DIR, "node_modules"),
    "query_engine-windows.dll.node",
  )
  if (windowsEngine) {
    ok("Kept the Windows engine so the package runs locally too (--linux-only to strip)")
  }
}

// ---------------------------------------------------------------------------
step("Step 4b: Trimming build-only and wrong-platform files")

// Next's tracer is conservative and pulls in things the running server never
// loads. Removing them cuts both the upload size and the inode count, which is a
// real quota on this plan.
let freedBytes = 0

function sizeOf(target) {
  const stat = fs.statSync(target)
  if (stat.isFile()) return stat.size
  let total = 0
  for (const e of fs.readdirSync(target, { withFileTypes: true })) {
    total += sizeOf(path.join(target, e.name))
  }
  return total
}

function prune(relPath, label) {
  const full = path.join(OUT_DIR, relPath)
  if (!fs.existsSync(full)) return
  freedBytes += sizeOf(full)
  fs.rmSync(full, { recursive: true, force: true })
  ok(`Removed ${label}`)
}

// TypeScript is a build-time dependency; the compiled server never requires it.
prune("node_modules/typescript", "typescript (build-only)")

// sharp and friends ship prebuilt binaries per platform. Windows/macOS builds
// cannot run on the Linux host, and Next falls back to its WASM image path when
// no native binary matches. Scan both possible layouts (hoisted and store-based).
for (const base of ["node_modules", "node_modules/.pnpm", "node_modules/@img"]) {
  const dir = path.join(OUT_DIR, base)
  if (!fs.existsSync(dir)) continue
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/win32|darwin/.test(entry.name)) {
      prune(path.join(base, entry.name), `${entry.name} (wrong platform)`)
    }
  }
}

// Next's own bundled dev/build toolchain: the standalone server only needs the
// runtime, never the compiler or the dev server.
for (const dir of ["compiled/webpack", "compiled/terser", "compiled/babel", "compiled/jest-worker"]) {
  prune(`node_modules/next/dist/${dir}`, `next/${dir} (build-only)`)
}

// Source maps are large and only useful when debugging locally.
let mapCount = 0
const stripMaps = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) stripMaps(full)
    else if (e.name.endsWith(".js.map") || e.name.endsWith(".mjs.map")) {
      freedBytes += fs.statSync(full).size
      fs.rmSync(full)
      mapCount++
    }
  }
}
stripMaps(path.join(OUT_DIR, "node_modules"))
if (mapCount > 0) ok(`Removed ${mapCount} source maps`)

ok(`Trimmed ${(freedBytes / 1024 / 1024).toFixed(1)} MB total`)

// ---------------------------------------------------------------------------
step("Step 5: Adding runtime helpers")

// Hostinger's Node app manager invokes `npm start` in the app root.
const runtimePkg = {
  name: "tina-yene-bakery-hostinger",
  version: "1.0.0",
  private: true,
  scripts: {
    start: "node server.js",
    "migrate:deploy": "npx prisma migrate deploy",
  },
}
fs.writeFileSync(
  path.join(OUT_DIR, "package.json"),
  JSON.stringify(runtimePkg, null, 2) + "\n",
)
ok("Wrote runtime package.json (start -> node server.js)")

fs.writeFileSync(
  path.join(OUT_DIR, ".env.production.template"),
  `# Copy to .env on the server and fill in real values. Do not commit the filled copy.
# NOTE: DATA_BASE_URL points at Hostinger's LOCAL MySQL, not a remote host.
# connection_limit is deliberately small: one pooled client is enough for a
# local database and keeps the process/thread count well under the plan quota.

NODE_ENV=production
PORT=3000

DATA_BASE_URL="mysql://DB_USER:DB_PASSWORD@127.0.0.1:3306/DB_NAME?connection_limit=5&pool_timeout=10&connect_timeout=10"

NEXT_PUBLIC_BASE_URL="https://yenebakery.com"
NEXTAUTH_URL="https://yenebakery.com"
NEXTAUTH_SECRET=""

ADMIN_USERNAME=""
ADMIN_PASSWORD=""

STRIPE_SECRET_KEY=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""

EMAIL_HOST="mail.fantahun.net"
EMAIL_PORT=465
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM=""
EMAIL_TO_NOTIFY=""

REVALIDATE_SECRET=""
NEXT_PUBLIC_ISR_REVALIDATE_SECONDS=86400

NEXT_PUBLIC_MAINTENANCE_MODE=false
NEXT_PUBLIC_COMING_SOON=false
`,
)
ok("Wrote .env.production.template")

// ---------------------------------------------------------------------------
step("Step 5b: Smoke-testing the packaged server")

// Boot the assembled package and request a database-free page. This catches
// broken module resolution and over-aggressive trimming here, on a machine where
// it is cheap to diagnose, instead of on the server after an upload.
await (async () => {
  const { spawn } = await import("node:child_process")
  const PORT = 3987

  // The package intentionally ships without .env. Read the project's own env for
  // this test only, so the database check has credentials without the values ever
  // being written into the deployable directory.
  const testEnv = { ...process.env }
  const projectEnvPath = path.join(ROOT, ".env")
  if (fs.existsSync(projectEnvPath)) {
    for (const line of fs.readFileSync(projectEnvPath, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line)
      if (!match) continue
      const [, key, rawValue] = match
      testEnv[key] = rawValue.trim().replace(/^["']|["']$/g, "")
    }
  }

  const child = spawn(process.execPath, ["server.js"], {
    cwd: OUT_DIR,
    env: { ...testEnv, PORT: String(PORT), NODE_ENV: "production", HOSTNAME: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let output = ""
  child.stdout.on("data", (d) => (output += d))
  child.stderr.on("data", (d) => (output += d))

  const deadline = Date.now() + 30_000
  let status = 0

  while (Date.now() < deadline) {
    if (child.exitCode !== null) break
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/terms`)
      status = res.status
      break
    } catch {
      await new Promise((r) => setTimeout(r, 700))
    }
  }

  if (status < 200 || status >= 400) {
    child.kill()
    console.error(`\n${output.slice(0, 2000)}`)
    fail(
      "The packaged server did not serve a request. It would fail on Hostinger too.\n" +
        "See the server output above.",
    )
  }
  ok(`Server booted and served /terms (HTTP ${status})`)

  // If the Windows engine is still in the package and a database is reachable,
  // exercise a real query too. This is the check that would have caught a missing
  // or mismatched Prisma engine, which a static page alone cannot detect.
  const hasWindowsEngine = Boolean(
    findFile(path.join(OUT_DIR, "node_modules"), "query_engine-windows.dll.node"),
  )
  if (hasWindowsEngine) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/categories`)
      const body = await res.text()
      if (res.ok) {
        ok(`Database-backed route works (/api/categories -> HTTP ${res.status})`)
      } else {
        warn(`/api/categories returned HTTP ${res.status}: ${body.slice(0, 200)}`)
        warn("The package is still valid for Linux; verify the DB config locally.")
      }
    } catch (err) {
      warn(`Could not reach /api/categories: ${err instanceof Error ? err.message : err}`)
    }
  } else {
    warn("Windows engine stripped (--linux-only): skipping the database check")
  }

  child.kill()
})()

// ---------------------------------------------------------------------------
step("Step 6: Creating ZIP")

fs.rmSync(ZIP_PATH, { force: true })

// Both Compress-Archive and the .NET ZipFile API fail on this package: Next's
// route-segment output and pnpm's nested store produce paths beyond the legacy
// 260-char MAX_PATH limit, which Windows PowerShell 5.1 does not opt out of even
// when LongPathsEnabled is set in the registry. GNU tar (bundled with Windows 10+)
// handles them correctly and can write a ZIP-format archive directly.
function createZip() {
  const attempts = [
    {
      name: "tar",
      cmd: `tar -a -c -f "${ZIP_PATH}" -C "${OUT_DIR}" .`,
    },
    {
      name: "zip",
      cmd: `cd "${OUT_DIR}" && zip -rq "${ZIP_PATH}" .`,
    },
    {
      name: "powershell",
      cmd:
        `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
        `[System.IO.Compression.ZipFile]::CreateFromDirectory('${OUT_DIR}', '${ZIP_PATH}', ` +
        `[System.IO.Compression.CompressionLevel]::Optimal, $false)"`,
    },
  ]

  for (const { name, cmd } of attempts) {
    try {
      execSync(cmd, { stdio: "pipe" })
      if (fs.existsSync(ZIP_PATH) && fs.statSync(ZIP_PATH).size > 0) {
        ok(`Archive created using ${name}`)
        return
      }
    } catch {
      fs.rmSync(ZIP_PATH, { force: true })
      warn(`${name} could not create the archive; trying the next method`)
    }
  }

  fail("ZIP creation failed. The package is still usable at dist-hostinger/.")
}

createZip()

// ---------------------------------------------------------------------------
function dirSizeMb(dir) {
  let total = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name)
      if (e.isDirectory()) walk(full)
      else total += fs.statSync(full).size
    }
  }
  walk(dir)
  return (total / 1024 / 1024).toFixed(1)
}

function countFiles(dir) {
  let n = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name))
      else n++
    }
  }
  walk(dir)
  return n
}

const zipMb = (fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(1)

log("\n" + "=".repeat(63))
log("  PACKAGE READY")
log("=".repeat(63))
log(`  ZIP           : ${ZIP_NAME} (${zipMb} MB)`)
log(`  Unpacked size : ${dirSizeMb(OUT_DIR)} MB`)
log(`  File count    : ${countFiles(OUT_DIR)} (counts against the inode quota)`)
log("")
log("  Next: upload the ZIP, extract it, create .env from the template,")
log("  then set the Node app's start command to `node server.js`.")
log("  See HOSTINGER_DEPLOYMENT.md for the full runbook.")
log("=".repeat(63))
