import "dotenv/config"

import path from "node:path"
import { defineConfig } from "prisma/config"

/**
 * Prisma 7 moved datasource URLs out of schema.prisma. This file is used by the
 * CLI (migrate, db push, studio) only - the running application connects through
 * the driver adapter configured in lib/prisma.ts, not through this.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),

  migrations: {
    path: path.join("prisma", "migrations"),
  },

  datasource: {
    url: process.env.DATA_BASE_URL,
    // Only used by `prisma migrate dev` locally; production runs
    // `migrate deploy`, which never touches a shadow database.
    shadowDatabaseUrl: process.env.SHADOW_DATA_BASE_URL,
  },
})
