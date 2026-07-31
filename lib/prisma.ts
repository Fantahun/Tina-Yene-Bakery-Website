import { PrismaClient } from "@prisma/client"

// The Prisma client MUST be cached on globalThis in every environment, including
// production. Each `new PrismaClient()` spawns a separate native query-engine
// process that holds its own connection pool, so a client leaked per module
// context shows up directly in Hostinger's "Max Processes" quota and can exhaust
// the database connection ceiling (which manifests as API calls hanging rather
// than erroring). The common `NODE_ENV !== "production"` guard only protects
// against dev hot-reload leaks and is wrong for a long-lived self-hosted server.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
  prismaConnect?: Promise<void>
}

const client =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: process.env.DATA_BASE_URL,
    // Query logging on every request is pure overhead in production and keeps
    // stdout busy; keep errors and warnings only.
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn", "query"],
  })

globalForPrisma.prisma = client

// Connect once, and make every query wait for that single shared promise.
//
// Without this the engine starts lazily on whichever query runs first. The pages
// here open with `Promise.all([...])`, so on a cold start several queries reach
// the engine while it is still initialising - the debug log shows "library
// already starting, this.libraryStarted: false" repeatedly - and the Rust engine
// crashes with `PANIC: timer has gone away`. That crash is unrecoverable: the
// client stays dead until the process restarts, which is why the site returned
// 500s continuously rather than just on the first request.
function connectOnce(): Promise<void> {
  if (globalForPrisma.prismaConnect) return globalForPrisma.prismaConnect

  const promise = client.$connect().catch((error: unknown) => {
    // Never cache a rejected promise: a transient failure at boot (database not
    // up yet) would otherwise poison every later request until a restart.
    globalForPrisma.prismaConnect = undefined
    throw error
  })

  globalForPrisma.prismaConnect = promise
  return promise
}

// Applied as a client extension rather than by calling prismaReady() in each
// route, so **queries added later are protected without anyone remembering**.
// The await is a no-op once connected, so this costs nothing at steady state.
export const prisma = client.$extends({
  query: {
    async $allOperations({ args, query }) {
      await connectOnce()
      return query(args)
    },
  },
}) as unknown as PrismaClient

/**
 * Explicitly wait for the engine to be ready. Rarely needed - the extension
 * above already gates every query - but useful before a `Promise.all` if you
 * want the connection cost paid once, visibly, rather than inside the first query.
 */
export const prismaReady = connectOnce
