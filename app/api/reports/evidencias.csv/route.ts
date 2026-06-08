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
      "programa",
      "categoria",
      "evidencia_id",
      "titulo",
      "tipo",
      "autor",
      "estudiante_id",
      "competencia_id",
      "resultado_aprendizaje",
      "estado",
      "fecha",
      "es_material_apoyo",
      "es_personal",
    ],
  ]

  for (const categoria of ficha.categorias) {
    for (const evidencia of categoria.evidencias) {
      rows.push([
        ficha.id,
        ficha.configuracion.programa,
        categoria.nombre,
        evidencia.id,
        evidencia.titulo,
        evidencia.tipo,
        evidencia.autor,
        evidencia.estudiante_id || "",
        evidencia.competencia_id || "",
        evidencia.resultado_aprendizaje,
        evidencia.estado || "enviada",
        evidencia.fecha,
        evidencia.es_material_apoyo ? "si" : "no",
        evidencia.es_personal ? "si" : "no",
      ])
    }
  }

  await recordPortfolioAudit({
    session: auth.session,
    action: "report_export_evidencias_csv",
    detail: `ficha=${ficha.id}; rows=${rows.length - 1}`,
  })

  const csv = buildCsv(rows)
  const filename = `reporte-evidencias-${ficha.configuracion.ficha || ficha.id}.csv`
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
