import { NextResponse } from "next/server"
import { z } from "zod"
import { findUserByUsername, recordAuthAudit } from "@/lib/server/auth-db"
import { createPasswordResetToken } from "@/lib/server/password-reset"
import { getLatestPortfolioData } from "@/lib/server/portfolio-snapshot"

export const runtime = "nodejs"

const BodySchema = z.object({
  username: z.string().trim().min(1).max(80),
})

function okResponse() {
  return NextResponse.json({
    ok: true,
    message:
      "Si el usuario existe y tiene correo configurado, se envio un enlace de recuperacion.",
  })
}

function getBaseUrl(request: Request) {
  const appUrl = process.env.APP_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, "")
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") || "http"
  if (host) return `${proto}://${host}`
  return "http://localhost:3000"
}

async function resolveRecoveryEmail(user: {
  role: string
  linkedEstudianteId: string | null
  username: string
}) {
  if (user.role === "admin") {
    const adminEmail = process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL?.trim()
    if (adminEmail) return adminEmail
  }

  if (!user.linkedEstudianteId) return null
  const data = await getLatestPortfolioData()
  if (!data) return null
  for (const ficha of data.fichas) {
    const est = ficha.estudiantes.find((e) => e.id === user.linkedEstudianteId)
    if (est?.correo) return est.correo
  }
  return null
}

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) return okResponse()

    const username = parsed.data.username
    const user = await findUserByUsername(username)
    if (!user || !user.isActive) {
      await recordAuthAudit({ username, event: "forgot_password_unknown_user" })
      return okResponse()
    }

    const email = await resolveRecoveryEmail(user)
    if (!email) {
      await recordAuthAudit({
        username,
        event: "forgot_password_no_email",
        detail: `role=${user.role}`,
      })
      return okResponse()
    }

    const resendKey = process.env.RESEND_API_KEY?.trim()
    const resendFrom = process.env.RESEND_FROM_EMAIL?.trim()
    if (!resendKey || !resendFrom) {
      await recordAuthAudit({
        username,
        event: "forgot_password_missing_resend_config",
      })
      return okResponse()
    }

    const token = await createPasswordResetToken(user.id)
    const baseUrl = getBaseUrl(request)
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: email,
        subject: "Recuperacion de acceso - Portafolio Academico",
        html: `
          <p>Hola ${user.displayName},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>
            <a href="${resetUrl}">Haz clic aqui para restablecerla</a>
          </p>
          <p>Este enlace vence en 30 minutos.</p>
          <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        `,
      }),
    })

    await recordAuthAudit({
      username,
      event: "forgot_password_email_sent",
      detail: `to=${email}`,
    })
    return okResponse()
  } catch (error) {
    await recordAuthAudit({
      username: "unknown",
      event: "forgot_password_error",
      detail: error instanceof Error ? error.message : "unexpected",
    })
    return okResponse()
  }
}
