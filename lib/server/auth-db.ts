import type { SessionRole, SessionUser } from "@/lib/server/session"
import type { UserRole } from "@/lib/types"
import { getPool } from "@/lib/server/db"
import { findLegacyCredential, getLatestPortfolioData } from "@/lib/server/portfolio-snapshot"
import { hashPassword, verifyPassword } from "@/lib/server/password"

type AppUserRow = {
  id: string
  username: string
  email: string | null
  document_number: string | null
  role: SessionRole
  display_name: string
  linked_estudiante_id: string | null
  password_hash: string
  must_change_password: boolean
  is_active: boolean
}

export type AppUserView = {
  id: string
  username: string
  role: SessionRole
  displayName: string
  linkedEstudianteId: string | null
  mustChangePassword: boolean
  isActive: boolean
}

export type AppUserIdentity = {
  id: string
  username: string
  role: SessionRole
  displayName: string
  linkedEstudianteId: string | null
  mustChangePassword: boolean
  isActive: boolean
}

function toSessionUser(row: AppUserRow): SessionUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    linkedEstudianteId: row.linked_estudiante_id,
    mustChangePassword: row.must_change_password,
  }
}

function toAppUserView(row: AppUserRow): AppUserView {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    linkedEstudianteId: row.linked_estudiante_id,
    mustChangePassword: row.must_change_password,
    isActive: row.is_active,
  }
}

function isValidRole(value: string): value is SessionRole {
  return value === "admin" || value === "instructor" || value === "aprendiz"
}

function normalizeRole(role?: SessionRole | UserRole) {
  if (!role) return undefined
  if (role === "admin" || role === "instructor" || role === "aprendiz") return role
  return undefined
}

export async function ensureAuthSchema() {
  const pool = getPool()
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NULL,
      document_number TEXT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'aprendiz')),
      display_name TEXT NOT NULL,
      linked_estudiante_id TEXT NULL,
      password_hash TEXT NOT NULL,
      must_change_password BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_app_users_username_lower
      ON app_users ((lower(username)))
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_app_users_email_lower
      ON app_users ((lower(email)))
      WHERE email IS NOT NULL AND email <> ''
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_app_users_document_number
      ON app_users (document_number)
      WHERE document_number IS NOT NULL AND document_number <> ''
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_audit (
      id BIGSERIAL PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      username TEXT NOT NULL,
      event TEXT NOT NULL,
      detail TEXT NULL,
      ip TEXT NULL
    )
  `)
}

export async function ensureBootstrapAdmin() {
  const pool = getPool()
  const res = await pool.query<{ total: string }>(
    "SELECT COUNT(*)::text AS total FROM app_users WHERE role = 'admin' AND is_active = true"
  )
  const count = Number(res.rows[0]?.total || "0")
  if (count > 0) return

  const username = process.env.AUTH_BOOTSTRAP_ADMIN_USER?.trim() || "admin"
  const password = process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD?.trim() || "password"
  const displayName = process.env.AUTH_BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador"
  const passwordHash = await hashPassword(password)

  await pool.query(
    `
    INSERT INTO app_users (
      id, username, role, display_name, linked_estudiante_id, password_hash, must_change_password, is_active
    )
    VALUES ($1, $2, 'admin', $3, NULL, $4, true, true)
    ON CONFLICT ((lower(username)))
    DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      role = 'admin',
      display_name = EXCLUDED.display_name,
      must_change_password = true,
      is_active = true,
      updated_at = NOW()
    `,
    [crypto.randomUUID(), username, displayName, passwordHash]
  )
}

async function findUserByUsernameRow(username: string) {
  const pool = getPool()
  const res = await pool.query<AppUserRow>(
    `
      SELECT
        id,
        username,
        email,
        document_number,
        role,
        display_name,
        linked_estudiante_id,
        password_hash,
        must_change_password,
        is_active
      FROM app_users
      WHERE lower(username) = lower($1)
      LIMIT 1
    `,
    [username.trim()]
  )
  return res.rows[0] || null
}

async function findUserByIdentifierRow(identifier: string) {
  const pool = getPool()
  const lookup = identifier.trim()
  const res = await pool.query<AppUserRow>(
    `
      SELECT
        id,
        username,
        email,
        document_number,
        role,
        display_name,
        linked_estudiante_id,
        password_hash,
        must_change_password,
        is_active
      FROM app_users
      WHERE
        lower(username) = lower($1)
        OR (email IS NOT NULL AND lower(email) = lower($1))
        OR (document_number IS NOT NULL AND document_number = $1)
      LIMIT 1
    `,
    [lookup]
  )
  return res.rows[0] || null
}

export async function findUserById(userId: string) {
  const pool = getPool()
  const res = await pool.query<AppUserRow>(
    `
      SELECT
        id,
        username,
        email,
        document_number,
        role,
        display_name,
        linked_estudiante_id,
        password_hash,
        must_change_password,
        is_active
      FROM app_users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  )
  return res.rows[0] || null
}

export async function findUserByUsername(username: string): Promise<AppUserIdentity | null> {
  await ensureAuthSchema()
  await ensureBootstrapAdmin()
  const row =
    (await findUserByIdentifierRow(username)) ||
    (await (async () => {
      const mapped = await resolveLegacyUsernameByIdentifier(username)
      if (!mapped) return null
      return findUserByUsernameRow(mapped)
    })())
  if (!row) return null
  return toAppUserView(row)
}

async function resolveLegacyUsernameByIdentifier(
  identifier: string,
  role?: SessionRole | UserRole
) {
  const normalizedRole = normalizeRole(role)
  const data = await getLatestPortfolioData()
  if (!data) return null
  const wanted = identifier.trim().toLowerCase()
  if (!wanted) return null

  for (const ficha of data.fichas) {
    for (const est of ficha.estudiantes) {
      if (normalizedRole && est.rol !== normalizedRole) continue
      const byUser = (est.usuario || "").trim().toLowerCase() === wanted
      const byMail = (est.correo || "").trim().toLowerCase() === wanted
      const byDoc = (est.documento || "").trim() === identifier.trim()
      if (byUser || byMail || byDoc) {
        return (est.usuario || "").trim() || null
      }
    }
  }
  return null
}

async function upsertFromLegacyLogin(
  identifier: string,
  password: string,
  role?: SessionRole | UserRole
) {
  const normalizedRole = normalizeRole(role)
  const username = await resolveLegacyUsernameByIdentifier(identifier, normalizedRole)
  if (!username) return null
  const legacy = await findLegacyCredential(username, normalizedRole)
  if (!legacy) return null
  if (legacy.password !== password) return null
  if (!isValidRole(legacy.role)) return null

  const pool = getPool()
  const passwordHash = await hashPassword(password)
  const res = await pool.query<AppUserRow>(
    `
    INSERT INTO app_users (
      id, username, email, document_number, role, display_name, linked_estudiante_id, password_hash, must_change_password, is_active
    )
    VALUES ($1, $2, NULL, NULL, $3, $4, $5, $6, false, true)
    ON CONFLICT ((lower(username)))
    DO UPDATE SET
      role = EXCLUDED.role,
      display_name = EXCLUDED.display_name,
      linked_estudiante_id = EXCLUDED.linked_estudiante_id,
      password_hash = EXCLUDED.password_hash,
      must_change_password = false,
      is_active = true,
      updated_at = NOW()
    RETURNING
      id,
      username,
      role,
      display_name,
      linked_estudiante_id,
      password_hash,
      must_change_password,
      is_active
    `,
    [
      crypto.randomUUID(),
      legacy.username,
      legacy.role,
      legacy.displayName,
      legacy.linkedEstudianteId,
      passwordHash,
    ]
  )
  return res.rows[0] || null
}

export async function authenticateUser(input: {
  username: string
  password: string
  role?: SessionRole | UserRole
}) {
  const wantedRole = normalizeRole(input.role)

  try {
    await ensureAuthSchema()
    await ensureBootstrapAdmin()

    const local = await findUserByIdentifierRow(input.username)
    if (local && local.is_active) {
      if (wantedRole && local.role !== wantedRole) return null
      const ok = await verifyPassword(input.password, local.password_hash)
      if (ok) return toSessionUser(local)
    }

    const synced = await upsertFromLegacyLogin(input.username, input.password, input.role)
    if (!synced || !synced.is_active) return null
    return toSessionUser(synced)
  } catch {
    // Fallback when PostgreSQL is temporarily unavailable.
    const bootstrapUser = process.env.AUTH_BOOTSTRAP_ADMIN_USER?.trim() || "admin"
    const bootstrapPass =
      process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD?.trim() || "password"
    const bootstrapName = process.env.AUTH_BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador"

    if (
      (!wantedRole || wantedRole === "admin") &&
      input.username.trim().toLowerCase() === bootstrapUser.toLowerCase() &&
      input.password === bootstrapPass
    ) {
      return {
        id: "bootstrap-admin-fallback",
        username: bootstrapUser,
        role: "admin" as const,
        displayName: bootstrapName,
        linkedEstudianteId: null,
        mustChangePassword: true,
      }
    }

    const fallbackUsername =
      (await resolveLegacyUsernameByIdentifier(input.username, wantedRole)) ||
      input.username
    const legacy = await findLegacyCredential(fallbackUsername, wantedRole)
    if (!legacy) return null
    if (legacy.password !== input.password) return null
    if (!isValidRole(legacy.role)) return null
    return {
      id: `legacy-${legacy.linkedEstudianteId || legacy.username}`,
      username: legacy.username,
      role: legacy.role,
      displayName: legacy.displayName,
      linkedEstudianteId: legacy.linkedEstudianteId,
      mustChangePassword: false,
    }
  }
}

export async function updatePasswordForUser(input: {
  userId: string
  oldPassword: string
  newPassword: string
}) {
  try {
    const row = await findUserById(input.userId)
    if (!row || !row.is_active) return false
    const validOld = await verifyPassword(input.oldPassword, row.password_hash)
    if (!validOld) return false

    const pool = getPool()
    const passwordHash = await hashPassword(input.newPassword)
    await pool.query(
      `
        UPDATE app_users
        SET password_hash = $2, must_change_password = false, updated_at = NOW()
        WHERE id = $1
      `,
      [input.userId, passwordHash]
    )
    return true
  } catch {
    return false
  }
}

export async function recordAuthAudit(input: {
  username: string
  event: string
  detail?: string
  ip?: string
}) {
  try {
    const pool = getPool()
    await pool.query(
      "INSERT INTO auth_audit (username, event, detail, ip) VALUES ($1, $2, $3, $4)",
      [input.username, input.event, input.detail || null, input.ip || null]
    )
  } catch {
    // Ignore audit write failures.
  }
}

export async function listAppUsers(): Promise<AppUserView[]> {
  await ensureAuthSchema()
  await ensureBootstrapAdmin()
  const pool = getPool()
  const res = await pool.query<AppUserRow>(
    `
      SELECT
        id,
        username,
        email,
        document_number,
        role,
        display_name,
        linked_estudiante_id,
        password_hash,
        must_change_password,
        is_active
      FROM app_users
      ORDER BY
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'instructor' THEN 2
          ELSE 3
        END,
        lower(username)
    `
  )
  return res.rows.map(toAppUserView)
}

export async function syncAccountsFromPortfolio() {
  await ensureAuthSchema()
  await ensureBootstrapAdmin()
  const data = await getLatestPortfolioData()
  if (!data) {
    return { createdOrUpdated: 0, disabled: 0, scanned: 0 }
  }

  const pool = getPool()
  const seenUsernames = new Set<string>()
  let createdOrUpdated = 0
  let scanned = 0

  for (const ficha of data.fichas) {
    for (const est of ficha.estudiantes) {
      if (est.rol !== "instructor" && est.rol !== "aprendiz") continue
      const username = (est.usuario || "").trim()
      const password = (est.clave || "").trim()
      if (!username || !password) continue

      const normalizedKey = username.toLowerCase()
      if (seenUsernames.has(normalizedKey)) continue
      seenUsernames.add(normalizedKey)
      scanned += 1

      const passwordHash = await hashPassword(password)
      const res = await pool.query(
        `
        INSERT INTO app_users (
          id, username, email, document_number, role, display_name, linked_estudiante_id, password_hash, must_change_password, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, true)
        ON CONFLICT ((lower(username)))
        DO UPDATE SET
          email = EXCLUDED.email,
          document_number = EXCLUDED.document_number,
          role = EXCLUDED.role,
          display_name = EXCLUDED.display_name,
          linked_estudiante_id = EXCLUDED.linked_estudiante_id,
          password_hash = EXCLUDED.password_hash,
          is_active = true,
          updated_at = NOW()
        `,
        [
          crypto.randomUUID(),
          username,
          (est.correo || "").trim() || null,
          (est.documento || "").trim() || null,
          est.rol,
          est.nombre || username,
          est.id || null,
          passwordHash,
        ]
      )
      createdOrUpdated += res.rowCount || 0
    }
  }

  const activeUsernames = Array.from(seenUsernames)
  let disabled = 0
  if (activeUsernames.length > 0) {
    const disabledRes = await pool.query(
      `
      UPDATE app_users
      SET is_active = false, updated_at = NOW()
      WHERE role IN ('instructor', 'aprendiz')
        AND lower(username) <> ALL($1::text[])
        AND is_active = true
      `,
      [activeUsernames]
    )
    disabled = disabledRes.rowCount || 0
  }

  return { createdOrUpdated, disabled, scanned }
}

export async function adminSetUserPassword(input: {
  userId: string
  newPassword: string
  mustChangePassword?: boolean
}) {
  await ensureAuthSchema()
  const pool = getPool()
  const passwordHash = await hashPassword(input.newPassword)
  const res = await pool.query(
    `
    UPDATE app_users
    SET
      password_hash = $2,
      must_change_password = $3,
      updated_at = NOW()
    WHERE id = $1
    `,
    [input.userId, passwordHash, input.mustChangePassword ?? true]
  )
  return (res.rowCount || 0) > 0
}

export async function adminSetUserActive(input: { userId: string; isActive: boolean }) {
  await ensureAuthSchema()
  const pool = getPool()
  const res = await pool.query(
    `
    UPDATE app_users
    SET is_active = $2, updated_at = NOW()
    WHERE id = $1
    `,
    [input.userId, input.isActive]
  )
  return (res.rowCount || 0) > 0
}

export async function setUserPasswordById(input: {
  userId: string
  newPassword: string
  mustChangePassword?: boolean
}) {
  await ensureAuthSchema()
  const pool = getPool()
  const passwordHash = await hashPassword(input.newPassword)
  const res = await pool.query(
    `
      UPDATE app_users
      SET
        password_hash = $2,
        must_change_password = $3,
        updated_at = NOW()
      WHERE id = $1 AND is_active = true
    `,
    [input.userId, passwordHash, input.mustChangePassword ?? false]
  )
  return (res.rowCount || 0) > 0
}
