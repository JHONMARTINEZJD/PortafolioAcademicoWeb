import { SignJWT, jwtVerify } from "jose"
import type { NextResponse } from "next/server"

export type SessionRole = "admin" | "instructor" | "aprendiz"

export interface SessionUser {
  id: string
  username: string
  role: SessionRole
  displayName: string
  linkedEstudianteId: string | null
  mustChangePassword: boolean
}

const AUTH_COOKIE_NAME = "portfolio_session"
const SESSION_TTL_SECONDS = 60 * 60 * 8
const DEV_FALLBACK_SECRET = "change-this-dev-auth-secret-at-least-32-bytes"

function getSecret() {
  const configured = process.env.AUTH_SECRET?.trim()
  const secret = configured && configured.length >= 32 ? configured : DEV_FALLBACK_SECRET
  return new TextEncoder().encode(secret)
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    username: user.username,
    displayName: user.displayName,
    linkedEstudianteId: user.linkedEstudianteId,
    mustChangePassword: user.mustChangePassword,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret())
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const role = payload.role
    if (role !== "admin" && role !== "instructor" && role !== "aprendiz") return null
    if (!payload.sub || !payload.username || !payload.displayName) return null
    return {
      id: String(payload.sub),
      username: String(payload.username),
      role,
      displayName: String(payload.displayName),
      linkedEstudianteId:
        typeof payload.linkedEstudianteId === "string"
          ? payload.linkedEstudianteId
          : null,
      mustChangePassword: Boolean(payload.mustChangePassword),
    }
  } catch {
    return null
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}
