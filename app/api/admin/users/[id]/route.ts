import { NextResponse } from "next/server"
import { z } from "zod"
import { requireSession } from "@/lib/server/request-auth"
import { adminSetUserActive, adminSetUserPassword, findUserById } from "@/lib/server/auth-db"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reset_password"),
    newPassword: z.string().min(8).max(128),
    mustChangePassword: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("set_active"),
    isActive: z.boolean(),
  }),
])

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ["admin"])
  if (!auth.ok) return auth.response

  try {
    const { id } = await context.params
    const parsed = PatchSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const user = await findUserById(id)
    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 })
    }

    if (parsed.data.action === "reset_password") {
      const ok = await adminSetUserPassword({
        userId: id,
        newPassword: parsed.data.newPassword,
        mustChangePassword: parsed.data.mustChangePassword ?? true,
      })
      if (!ok) {
        return NextResponse.json({ ok: false, error: "password_reset_failed" }, { status: 400 })
      }
      await recordPortfolioAudit({
        session: auth.session,
        action: "admin_reset_user_password",
        detail: `target=${user.username}; role=${user.role}`,
      })
      return NextResponse.json({ ok: true })
    }

    if (user.role === "admin" && parsed.data.isActive === false) {
      return NextResponse.json({ ok: false, error: "cannot_disable_admin" }, { status: 400 })
    }

    const ok = await adminSetUserActive({
      userId: id,
      isActive: parsed.data.isActive,
    })
    if (!ok) {
      return NextResponse.json({ ok: false, error: "status_update_failed" }, { status: 400 })
    }
    await recordPortfolioAudit({
      session: auth.session,
      action: "admin_set_user_active",
      detail: `target=${user.username}; active=${parsed.data.isActive ? "true" : "false"}`,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "user_update_failed",
      },
      { status: 500 }
    )
  }
}
