import { NextResponse } from "next/server"
import { z } from "zod"
import { consumePasswordResetToken } from "@/lib/server/password-reset"
import { setUserPasswordById, recordAuthAudit, findUserById } from "@/lib/server/auth-db"

export const runtime = "nodejs"

const BodySchema = z.object({
  token: z.string().trim().min(20).max(256),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
      message: "Password must include letters and numbers",
    }),
})

export async function POST(request: Request) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const userId = await consumePasswordResetToken(parsed.data.token)
    if (!userId) {
      return NextResponse.json({ ok: false, error: "invalid_or_expired_token" }, { status: 400 })
    }

    const user = await findUserById(userId)
    const ok = await setUserPasswordById({
      userId,
      newPassword: parsed.data.newPassword,
      mustChangePassword: false,
    })
    if (!ok) {
      return NextResponse.json({ ok: false, error: "password_reset_failed" }, { status: 400 })
    }

    await recordAuthAudit({
      username: user?.username || userId,
      event: "password_reset_success",
      detail: `via_token=true`,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "reset_password_failed",
      },
      { status: 500 }
    )
  }
}
