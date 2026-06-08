import { getPool } from "@/lib/server/db"
import type { SessionUser } from "@/lib/server/session"

export interface PortfolioAuditEvent {
  id: string
  at: string
  actor_username: string
  actor_role: string
  action: string
  detail: string | null
}

export async function ensurePortfolioAuditSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_audit (
      id BIGSERIAL PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor_user_id TEXT NULL,
      actor_username TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NULL
    )
  `)
}

export async function recordPortfolioAudit(input: {
  session: SessionUser
  action: string
  detail?: string
}) {
  try {
    await ensurePortfolioAuditSchema()
    const pool = getPool()
    await pool.query(
      `
      INSERT INTO portfolio_audit (
        actor_user_id,
        actor_username,
        actor_role,
        action,
        detail
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        input.session.id,
        input.session.username,
        input.session.role,
        input.action,
        input.detail || null,
      ]
    )
  } catch {
    // Ignore audit failures to avoid blocking core operations.
  }
}

export async function getRecentPortfolioAudit(limit = 50): Promise<PortfolioAuditEvent[]> {
  try {
    await ensurePortfolioAuditSchema()
    const pool = getPool()
    const bounded = Math.max(1, Math.min(200, Math.floor(limit)))
    const res = await pool.query<{
      id: string
      at: string
      actor_username: string
      actor_role: string
      action: string
      detail: string | null
    }>(
      `
      SELECT
        id::text AS id,
        to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at,
        actor_username,
        actor_role,
        action,
        detail
      FROM portfolio_audit
      ORDER BY at DESC
      LIMIT $1
      `,
      [bounded]
    )
    return res.rows
  } catch {
    return []
  }
}
