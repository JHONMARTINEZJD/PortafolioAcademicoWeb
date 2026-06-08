import { NextResponse } from "next/server"
import { z } from "zod"
import { authenticateUser, recordAuthAudit } from "@/lib/server/auth-db"
import { createSessionToken, setSessionCookie } from "@/lib/server/session"

export const runtime = "nodejs"

const LoginSchema = z.object({
  identifier: z.string().trim().min(1).max(120).optional(),
  usuario: z.string().trim().min(1).max(80).optional(),
  clave: z.string().min(4).max(128),
  role: z.enum(["admin", "instructor", "aprendiz"]).optional(),
}).refine((v) => Boolean(v.identifier || v.usuario), {
  message: "identifier_or_usuario_required",
})

function readIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export async function POST(request: Request) {
  try {
    const parsed = LoginSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const payload = parsed.data
    const identifier = (payload.identifier || payload.usuario || "").trim()
    const user = await authenticateUser({
      username: identifier,
      password: payload.clave,
      role: payload.role,
    })

    if (!user) {
      await recordAuthAudit({
        username: identifier,
        event: "login_failed",
        detail: payload.role || "any",
        ip: readIp(request),
      })
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 })
    }

    const token = await createSessionToken(user)
    const response = NextResponse.json({
      ok: true,
      user: {
        role: user.role,
        userId: user.linkedEstudianteId || user.id,
        nombre: user.displayName,
        username: user.username,
        linkedEstudianteId: user.linkedEstudianteId,
        mustChangePassword: user.mustChangePassword,
      },
    })
    setSessionCookie(response, token)

    await recordAuthAudit({
      username: identifier,
      event: "login_success",
      detail: user.role,
      ip: readIp(request),
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "login_failed",
      },
      { status: 500 }
    )
  }
}
