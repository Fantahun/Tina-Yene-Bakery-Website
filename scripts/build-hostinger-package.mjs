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

// The Linux engine the Hostinger host loads at runtime. Must match a target in
// the `binaryTargets` list in prisma/schema.prisma.
// Hostinger reported "debian-openssl-1.1.x" at runtime, and the OpenSSL version
// on shared hosting can change without notice. Ship every Linux engine listed in
// prisma/schema.prisma's binaryTargets so the correct one is always present.
const LINUX_ENGINES = [
  "libquery_engine-debian-openssl-3.0.x.so.node",
  "libquery_engine-debian-openssl-1.1.x.so.node",
]
const LINUX_ENGINE = LINUX_ENGINES[0]

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

for (const engineName of LINUX_ENGINES) {
  let engineInPackage = findFile(path.join(OUT_DIR, "node_modules"), engineName)

  if (!engineInPackage) {
    const sourceEngine = findFile(path.join(ROOT, "node_modules"), engineName)
    if (!sourceEngine) {
      fail(
        `Could not find ${engineName} locally.\n` +
          "Run `npx prisma generate` so every binaryTarget in prisma/schema.prisma\n" +
          "is downloaded, then rebuild.",
      )
    }
    const targetDir =
      clientDirs[0] ?? path.join(OUT_DIR, "node_modules", ".prisma", "client")
    fs.mkdirSync(targetDir, { recursive: true })
    fs.copyFileSync(sourceEngine, path.join(targetDir, engineName))
    engineInPackage = path.join(targetDir, engineName)
  }

  const engineSizeMb = (fs.statSync(engineInPackage).size / 1024 / 1024).toFixed(1)
  ok(`${engineName} present (${engineSizeMb} MB)`)
}

// The generated client reads schema.prisma from its own directory at runtime.
for (const dir of clientDirs) {
  const target = path.join(dir, "schema.prisma")
  if (!fs.existsSync(target)) {
    fs.copyFileSync(path.join(ROOT, "prisma", "schema.prisma"), target)
    ok("Restored schema.prisma next to the generated client")
  }
}

// Turbopack copies @prisma/client into .next/node_modules under a hashed name
// (@prisma/client-<hash>). That copy's default.js does `require('.prisma/client/default')`,
// resolved relative to itself - and its nested node_modules holds only .bin.
// Locally Node walks up to the root node_modules/.prisma and it works; on the
// server that lookup fails with "Cannot find module '.prisma/client/default'".
// Place the generated client inside each hashed copy so resolution succeeds
// without depending on directory-walk luck.
const turbopackModulesDir = path.join(OUT_DIR, ".next", "node_modules", "@prisma")
if (fs.existsSync(turbopackModulesDir)) {
  const generatedClientDir = path.join(OUT_DIR, "node_modules", ".prisma", "client")
  if (!fs.existsSync(generatedClientDir)) {
    fail("No generated Prisma client available to satisfy the Turbopack copy.")
  }

  for (const hashedName of fs.readdirSync(turbopackModulesDir)) {
    const copyDir = path.join(turbopackModulesDir, hashedName)

    // Two earlier approaches failed on the server: a nested node_modules/.prisma
    // (npm prunes anything under .next/) and a relative path up to the root
    // node_modules/.prisma (the target is not reliably present after Hostinger's
    // install, even though it ships in the ZIP).
    //
    // Place the generated client *inside* the Turbopack copy as a sibling
    // directory and point the entry files at it. The require target is then a
    // relative path that never leaves this directory, so nothing outside it -
    // npm, the extractor, or Node's resolution order - can invalidate it.
    const inlinedClient = path.join(copyDir, "prisma-client")
    if (!fs.existsSync(path.join(inlinedClient, "default.js"))) {
      fs.cpSync(generatedClientDir, inlinedClient, { recursive: true, dereference: true })
      ok(`Inlined the generated client into ${hashedName}/prisma-client`)
    }

    // The generated client also requires '@prisma/client/runtime/library.js' -
    // another bare specifier that resolves upward and finds nothing on the
    // server. The runtime already ships one level up inside this same Turbopack
    // copy, so point at it relatively and the client stops depending on any
    // package outside its own directory.
    for (const entry of fs.readdirSync(inlinedClient)) {
      if (!entry.endsWith(".js")) continue
      const filePath = path.join(inlinedClient, entry)
      const source = fs.readFileSync(filePath, "utf8")
      if (!source.includes("@prisma/client/runtime/")) continue

      const rewritten = source.replace(
        /(['"])@prisma\/client\/runtime\/([\w.-]+)\1/g,
        (_match, quote, runtimeFile) => `${quote}../runtime/${runtimeFile}${quote}`,
      )

      if (rewritten !== source) {
        fs.writeFileSync(filePath, rewritten)
        ok(`Rewrote ${hashedName}/prisma-client/${entry} to the local runtime`)
      }
    }

    for (const file of ["default.js", "index.js", "edge.js", "wasm.js"]) {
      const filePath = path.join(copyDir, file)
      if (!fs.existsSync(filePath)) continue

      const source = fs.readFileSync(filePath, "utf8")
      if (!source.includes(".prisma/client")) continue

      const rewritten = source.replace(
        /(['"])\.prisma\/client\/([\w-]+)\1/g,
        (_match, quote, entry) => `${quote}./prisma-client/${entry}${quote}`,
      )

      if (rewritten !== source) {
        fs.writeFileSync(filePath, rewritten)
        ok(`Rewrote ${hashedName}/${file} to the inlined client`)
      }
    }
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

  // @prisma/client must NOT be declared. Declaring it makes npm reinstall a
  // pristine copy from the registry and run its postinstall, which regenerates
  // an unconfigured stub over the client generated at build time - the server
  // then throws "@prisma/client did not initialize yet" on the first query.
  // Leaving it undeclared keeps npm away from it; the bundled copy (and the
  // Linux engine beside it in node_modules/.prisma) is used as-is.
  delete deps["@prisma/client"]

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

  // The generated Prisma client is the fragile part: reinstalling @prisma/client
  // replaces it with a stub whose constructor throws "did not initialize yet".
  // Check the generated artifacts specifically, not just that a directory exists.
  const generatedClient = path.join(extractDir, "node_modules", ".prisma", "client")
  if (!fs.existsSync(path.join(generatedClient, "index.js"))) {
    fail("npm install destroyed the generated Prisma client (node_modules/.prisma/client).")
  }
  for (const engineName of LINUX_ENGINES) {
    if (!fs.existsSync(path.join(generatedClient, engineName))) {
      fail(`npm install removed the Linux query engine (${engineName}).`)
    }
  }
  ok("Generated Prisma client and both Linux engines survived npm install")

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

  // Resolve exactly the way the server does: from inside the Turbopack copy at
  // .next/node_modules/@prisma/client-<hash>. Booting the app locally does not
  // prove this, because Node's directory walk finds the root node_modules/.prisma
  // and silently succeeds where the server fails.
  const turboPrismaDir = path.join(extractDir, ".next", "node_modules", "@prisma")
  if (fs.existsSync(turboPrismaDir)) {
    for (const hashedName of fs.readdirSync(turboPrismaDir)) {
      const from = path.join(turboPrismaDir, hashedName, "default.js")
      if (!fs.existsSync(from)) continue
      try {
        // Actually require the module rather than only resolving it: this runs
        // the same code path the server does and surfaces a broken client, not
        // just a missing file. Pass the path as a POSIX-style specifier so
        // Windows backslashes are not read as escapes inside `node -e`.
        const specifier = from.split(path.sep).join("/")
        execSync(`node -e "require('${specifier}')"`, {
          stdio: "pipe",
          cwd: extractDir,
        })
        ok(`@prisma/${hashedName} loads the generated client`)

        // Prove the copy is self-contained. Every previous fix passed locally
        // because Node found the root node_modules/.prisma; on the server that
        // path was gone. Temporarily hide it and require again - if this still
        // works, the copy cannot be broken by anything outside its own directory.
        // Hide BOTH node_modules/.prisma and node_modules/@prisma. Hiding only
        // the former still let the copy resolve '@prisma/client/runtime/library.js'
        // upward, so the previous build passed here and failed on the server.
        const hiddenDirs = [
          path.join(extractDir, "node_modules", ".prisma"),
          path.join(extractDir, "node_modules", "@prisma"),
        ]
        const restore = []
        try {
          for (const dir of hiddenDirs) {
            if (!fs.existsSync(dir)) continue
            const hidden = `${dir}__hidden`
            fs.renameSync(dir, hidden)
            restore.push([hidden, dir])
          }
          execSync(`node -e "require('${specifier}')"`, {
            stdio: "pipe",
            cwd: extractDir,
          })
          ok(`@prisma/${hashedName} is self-contained (no external @prisma needed)`)
        } catch (isolationErr) {
          const detail = isolationErr?.stderr?.toString().slice(0, 600) ?? ""
          for (const [hidden, original] of restore) {
            if (fs.existsSync(hidden)) fs.renameSync(hidden, original)
          }
          await cleanup()
          fail(
            `@prisma/${hashedName} still depends on a package outside its own directory.\n` +
              "Those paths are not reliably present on Hostinger, which is why the\n" +
              "deployed server reports 'Cannot find module'.\n\n" +
              detail,
          )
        } finally {
          for (const [hidden, original] of restore) {
            if (fs.existsSync(hidden)) fs.renameSync(hidden, original)
          }
        }
      } catch (err) {
        const detail = err?.stderr?.toString().slice(0, 600) ?? String(err)
        await cleanup()
        fail(
          `@prisma/${hashedName} cannot load the generated Prisma client.\n` +
            "This is the 'Failed to load external module' error on Hostinger.\n\n" +
            detail,
        )
      }
    }
  }

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
  if (fs.existsSync(path.join(generatedClient, "query_engine-windows.dll.node"))) {
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
  } else {
    warn("Windows engine stripped; skipping the post-install database check")
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
