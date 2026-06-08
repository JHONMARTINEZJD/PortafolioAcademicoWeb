import { NextResponse } from "next/server"
import { requireSession } from "@/lib/server/request-auth"
import { getLatestPortfolioData } from "@/lib/server/portfolio-snapshot"
import { recordPortfolioAudit } from "@/lib/server/portfolio-audit"

export const runtime = "nodejs"

function csvCell(value: unknown) {
  const text = String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/"/g, '""')
  return `"${text}"`
}

function buildCsv(rows: string[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n")
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

  const rows: string[][] = [
    [
      "ficha_id",
      "competencia_id",
      "competencia_codigo",
      "competencia_nombre",
      "ra_id",
      "ra_codigo",
      "ra_descripcion",
      "evidencias_totales",
      "evidencias_aprobadas",
      "evidencias_rechazadas",
      "evidencias_pendientes",
      "avance_porcentaje",
    ],
  ]

  for (const competencia of ficha.competencias) {
    for (const ra of competencia.resultados_aprendizaje) {
      const raPrefix = `${ra.codigo} -`
      const evidencias = ficha.categorias
        .filter((cat) => !cat.competencia_id || cat.competencia_id === competencia.id)
        .flatMap((cat) => cat.evidencias)
        .filter((ev) => ev.competencia_id === competencia.id || ev.resultado_aprendizaje.startsWith(raPrefix))
        .filter((ev) => ev.resultado_aprendizaje.includes(ra.codigo))

      const total = evidencias.length
      const aprobadas = evidencias.filter((e) => e.estado === "aprobada").length
      const rechazadas = evidencias.filter((e) => e.estado === "rechazada").length
      const pendientes = total - aprobadas - rechazadas
      const avance = total > 0 ? Math.round((aprobadas / total) * 100) : 0

      rows.push([
        ficha.id,
        competencia.id,
        competencia.codigo,
        competencia.nombre,
        ra.id,
        ra.codigo,
        ra.descripcion,
        String(total),
        String(aprobadas),
        String(rechazadas),
        String(Math.max(0, pendientes)),
        String(avance),
      ])
    }
  }

  await recordPortfolioAudit({
    session: auth.session,
    action: "report_export_ra_csv",
    detail: `ficha=${ficha.id}; rows=${rows.length - 1}`,
  })

  const csv = buildCsv(rows)
  const filename = `reporte-ra-${ficha.configuracion.ficha || ficha.id}.csv`
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
