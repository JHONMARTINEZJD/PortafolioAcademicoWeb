import { NextResponse } from "next/server"
import type { PortfolioData } from "@/lib/types"
import { requireSession } from "@/lib/server/request-auth"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"
import {
  getPortfolioState,
  testPortfolioConnection,
  upsertPortfolioState,
} from "@/lib/server/portfolio-db"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = await requireSession(request, ["admin", "instructor"])
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const testOnly = Boolean(body?.testOnly)
    const payload = body?.data ?? body
    const updatedAt =
      typeof body?.updatedAt === "string" && !Number.isNaN(Date.parse(body.updatedAt))
        ? body.updatedAt
        : new Date().toISOString()

    if (!testOnly && (!payload || typeof payload !== "object")) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    if (testOnly) {
      await testPortfolioConnection()
      return NextResponse.json({
        ok: true,
        jsonBackup: false,
        postgres: { enabled: true, testOnly: true },
        updatedAt,
        at: new Date().toISOString(),
      })
    }

    await upsertPortfolioState(payload as PortfolioData, updatedAt)

    if (!testOnly) {
      const fichasCount = Array.isArray((payload as { fichas?: unknown })?.fichas)
        ? ((payload as { fichas: unknown[] }).fichas.length || 0)
        : 0
      await recordPortfolioAudit({
        session: auth.session,
        action: "portfolio_sync",
        detail: `fichas=${fichasCount}; postgres=on`,
      })
    }

    return NextResponse.json({
      ok: true,
      jsonBackup: false,
      postgres: { enabled: true },
      updatedAt,
      at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "hybrid_sync_failed",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const auth = await requireSession(request, ["admin", "instructor", "aprendiz"])
  if (!auth.ok) return auth.response

  try {
    const snapshot = await getPortfolioState({ initializeIfMissing: true })
    if (!snapshot) {
      return NextResponse.json({ ok: false, error: "no_portfolio_data" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      source: snapshot.source,
      updatedAt: snapshot.updatedAt,
      data: snapshot.data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "hybrid_read_failed",
      },
      { status: 500 }
    )
  }
}
