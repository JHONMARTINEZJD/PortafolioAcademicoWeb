import { NextResponse } from "next/server"
import { z } from "zod"
import { requireSession } from "@/lib/server/request-auth"

export const runtime = "nodejs"

const PayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(3).max(120),
  html: z.string().trim().min(3).max(20000),
})

export async function POST(request: Request) {
  const auth = await requireSession(request, ["admin"])
  if (!auth.ok) return auth.response

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) {
    return NextResponse.json(
      { ok: false, error: "missing_resend_configuration" },
      { status: 400 }
    )
  }

  try {
    const parsed = PayloadSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 })
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: parsed.data.to,
        subject: parsed.data.subject,
        html: parsed.data.html,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return NextResponse.json(
        { ok: false, error: "resend_failed", detail },
        { status: 502 }
      )
    }

    const body = await response.json()
    return NextResponse.json({ ok: true, result: body })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "notification_failed",
      },
      { status: 500 }
    )
  }
}
