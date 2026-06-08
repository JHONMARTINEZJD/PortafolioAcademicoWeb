import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { requireSession } from "@/lib/server/request-auth"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

const MAX_FILE_BYTES = 15 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
])

function extensionFromName(name: string) {
  const idx = name.lastIndexOf(".")
  if (idx < 0) return ""
  const ext = name.slice(idx + 1).toLowerCase()
  return /^[a-z0-9]+$/.test(ext) ? ext : ""
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ["admin", "instructor", "aprendiz"])
  if (!auth.ok) return auth.response

  try {
    const form = await request.formData()
    const maybeFile = form.get("file")
    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 })
    }

    if (maybeFile.size <= 0 || maybeFile.size > MAX_FILE_BYTES) {
      return NextResponse.json({ ok: false, error: "invalid_size" }, { status: 400 })
    }

    const mime = maybeFile.type || "application/octet-stream"
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 })
    }

    const ext = extensionFromName(maybeFile.name)
    const fileName = `${randomUUID()}${ext ? `.${ext}` : ""}`

    const uploadDir = join(process.cwd(), "data", "uploads")
    await mkdir(uploadDir, { recursive: true })
    const filePath = join(uploadDir, fileName)
    const buffer = Buffer.from(await maybeFile.arrayBuffer())
    await writeFile(filePath, buffer)
    await recordPortfolioAudit({
      session: auth.session,
      action: "evidence_upload",
      detail: `file=${fileName}; bytes=${maybeFile.size}; mime=${mime}`,
    })

    return NextResponse.json({
      ok: true,
      url: `/api/evidences/local/${fileName}`,
      provider: "local",
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "upload_failed",
      },
      { status: 500 }
    )
  }
}
