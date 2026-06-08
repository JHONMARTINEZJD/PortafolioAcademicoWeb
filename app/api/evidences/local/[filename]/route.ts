import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { NextResponse } from "next/server"

export const runtime = "nodejs"

function safeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "")
}

function contentTypeFromExt(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "application/pdf"
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "webp") return "image/webp"
  if (ext === "mp4") return "video/mp4"
  if (ext === "webm") return "video/webm"
  if (ext === "ppt") return "application/vnd.ms-powerpoint"
  if (ext === "pptx") {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  }
  return "application/octet-stream"
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params
    const safeName = safeFileName(filename)
    if (!safeName) {
      return NextResponse.json({ ok: false, error: "invalid_filename" }, { status: 400 })
    }

    const filePath = join(process.cwd(), "data", "uploads", safeName)
    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypeFromExt(safeName),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    })
  } catch {
    return NextResponse.json({ ok: false, error: "file_not_found" }, { status: 404 })
  }
}
