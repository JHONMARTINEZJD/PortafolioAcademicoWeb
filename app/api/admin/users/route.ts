import { NextResponse } from "next/server"
import { z } from "zod"
import { requireSession } from "@/lib/server/request-auth"
import { listAppUsers, syncAccountsFromPortfolio } from "@/lib/server/auth-db"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

const BodySchema = z.object({
  action: z.enum(["sync_from_ficha"]),
})

export async function GET(request: Request) {
  const auth = await requireSession(request, ["admin"])
  if (!auth.ok) return auth.response

  try {
    const users = await listAppUsers()
    return NextResponse.json({ ok: true, users })
  } catch (error) {
    const fallbackUser = {
      id: "bootstrap-admin-fallback",
      username: process.env.AUTH_BOOTSTRAP_ADMIN_USER?.trim() || "admin",
      role: "admin" as const,
      displayName: process.env.AUTH_BOOTSTRAP_ADMIN_NAME?.trim() || "Administrador",
      linkedEstudianteId: null,
      mustChangePassword: true,
      isActive: true,
    }
    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        warning: error instanceof Error ? error.message : "users_list_failed",
        users: [fallbackUser],
      },
      { status: 200 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ["admin"])
  if (!auth.ok) return auth.response

  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const result = await syncAccountsFromPortfolio()
    await recordPortfolioAudit({
      session: auth.session,
      action: "admin_sync_accounts",
      detail: `scanned=${result.scanned}; updated=${result.createdOrUpdated}; disabled=${result.disabled}`,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "users_sync_failed",
      },
      { status: 500 }
    )
  }
}
