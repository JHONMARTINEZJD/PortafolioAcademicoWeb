import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/server/request-auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({
      ok: true,
      user: {
        role: "publico",
        userId: null,
        nombre: null,
      },
    })
  }
  return NextResponse.json({
    ok: true,
    user: {
      role: session.role,
      userId: session.linkedEstudianteId || session.id,
      nombre: session.displayName,
      username: session.username,
      linkedEstudianteId: session.linkedEstudianteId,
      mustChangePassword: session.mustChangePassword,
    },
  })
}
