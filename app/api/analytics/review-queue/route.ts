import { NextResponse } from "next/server"
import { requireSession } from "@/lib/server/request-auth"
import { getLatestPortfolioData } from "@/lib/server/portfolio-snapshot"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"
import type { Evidencia, Ficha } from "@/lib/types"

export const runtime = "nodejs"

const DAY_MS = 24 * 60 * 60 * 1000

type CoverageGap = {
  aprendizId: string
  aprendiz: string
  ra: string
  entregadas: number
  faltantes: number
}

function toDate(value: string | undefined | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function getDiasAbierta(fecha: string): number {
  const created = toDate(fecha)
  if (!created) return 0
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / DAY_MS))
}

function resolveLearnerId(ficha: Ficha, evidencia: Evidencia): string | null {
  if (evidencia.estudiante_id) return evidencia.estudiante_id
  const wanted = evidencia.autor.trim().toLowerCase()
  if (!wanted) return null
  return (
    ficha.estudiantes.find(
      (e) => e.rol === "aprendiz" && e.nombre.trim().toLowerCase() === wanted
    )?.id || null
  )
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
  const evidenciaRows = categoriasGestion.flatMap((cat) =>
    cat.evidencias.map((ev) => ({
      ...ev,
      categoriaId: cat.id,
      categoriaNombre: cat.nombre,
      learnerId: resolveLearnerId(ficha, ev),
    }))
  )

  const pendientes = evidenciaRows
    .filter((ev) => !ev.es_material_apoyo && ev.estado === "enviada")
    .map((ev) => ({
      id: ev.id,
      titulo: ev.titulo,
      autor: ev.autor,
      learnerId: ev.learnerId,
      categoriaId: ev.categoriaId,
      categoriaNombre: ev.categoriaNombre,
      ra: ev.resultado_aprendizaje,
      fecha: ev.fecha,
      diasAbierta: getDiasAbierta(ev.fecha),
    }))

  const slaDias =
    Number.isFinite(Number(ficha.configuracion.sla_revision_dias)) &&
    Number(ficha.configuracion.sla_revision_dias) > 0
      ? Math.min(60, Math.floor(Number(ficha.configuracion.sla_revision_dias)))
      : 3
  const minPorRa =
    Number.isFinite(Number(ficha.configuracion.minimo_evidencias_por_ra)) &&
    Number(ficha.configuracion.minimo_evidencias_por_ra) >= 0
      ? Math.min(20, Math.floor(Number(ficha.configuracion.minimo_evidencias_por_ra)))
      : 1
  const corteDate = toDate(ficha.configuracion.fecha_corte_evidencias)
  const corteIso = corteDate ? corteDate.toISOString().slice(0, 10) : null

  const pendientesVencidas = pendientes.filter((p) => p.diasAbierta > slaDias)
  const pendientesAntesCorte = corteDate
    ? pendientes.filter((p) => {
        const f = toDate(p.fecha)
        return f ? f.getTime() <= corteDate.getTime() : false
      })
    : []

  const aprendicesGestion = ficha.estudiantes.filter((e) => e.rol === "aprendiz")
  const rasGestion = categoriasGestion.flatMap((cat) => {
    const competencia = ficha.competencias.find((c) => c.id === cat.competencia_id)
    return (competencia?.resultados_aprendizaje || []).map((ra) => ra.codigo)
  })
  const raUnicos = Array.from(new Set(rasGestion)).filter(Boolean)
  const coverageGaps: CoverageGap[] =
    minPorRa > 0
      ? aprendicesGestion.flatMap((ap) =>
          raUnicos
            .map((ra) => {
              const entregadas = evidenciaRows.filter(
                (ev) =>
                  !ev.es_material_apoyo &&
                  (ev.learnerId === ap.id ||
                    (!ev.learnerId &&
                      ev.autor.trim().toLowerCase() === ap.nombre.trim().toLowerCase())) &&
                  ev.resultado_aprendizaje === ra
              ).length
              const faltantes = Math.max(0, minPorRa - entregadas)
              if (faltantes <= 0) return null
              return {
                aprendizId: ap.id,
                aprendiz: ap.nombre,
                ra,
                entregadas,
                faltantes,
              }
            })
            .filter((item): item is CoverageGap => Boolean(item))
        )
      : []

  await recordPortfolioAudit({
    session: auth.session,
    action: "analytics_review_queue_view",
    detail: `ficha=${ficha.id}; pending=${pendientes.length}; overdue=${pendientesVencidas.length}`,
  })

  return NextResponse.json({
    ok: true,
    ficha: {
      id: ficha.id,
      codigo: ficha.configuracion.ficha,
      programa: ficha.configuracion.programa,
    },
    rules: {
      slaDias,
      minPorRa,
      fechaCorte: corteIso,
    },
    summary: {
      pendingTotal: pendientes.length,
      overdueTotal: pendientesVencidas.length,
      beforeCutoffTotal: pendientesAntesCorte.length,
      raCoverageGapsTotal: coverageGaps.length,
    },
    items: pendientes.sort((a, b) => b.diasAbierta - a.diasAbierta || a.autor.localeCompare(b.autor, "es")),
    coverageGaps: coverageGaps
      .sort((a, b) => b.faltantes - a.faltantes || a.aprendiz.localeCompare(b.aprendiz, "es"))
      .slice(0, 100),
  })
}
