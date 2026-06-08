import { NextResponse } from "next/server"
import { requireSession } from "@/lib/server/request-auth"
import { getRecentPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const auth = await requireSession(request, ["admin", "instructor"])
  if (!auth.ok) return auth.response

  const url = new URL(request.url)
  const limitRaw = Number(url.searchParams.get("limit") || "50")
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50
  const events = await getRecentPortfolioAudit(limit)
  return NextResponse.json({ ok: true, events })
}
