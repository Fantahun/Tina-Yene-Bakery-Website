#!/usr/bin/env node
/**
 * Dumps the catalogue tables (Category, Product, ProductSize) to a timestamped
 * SQL file in backups/.
 *
 * Complements scripts/seed-catalogue.mjs rather than replacing it:
 *
 *   seed-catalogue.mjs  - a fixed, reviewable snapshot committed to the repo,
 *                         for standing a new environment up
 *   backup-catalogue.mjs - point-in-time capture of whatever is live right now,
 *                         for restoring after a mistake
 *
 * The dump is INSERT-only against existing tables, so restore it into a database
 * whose schema is already migrated.
 *
 * Usage:
 *   pnpm backup:catalogue
 *   DATA_BASE_URL=mysql://... pnpm backup:catalogue
 *
 * Restore:
 *   mysql -u USER -p DATABASE < backups/catalogue-<timestamp>.sql
 */

import "dotenv/config"

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TABLES = ["Category", "Product", "ProductSize"]

const raw = process.env.DATA_BASE_URL
if (!raw) {
  console.error("DATA_BASE_URL is not set.")
  process.exit(1)
}

const url = new URL(raw)
const database = url.pathname.replace(/^\//, "")

/** mysqldump is not always on PATH on Windows; check the usual install location. */
function findMysqldump() {
  const candidates = [
    "mysqldump",
    "C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqldump.exe",
    "C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqldump.exe",
    "/usr/bin/mysqldump",
    "/usr/local/bin/mysqldump",
  ]
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "pipe" })
      return candidate
    } catch {
      // try the next one
    }
  }
  return null
}

const mysqldump = findMysqldump()
if (!mysqldump) {
  console.error(
    "mysqldump not found. Install the MySQL client tools, or dump manually:\n" +
      `  mysqldump -u USER -p ${database} ${TABLES.join(" ")} > backup.sql`,
  )
  process.exit(1)
}

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .replace("T", "_")
  .slice(0, 19)
const outDir = path.join(ROOT, "backups")
const outFile = path.join(outDir, `catalogue-${stamp}.sql`)
fs.mkdirSync(outDir, { recursive: true })

const args = [
  `--host=${url.hostname}`,
  `--port=${url.port || 3306}`,
  `--user=${decodeURIComponent(url.username)}`,
  `--password=${decodeURIComponent(url.password)}`,
  // Consistent snapshot without locking the tables against a live site.
  "--single-transaction",
  "--no-tablespaces",
  // Data only: the schema belongs to prisma/migrations, and a CREATE TABLE here
  // could silently disagree with it.
  "--no-create-info",
  // Rewrites INSERT as REPLACE so a restore overwrites rows with the same
  // primary key instead of failing on duplicates.
  "--replace",
  "--complete-insert",
  database,
  ...TABLES,
]

if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
  args.splice(4, 0, "--ssl-mode=REQUIRED")
}

try {
  const sql = execFileSync(mysqldump, args, {
    maxBuffer: 256 * 1024 * 1024,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  fs.writeFileSync(outFile, sql)
} catch (error) {
  const detail = error?.stderr?.toString().trim() || String(error)
  console.error(`mysqldump failed:\n${detail}`)
  process.exit(1)
}

const rows = (fs.readFileSync(outFile, "utf8").match(/^REPLACE INTO/gm) || []).length
const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1)

console.log(`Backed up ${TABLES.join(", ")} from ${database} at ${url.hostname}`)
console.log(`  ${path.relative(ROOT, outFile)}  (${sizeKb} KB, ${rows} statements)`)
console.log(`\nRestore with:\n  mysql -u USER -p DATABASE < ${path.relative(ROOT, outFile)}`)
