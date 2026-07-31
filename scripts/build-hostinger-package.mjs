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

import { writeZip } from "./lib/zip-writer.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT_DIR = path.join(ROOT, "dist-hostinger")
// Timestamped so successive builds do not overwrite each other and the artifact
// uploaded to Hostinger can be traced back to when it was produced.
const BUILD_STAMP = (() => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  return (
    `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}` +
    `-${pad(now.getHours())}_${pad(now.getMinutes())}`
  )
})()
const ZIP_NAME = `tina-bakery-hostinger-${BUILD_STAMP}.zip`
const ZIP_PATH = path.join(ROOT, ZIP_NAME)

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

// Prisma 7 compiles queries in JavaScript and connects through a driver adapter,
// so there is no engine binary to ship and no binaryTargets to get wrong. Guard
// against a regression that would quietly reintroduce the native engine.
const schema = fs.readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8")
// Match an actual assignment, not the word in a comment explaining its absence.
if (/^\s*binaryTargets\s*=/m.test(schema)) {
  fail(
    "prisma/schema.prisma sets binaryTargets, which means the Rust query engine\n" +
      "is back. That engine spawns a Tokio runtime and cannot reliably get a\n" +
      "thread inside Hostinger's 120-process cgroup - the failure is\n" +
      '"PANIC: timer has gone away" on every query. Keep the driver adapter.',
  )
}
ok("prisma schema is engine-free (driver adapter)")

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

// Packages Next's require-hook resolves eagerly at startup, plus the Prisma
// driver adapter and its mariadb driver: Turbopack inlines those into the server
// chunks, so the tracer never emits them as packages and npm then prunes them.
// Without them the client has no transport and every query fails.
const REQUIRED_AT_ROOT = [
  "styled-jsx",
  "client-only",
  "server-only",
  "scheduler",
  "@prisma/adapter-mariadb",
  "mariadb",
]

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
    // import.meta.resolve fails for packages that do not export "./package.json"
    // - @prisma/adapter-mariadb is one. Look it up on disk in the project's own
    // node_modules, which is where it actually lives.
    const direct = path.join(ROOT, "node_modules", ...pkg.split("/"))
    if (fs.existsSync(path.join(direct, "package.json"))) sourceDir = direct
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
step("Step 4: Prisma client")

// Nothing to verify here any more. Prisma 7 ships no engine binary: the client
// is plain JavaScript and the connection comes from the driver adapter in
// lib/prisma.ts. The ~140 lines removed here existed to copy the Linux .so into
// every location Prisma might search, rewrite the bare specifiers inside
// Turbopack's hashed @prisma/client copy, and prove the result still resolved
// with the root node_modules hidden - all of which only mattered because of the
// native engine.
ok("Prisma 7 client needs no engine binary")
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

// Nothing under node_modules/next is pruned. These look like build-only bundles
// but the standalone server loads several at runtime - removing
// next/dist/compiled/babel produced "Cannot find module
// 'next/dist/compiled/babel/code-frame'" on boot. The few MB saved are not worth
// guessing at Next's internal requires.

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
step("Step 4c: Entry point")

// server.js is shipped EXACTLY as Next emits it. Do not wrap it.
//
// A previous version renamed it and substituted a launcher that set
// UV_THREADPOOL_SIZE before `await import`-ing the real server. That broke the
// deployment outright: Hostinger's LiteSpeed loader (lsnode.js) `require()`s
// server.js, and require() cannot load an ESM graph containing top-level await -
// ERR_REQUIRE_ASYNC_MODULE on every request.
//
// It also measured as doing nothing: 23 threads with and without the cap,
// because libuv's pool defaults to 4 and never grew under load. Set
// UV_THREADPOOL_SIZE in Hostinger's environment panel instead if it is ever
// needed - the process manager exports it before Node starts, which is the only
// point at which it actually takes effect.
ok("server.js left exactly as Next emitted it (no wrapper)")

// ---------------------------------------------------------------------------
step("Step 5: Adding runtime helpers")

// Hostinger runs `npm install` on the uploaded files even when the build command
// is "None". npm prunes anything in node_modules that package.json does not
// declare, so a dependency-less manifest made it delete the entire bundled
// node_modules ("audited 1 package") and the server then failed with
// "Cannot find module 'next'". Declare every top-level package that ships in the
// bundle, pinned to the exact version present, so npm treats the tree as
// satisfied and leaves it alone.
function readBundledDependencies() {
  const nmDir = path.join(OUT_DIR, "node_modules")
  const deps = {}

  const record = (pkgName) => {
    const manifestPath = path.join(nmDir, ...pkgName.split("/"), "package.json")
    if (!fs.existsSync(manifestPath)) return
    try {
      const { version } = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
      // Pin exactly: any range would let npm decide it needs to fetch something.
      if (version) deps[pkgName] = version
    } catch {
      // A package without a readable manifest is not one npm will prune on.
    }
  }

  for (const entry of fs.readdirSync(nmDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue
    if (entry.name.startsWith("@")) {
      for (const scoped of fs.readdirSync(path.join(nmDir, entry.name), {
        withFileTypes: true,
      })) {
        if (scoped.isDirectory()) record(`${entry.name}/${scoped.name}`)
      }
    } else {
      record(entry.name)
    }
  }

  // @prisma/client IS declared now. Under Prisma 5 it had to be left out, because
  // declaring it made npm reinstall a pristine copy and run a postinstall that
  // regenerated an unconfigured stub over the build-time client and its engine.
  // Prisma 7 generates plain JavaScript with no engine and no such postinstall,
  // so declaring it is both safe and necessary - undeclared, npm prunes it as
  // extraneous and the server starts with no database layer at all.

  return deps
}

const bundledDeps = readBundledDependencies()

const runtimePkg = {
  name: "tina-yene-bakery-hostinger",
  version: "1.0.0",
  private: true,
  scripts: {
    start: "node server.js",
    "migrate:deploy": "npx prisma migrate deploy",
  },
  dependencies: bundledDeps,
}
fs.writeFileSync(
  path.join(OUT_DIR, "package.json"),
  JSON.stringify(runtimePkg, null, 2) + "\n",
)
ok(
  `Wrote runtime package.json (start -> node server.js, ` +
    `${Object.keys(bundledDeps).length} bundled deps declared)`,
)

// Hostinger runs `npm install` on upload regardless of the build command. Even
// with dependencies declared, npm rewrites packages it considers stale - which
// destroys the generated Prisma client. These settings keep it from touching the
// bundled tree: no lockfile rewrite, no audit/fund network calls, and offline so
// it cannot pull replacements from the registry.
fs.writeFileSync(
  path.join(OUT_DIR, ".npmrc"),
  `# The application is fully built and bundled; npm should not rebuild anything.
# ignore-scripts is the important one: @prisma/client's postinstall regenerates
# an unconfigured client over the one generated at build time.
#
# Note: offline/cache settings are deliberately NOT set here. Forcing offline made
# Hostinger's install step fail rather than no-op, which left the tree in a worse
# state than letting npm run normally.
package-lock=false
audit=false
fund=false
ignore-scripts=true
`,
)
ok("Wrote .npmrc so npm install cannot rewrite the bundled node_modules")
if (Object.keys(bundledDeps).length === 0) {
  fail("No bundled dependencies were detected; npm would prune node_modules on the server.")
}

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
# Upper bound on how long cached storefront queries stay fresh, in seconds.
# Every admin change purges the caches immediately, so this only matters for
# writes that bypass the admin API (e.g. direct SQL). Tune without rebuilding.
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

  // Exercise a real query too - a static page renders fine while the database
  // layer is broken. The client is pure JavaScript now, so this runs on any
  // platform rather than only where a matching engine binary exists.
  {
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
  }

  child.kill()
})()

// ---------------------------------------------------------------------------
step("Step 6: Creating ZIP")

fs.rmSync(ZIP_PATH, { force: true })

// Written in-process rather than shelling out. Every external option was broken
// here: Compress-Archive and the .NET ZipFile API emit BACKSLASH entry names,
// which are invalid per the ZIP spec and unpack on Linux as single files with a
// literal "\" in the name rather than directories - the server then dies with
// "Cannot find module 'next'" despite every byte being present. `tar -a -c -f
// out.zip` silently writes a TAR stream, and `zip` is not installed.
const { entries } = writeZip(OUT_DIR, ZIP_PATH)
ok(`Archive written with ${entries} entries`)

// Verify the archive is a real ZIP with POSIX separators before declaring
// success. This is the exact defect that produced a 503 on Hostinger, so it is
// checked rather than assumed.
const header = Buffer.alloc(4)
const zipFd = fs.openSync(ZIP_PATH, "r")
fs.readSync(zipFd, header, 0, 4, 0)
fs.closeSync(zipFd)
if (header.toString("latin1", 0, 2) !== "PK") {
  fail("Output is not a ZIP archive (missing PK signature).")
}
ok("Verified ZIP signature")

const badSeparator = fs
  .readFileSync(ZIP_PATH)
  .toString("latin1")
  .includes("node_modules\\next\\")
if (badSeparator) {
  fail("Archive contains backslash entry names; it would not unpack on Linux.")
}
ok("Verified entry names use forward slashes")

// Hostinger's LiteSpeed loader (/usr/local/lsws/fcgi-bin/lsnode.js) starts the
// app with require(), not by executing it. require() refuses an ESM graph that
// contains top-level await, so a server.js with TLA fails with
// ERR_REQUIRE_ASYNC_MODULE on every request - while `node server.js` locally
// succeeds, which is exactly how that shipped once. Check the entry point the
// way the platform loads it.
const entrySource = fs.readFileSync(path.join(OUT_DIR, "server.js"), "utf8")
const topLevelAwait = /^\s*await\s/m.test(entrySource)
if (topLevelAwait) {
  fail(
    "server.js contains top-level await.\n" +
      "Hostinger's loader require()s this file and will fail with\n" +
      "ERR_REQUIRE_ASYNC_MODULE. Ship server.js exactly as Next emits it.",
  )
}
ok("server.js has no top-level await (safe for require())")

// ---------------------------------------------------------------------------
step("Step 7: Booting the extracted archive")

// The earlier smoke test ran against dist-hostinger/. This extracts the actual
// ZIP to a clean directory and boots that, which is what Hostinger does. Testing
// only the pre-zip directory previously missed both a corrupt archive layout and
// an over-aggressive trim, each of which produced a 503 in production.
await (async () => {
  const { spawn } = await import("node:child_process")
  // A server from a previous verification run can still hold file handles here
  // on Windows, so retry rather than aborting a build that is otherwise fine.
  const extractDir = path.join(ROOT, ".zip-verify")
  for (let attempt = 0; ; attempt++) {
    try {
      fs.rmSync(extractDir, { recursive: true, force: true })
      break
    } catch (err) {
      if (attempt >= 5) {
        fail(
          `Could not clear ${extractDir}: ${err}\n` +
            "A node process from an earlier run is probably still holding it.",
        )
      }
      await new Promise((r) => setTimeout(r, 800))
    }
  }
  fs.mkdirSync(extractDir, { recursive: true })

  try {
    execSync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ` +
        `[System.IO.Compression.ZipFile]::ExtractToDirectory('${ZIP_PATH}', '${extractDir}')"`,
      { stdio: "pipe" },
    )
  } catch (err) {
    fail(`Could not extract the archive for verification: ${err}`)
  }

  if (!fs.existsSync(path.join(extractDir, "node_modules", "next", "package.json"))) {
    fail("Extracted archive has no node_modules/next - it would 503 on Hostinger.")
  }
  ok("node_modules/next extracted as a real directory")

  // Hostinger runs `npm install` on the uploaded files even with the build
  // command set to "None". That step previously pruned the entire bundled
  // node_modules. Reproduce it here so the check fails locally instead of in
  // production.
  try {
    const installOutput = execSync("npm install --omit=dev --no-audit --no-fund", {
      cwd: extractDir,
      stdio: "pipe",
      encoding: "utf8",
    })
    const firstLine = installOutput.trim().split("\n")[0] ?? ""
    ok(`npm install completed: ${firstLine.trim()}`)
  } catch (err) {
    warn(`npm install reported an error: ${err instanceof Error ? err.message : err}`)
  }

  if (!fs.existsSync(path.join(extractDir, "node_modules", "next", "package.json"))) {
    fail(
      "npm install pruned node_modules/next from the extracted package.\n" +
        "The runtime package.json must declare the bundled dependencies.",
    )
  }
  ok("node_modules survived npm install")

  // The generated Prisma client is still the fragile part: reinstalling
  // @prisma/client replaces it with a stub whose constructor throws. There are no
  // engine binaries to check any more, but the generated code still has to be there.
  const generatedClient = path.join(extractDir, "node_modules", "@prisma", "client")
  if (!fs.existsSync(path.join(generatedClient, "package.json"))) {
    fail("npm install removed @prisma/client from the package.")
  }
  const adapterDir = path.join(extractDir, "node_modules", "@prisma", "adapter-mariadb")
  if (!fs.existsSync(path.join(adapterDir, "package.json"))) {
    fail(
      "npm install removed @prisma/adapter-mariadb.\n" +
        "Without the driver adapter the client has no way to reach the database.",
    )
  }
  ok("Prisma client and MariaDB driver adapter survived npm install")

  // Defined before the checks below so any of them can tear down cleanly. The
  // server process started further down is killed here too once it exists.
  let serverProcess = null
  const cleanup = async () => {
    if (serverProcess) serverProcess.kill()
    // Windows keeps file handles briefly after the process dies, so an immediate
    // recursive delete can EPERM. Retry, and treat a leftover directory as
    // cosmetic rather than failing a build that has already been verified.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true })
        return
      } catch {
        await new Promise((r) => setTimeout(r, 600))
      }
    }
  }

  // The Turbopack @prisma resolution checks that used to live here are gone.
  // They verified that .next/node_modules/@prisma/client-<hash> could reach the
  // native engine - including with the root node_modules hidden - which only
  // mattered while an engine binary existed. Prisma 7 resolves as ordinary
  // JavaScript, so the database check further down covers it.

  const PORT = 3989
  const testEnv = { ...process.env }
  const projectEnvPath = path.join(ROOT, ".env")
  if (fs.existsSync(projectEnvPath)) {
    for (const line of fs.readFileSync(projectEnvPath, "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line)
      if (!match) continue
      testEnv[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
    }
  }

  const child = spawn(process.execPath, ["server.js"], {
    cwd: extractDir,
    env: { ...testEnv, PORT: String(PORT), NODE_ENV: "production", HOSTNAME: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  })
  serverProcess = child
  let output = ""
  child.stdout.on("data", (d) => (output += d))
  child.stderr.on("data", (d) => (output += d))

  const deadline = Date.now() + 30_000
  let status = 0
  while (Date.now() < deadline) {
    if (child.exitCode !== null) break
    try {
      status = (await fetch(`http://127.0.0.1:${PORT}/terms`)).status
      break
    } catch {
      await new Promise((r) => setTimeout(r, 700))
    }
  }

  if (status < 200 || status >= 400) {
    await cleanup()
    console.error(`\n${output.slice(0, 2500)}`)
    fail("The extracted archive did not serve a request. It would 503 on Hostinger.")
  }
  ok(`Extracted archive booted and served /terms (HTTP ${status})`)

  // Booting with `node server.js` is NOT how Hostinger starts the app: its
  // LiteSpeed loader require()s the file from CommonJS. That path rejects
  // top-level await, so a package can pass the boot test above and still fail
  // with ERR_REQUIRE_ASYNC_MODULE in production. Load it the platform's way.
  try {
    // require() starts the server, which would then keep the check process alive
    // forever. Exit as soon as the module has loaded - reaching that point is
    // the whole assertion. PORT is shifted so this cannot collide with the
    // server started above.
    execSync(
      `node -e "try { require('./server.js') } catch (e) { ` +
        `if (e.code === 'ERR_REQUIRE_ASYNC_MODULE') { console.error('TLA'); process.exit(3) } } ` +
        `process.exit(0)"`,
      {
        cwd: extractDir,
        stdio: "pipe",
        timeout: 30_000,
        env: { ...process.env, PORT: "3991" },
      },
    )
    ok("server.js loads via require() the way Hostinger's loader does")
  } catch (requireErr) {
    if (requireErr?.status === 3) {
      await cleanup()
      fail(
        "server.js cannot be loaded with require(): ERR_REQUIRE_ASYNC_MODULE.\n" +
          "Hostinger's LiteSpeed loader require()s this file, so the deployment\n" +
          "would fail on every request even though `node server.js` works.",
      )
    }
    // Any other outcome means require() got far enough to start the server,
    // which is the behaviour we want; the boot test above already covers health.
    ok("server.js loads via require() the way Hostinger's loader does")
  }

  // A static page proves the server runs; only a query proves Prisma survived
  // the install. This is the check that the "Internal Server Error" needed.
  //
  // This used to be gated on a Windows engine binary being present, which now
  // never is - the check silently stopped running at exactly the moment it
  // mattered most. The JavaScript client works on any platform, so always run it.
  {
    let dbStatus = 0
    let dbBody = ""
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/categories`)
      dbStatus = res.status
      dbBody = await res.text()
    } catch (err) {
      await cleanup()
      fail(`Database route unreachable after npm install: ${err}`)
    }

    if (dbStatus < 200 || dbStatus >= 400) {
      await cleanup()
      console.error(`\n${dbBody.slice(0, 800)}\n---\n${output.slice(-2000)}`)
      fail(
        `Database route returned HTTP ${dbStatus} after npm install.\n` +
          "This is the 'Internal Server Error' seen on Hostinger.",
      )
    }
    ok(`Database route works after npm install (HTTP ${dbStatus})`)
  }

  await cleanup()
})()

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
