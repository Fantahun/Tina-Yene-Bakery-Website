#!/usr/bin/env node
/**
 * Production launcher that works for both deployment paths.
 *
 * next.config.mjs sets output: "standalone", so `next build` emits a self-contained
 * server at .next/standalone/server.js and `next start` no longer applies. Hostinger's
 * GitHub deployment runs `npm start` from the repo root, so this picks the right one:
 *
 *   - standalone build present -> run .next/standalone/server.js
 *   - otherwise                -> fall back to `next start`
 *
 * The standalone bundle also needs .next/static and public/ beside it, which the
 * tracer deliberately omits; copy them in before booting.
 */

import { execFileSync, execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const standaloneServer = path.join(ROOT, ".next", "standalone", "server.js")

if (!fs.existsSync(standaloneServer)) {
  console.log("[start] No standalone build found; falling back to `next start`.")
  execSync("npx next start", { cwd: ROOT, stdio: "inherit" })
  process.exit(0)
}

const standaloneDir = path.dirname(standaloneServer)

// Static assets are excluded from the standalone trace; without them every CSS,
// JS chunk and image request 404s while the HTML still renders.
const staticSrc = path.join(ROOT, ".next", "static")
const staticDest = path.join(standaloneDir, ".next", "static")
if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
  fs.cpSync(staticSrc, staticDest, { recursive: true, dereference: true })
  console.log("[start] Copied .next/static into the standalone bundle.")
}

const publicSrc = path.join(ROOT, "public")
const publicDest = path.join(standaloneDir, "public")
if (fs.existsSync(publicSrc) && !fs.existsSync(publicDest)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, dereference: true })
  console.log("[start] Copied public/ into the standalone bundle.")
}

console.log("[start] Launching standalone server.")
execFileSync(process.execPath, [standaloneServer], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: process.env,
})
