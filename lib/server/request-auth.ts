import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAuthCookieName, readSessionToken, type SessionRole, type SessionUser } from "@/lib/server/session"

export async function getSessionFromRequest(request: NextRequest | Request): Promise<SessionUser | null> {
  const cookieHeader =
    "cookies" in request
      ? request.cookies.get(getAuthCookieName())?.value
      : null
  const token =
    cookieHeader ||
    parseCookieHeader(request.headers.get("cookie") || "", getAuthCookieName())
  if (!token) return null
  return readSessionToken(token)
}

export async function requireSession(
  request: NextRequest | Request,
  roles?: SessionRole[]
) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 }),
    }
  }
  if (roles && roles.length > 0 && !roles.includes(session.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 }),
    }
  }
  return { ok: true as const, session }
}

function parseCookieHeader(header: string, key: string): string | null {
  if (!header) return null
  const parts = header.split(";")
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=")
    if (rawKey === key) return rest.join("=")
  }
  return null
}
