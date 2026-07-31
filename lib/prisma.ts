import { PrismaClient } from "@prisma/client"

// The Prisma client MUST be cached on globalThis in every environment, including
// production. Each `new PrismaClient()` spawns a separate native query-engine
// process that holds its own connection pool, so a client leaked per module
// context shows up directly in Hostinger's "Max Processes" quota and can exhaust
// the database connection ceiling (which manifests as API calls hanging rather
// than erroring). The common `NODE_ENV !== "production"` guard only protects
// against dev hot-reload leaks and is wrong for a long-lived self-hosted server.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
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

globalForPrisma.prisma = prisma
