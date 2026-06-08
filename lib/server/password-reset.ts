import { createHash, randomBytes } from "node:crypto"
import { getPool } from "@/lib/server/db"

const TOKEN_TTL_MINUTES = 30

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex")
}

export async function ensurePasswordResetSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user
      ON password_reset_tokens (user_id, expires_at DESC)
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_password_reset_tokens_hash
      ON password_reset_tokens (token_hash)
  `)
}

export async function createPasswordResetToken(userId: string) {
  await ensurePasswordResetSchema()
  const pool = getPool()
  const token = randomBytes(32).toString("hex")
  const tokenHash = sha256(token)

  await pool.query(
    `
      INSERT INTO password_reset_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)
    `,
    [userId, tokenHash, String(TOKEN_TTL_MINUTES)]
  )
  return token
}

export async function consumePasswordResetToken(token: string) {
  await ensurePasswordResetSchema()
  const pool = getPool()
  const tokenHash = sha256(token)
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const res = await client.query<{ id: string; user_id: string }>(
      `
      SELECT id::text, user_id
      FROM password_reset_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    )
    const row = res.rows[0]
    if (!row) {
      await client.query("ROLLBACK")
      return null
    }
    await client.query(
      `
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE id = $1::bigint
      `,
      [row.id]
    )
    await client.query("COMMIT")
    return row.user_id
  } catch {
    await client.query("ROLLBACK")
    return null
  } finally {
    client.release()
  }
}
