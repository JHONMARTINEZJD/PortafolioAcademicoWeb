import { NextResponse } from "next/server"
import { z } from "zod"
import { requireSession } from "@/lib/server/request-auth"
import { updatePasswordForUser } from "@/lib/server/auth-db"

export const runtime = "nodejs"

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(4).max(128),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
      message: "Password must include letters and numbers",
    }),
})

export async function POST(request: Request) {
  const auth = await requireSession(request)
  if (!auth.ok) return auth.response

  try {
    const parsed = ChangePasswordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const ok = await updatePasswordForUser({
      userId: auth.session.id,
      oldPassword: parsed.data.oldPassword,
      newPassword: parsed.data.newPassword,
    })
    if (!ok) {
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "password_change_failed",
      },
      { status: 500 }
    )
  }
}
