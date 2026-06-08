import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var __portfolioPool: Pool | undefined
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL is required")
  }
  return url
}

export function getPool() {
  if (!global.__portfolioPool) {
    global.__portfolioPool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    })
  }
  return global.__portfolioPool
}
