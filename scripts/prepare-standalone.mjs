#!/usr/bin/env node
/**
 * Post-build step: make `.next/standalone` directly runnable.
 *
 * next.config.mjs sets output: "standalone", so `next build` emits a
 * self-contained server at .next/standalone/server.js - but it deliberately
 * leaves out `.next/static` and `public/`, because Next assumes a platform will
 * serve those separately. On Hostinger nothing does, so without this step the
 * site renders HTML with no CSS, JS or images.
 *
 * Running at build time rather than start time means the entry point can be
 * `.next/standalone/server.js` itself. Copying at start time would need a
 * launcher process that spawns the real server - two Node processes instead of
 * one, which matters on a plan that counts processes.
 *
 * Used by `npm run build`, which covers the build-on-server flows (Hostinger
 * from GitHub or an uploaded source ZIP, and Vercel). The prebuilt-ZIP flow does
 * its own assembly in scripts/build-hostinger-package.mjs.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const standaloneDir = path.join(ROOT, ".next", "standalone")

if (!fs.existsSync(standaloneDir)) {
  console.log(
    "[prepare-standalone] .next/standalone not found - skipping.\n" +
      "  This is expected only if next.config.mjs no longer sets output: 'standalone'.",
  )
  process.exit(0)
}

function copyInto(sourceRelative, targetRelative, label) {
  const source = path.join(ROOT, sourceRelative)
  if (!fs.existsSync(source)) {
    console.log(`[prepare-standalone] ${label} not found at ${sourceRelative} - skipping.`)
    return
  }

  const target = path.join(standaloneDir, targetRelative)
  fs.rmSync(target, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(target), { recursive: true })
  // dereference: pnpm's store uses symlinks, which would dangle once copied.
  fs.cpSync(source, target, { recursive: true, dereference: true })
  console.log(`[prepare-standalone] Copied ${label} -> .next/standalone/${targetRelative}`)
}

copyInto(path.join(".next", "static"), path.join(".next", "static"), "static assets")
copyInto("public", "public", "public/")

// Next copies the build-time .env into the standalone output. It holds local
// development values, and on a server-side build it would shadow the real
// environment variables supplied by the hosting panel.
for (const leaked of [".env", ".env.local", ".env.development", ".env.production"]) {
  const p = path.join(standaloneDir, leaked)
  if (fs.existsSync(p)) {
    fs.rmSync(p)
    console.log(`[prepare-standalone] Removed ${leaked} (host supplies its own environment)`)
  }
}

console.log("[prepare-standalone] .next/standalone is ready to run directly.")
