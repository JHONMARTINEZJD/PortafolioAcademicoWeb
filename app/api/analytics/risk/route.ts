import { NextResponse } from "next/server"
import { requireSession } from "@/lib/server/request-auth"
import { getLatestPortfolioData } from "@/lib/server/portfolio-snapshot"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

type RiskLevel = "alto" | "medio" | "bajo"

function getRiskLevel(input: {
  asistenciaPct: number
  aprobadas: number
  totalEvidencias: number
  rechazadas: number
}): RiskLevel {
  const avancePct =
    input.totalEvidencias > 0 ? Math.round((input.aprobadas / input.totalEvidencias) * 100) : 0

  if (input.asistenciaPct < 70 || input.rechazadas >= 2 || avancePct < 35) return "alto"
  if (input.asistenciaPct < 85 || input.rechazadas >= 1 || avancePct < 60) return "medio"
  return "bajo"
}

export async function GET(request: Request) {
  const auth = await requireSession(request, ["admin", "instructor"])
  if (!auth.ok) return auth.response

  const data = await getLatestPortfolioData()
  if (!data || data.fichas.length === 0) {
    return NextResponse.json({ ok: false, error: "no_data" }, { status: 404 })
  }

  const url = new URL(request.url)
  const fichaId = url.searchParams.get("fichaId")
  const ficha = (fichaId && data.fichas.find((f) => f.id === fichaId)) || data.fichas[0]
  if (!ficha) {
    return NextResponse.json({ ok: false, error: "ficha_not_found" }, { status: 404 })
  }

  const aprendices = ficha.estudiantes.filter((e) => e.rol === "aprendiz")
  const totalAsistencias = ficha.asistencias.length
  const allowedCompetencias =
    auth.session.role === "instructor" && auth.session.linkedEstudianteId
      ? new Set(
          ficha.competencias
            .filter((c) => c.instructor_id === auth.session.linkedEstudianteId)
            .map((c) => c.id)
        )
      : null
  const categoriasGestion = allowedCompetencias
    ? ficha.categorias.filter((c) => c.competencia_id && allowedCompetencias.has(c.competencia_id))
    : ficha.categorias
  const allEvidencias = categoriasGestion.flatMap((c) => c.evidencias)

  const items = aprendices.map((ap) => {
    const evidencias = allEvidencias.filter((e) => {
      if (e.es_material_apoyo) return false
      if (e.estudiante_id) return e.estudiante_id === ap.id
      return e.autor.trim().toLowerCase() === ap.nombre.trim().toLowerCase()
    })
    const aprobadas = evidencias.filter((e) => e.estado === "aprobada").length
    const rechazadas = evidencias.filter((e) => e.estado === "rechazada").length
    const pendientes = evidencias.length - aprobadas - rechazadas
    const asistencias = ficha.asistencias.filter((a) => a.presentes.includes(ap.id)).length
    const asistenciaPct = totalAsistencias > 0 ? Math.round((asistencias / totalAsistencias) * 100) : 100

    const riesgo = getRiskLevel({
      asistenciaPct,
      aprobadas,
      totalEvidencias: evidencias.length,
      rechazadas,
    })

    return {
      aprendizId: ap.id,
      nombre: ap.nombre,
      asistenciaPct,
      evidencias: evidencias.length,
      aprobadas,
      rechazadas,
      pendientes: Math.max(0, pendientes),
      riesgo,
    }
  })

  await recordPortfolioAudit({
    session: auth.session,
    action: "analytics_risk_view",
    detail: `ficha=${ficha.id}; rows=${items.length}`,
  })

  return NextResponse.json({
    ok: true,
    ficha: {
      id: ficha.id,
      codigo: ficha.configuracion.ficha,
      programa: ficha.configuracion.programa,
    },
    items: items.sort((a, b) => {
      const order = { alto: 0, medio: 1, bajo: 2 } as const
      if (order[a.riesgo] !== order[b.riesgo]) return order[a.riesgo] - order[b.riesgo]
      return a.nombre.localeCompare(b.nombre, "es")
    }),
  })
}
