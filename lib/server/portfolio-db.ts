import type { PortfolioData } from "@/lib/types"
import { getPool } from "@/lib/server/db"

type PortfolioRow = {
  data: unknown
  updated_at: Date | string
}

export type PortfolioStateSnapshot = {
  data: PortfolioData
  updatedAt: string
  source: "postgres"
}

function isPortfolioData(value: unknown): value is PortfolioData {
  if (!value || typeof value !== "object") return false
  const maybeFichas = (value as { fichas?: unknown }).fichas
  return Array.isArray(maybeFichas)
}

async function ensurePortfolioTable() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

function emptyPortfolioData(): PortfolioData {
  return { fichas: [] }
}

export async function upsertPortfolioState(
  data: PortfolioData,
  updatedAt = new Date().toISOString()
) {
  await ensurePortfolioTable()
  const pool = getPool()
  await pool.query(
    `
    INSERT INTO portfolio_state (id, data, updated_at)
    VALUES (1, $1::jsonb, $2::timestamptz)
    ON CONFLICT (id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `,
    [JSON.stringify(data), updatedAt]
  )
  return updatedAt
}

export async function testPortfolioConnection() {
  await ensurePortfolioTable()
  return true
}

export async function getPortfolioState(
  options?: { initializeIfMissing?: boolean }
): Promise<PortfolioStateSnapshot | null> {
  const initializeIfMissing = options?.initializeIfMissing !== false
  await ensurePortfolioTable()

  const pool = getPool()
  const res = await pool.query<PortfolioRow>(
    "SELECT data, updated_at FROM portfolio_state WHERE id = 1 LIMIT 1"
  )

  if (res.rows.length > 0) {
    const row = res.rows[0]
    if (isPortfolioData(row.data)) {
      return {
        data: row.data,
        updatedAt: new Date(row.updated_at).toISOString(),
        source: "postgres",
      }
    }
  }

  if (!initializeIfMissing) return null

  const empty = emptyPortfolioData()
  const updatedAt = await upsertPortfolioState(empty)

  return {
    data: empty,
    updatedAt,
    source: "postgres",
  }
}
