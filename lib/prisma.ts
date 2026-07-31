import { PrismaClient } from "@prisma/client"
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

// Prisma 7 has no Rust query engine. Queries are compiled in JavaScript and run
// through a driver adapter - here node-mariadb, which is the recommended driver
// for MySQL.
//
// This replaced Prisma 5, whose native engine spawned a Tokio runtime with its
// own thread pool. On Hostinger's shared plan the account cgroup caps *threads*
// at 120, shared with PHP-FPM, cron and the panel's supervisor. When the engine
// could not get a thread it aborted with "PANIC: timer has gone away" - an
// unrecoverable crash that left every subsequent query failing until the process
// restarted. The same panic is reported by others on Hostinger with the same
// 120-process limit on much newer Prisma 6.x, so it was never a version bug: the
// Rust engine simply cannot run reliably in that budget.
//
// Without an engine there is no engine process, no Tokio timer thread, and no
// platform-specific binary - which also retires the OpenSSL 1.1.x/3.0.x
// binaryTargets problem that broke several earlier deployments.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const url = process.env.DATA_BASE_URL
  if (!url) {
    throw new Error(
      "DATA_BASE_URL is not set. On Hostinger set it in the environment panel.",
    )
  }

  // connectionLimit is the pool size. Kept small deliberately: queries against a
  // database on localhost return in single-digit milliseconds, so a large pool
  // buys nothing and every extra connection is another socket and another slice
  // of a quota that is already tight.
  const parsed = new URL(url)
  const connectionLimit = Number(parsed.searchParams.get("connection_limit")) || 5

  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit,
    // Fail fast rather than holding a request open when the pool is exhausted or
    // the database is unreachable; a hung request pins resources far longer than
    // an error does.
    connectTimeout: 10_000,
    acquireTimeout: 10_000,
  })

  return new PrismaClient({
    adapter,
    // Query logging on every request is pure overhead in production and keeps
    // stdout busy; keep errors and warnings only.
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "query"],
  })
}

// Cache on globalThis in every environment, production included. Each client
// owns a connection pool, so one per module context would multiply connections
// and sockets. The usual `NODE_ENV !== "production"` guard only protects against
// dev hot-reload leaks and is wrong for a long-lived self-hosted server.
export const prisma = globalForPrisma.prisma ?? createClient()

globalForPrisma.prisma = prisma

/**
 * Kept for call sites that want to pay connection setup explicitly before a
 * `Promise.all`. With the JS driver there is no engine to race, so this is a
 * no-op safeguard rather than a requirement.
 */
export const prismaReady = async () => {}
