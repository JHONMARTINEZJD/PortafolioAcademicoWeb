"use client"

import { useMemo } from "react"
import type { Ficha } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  Users,
  BookOpen,
  FolderOpen,
  FileClock,
  CircleCheck,
  CircleX,
  ArrowRight,
} from "lucide-react"

interface AdminOverviewDashboardProps {
  ficha: Ficha
  onOpenAdminPanel: () => void
  onSelectCategoria: (id: string | null) => void
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-CO")
}

function daysOpen(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 0
  const diff = Date.now() - parsed.getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

export function AdminOverviewDashboard({
  ficha,
  onOpenAdminPanel,
  onSelectCategoria,
}: AdminOverviewDashboardProps) {
  const aprendices = ficha.estudiantes.filter((e) => e.rol === "aprendiz")
  const instructores = ficha.estudiantes.filter((e) => e.rol === "instructor")
  const evidencias = ficha.categorias.flatMap((c) => c.evidencias)
  const evidenciasAprendices = evidencias.filter((e) => !e.es_material_apoyo)
  const pendientesRevision = evidenciasAprendices.filter((e) => e.estado === "enviada")
  const aprobadas = evidenciasAprendices.filter((e) => e.estado === "aprobada")
  const rechazadas = evidenciasAprendices.filter((e) => e.estado === "rechazada")
  const raTotal = ficha.competencias.reduce(
    (acc, comp) => acc + comp.resultados_aprendizaje.length,
    0
  )

  const topCategorias = useMemo(
    () =>
      [...ficha.categorias]
        .map((cat) => ({
          id: cat.id,
          nombre: cat.nombre,
          total: cat.evidencias.filter((e) => !e.es_material_apoyo).length,
        }))
        .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"))
        .slice(0, 5),
    [ficha.categorias]
  )

  const pendientesCriticos = useMemo(
    () =>
      [...pendientesRevision]
        .sort((a, b) => daysOpen(b.fecha) - daysOpen(a.fecha))
        .slice(0, 8),
    [pendientesRevision]
  )

  const modulos = [
    { key: "Asistencia", enabled: Boolean(ficha.configuracion.asistencia_habilitada) },
    { key: "Aseo", enabled: Boolean(ficha.configuracion.aseo_habilitado) },
    { key: "Alertas", enabled: Boolean(ficha.configuracion.alertas_habilitadas) },
    { key: "Cronograma", enabled: Boolean(ficha.configuracion.cronograma_habilitado) },
    { key: "Observador", enabled: Boolean(ficha.configuracion.observador_habilitado) },
  ]

  const kpis = [
    { label: "Aprendices", value: aprendices.length, icon: Users },
    { label: "Instructores", value: instructores.length, icon: ShieldCheck },
    { label: "Competencias", value: ficha.competencias.length, icon: BookOpen },
    { label: "Categorias", value: ficha.categorias.length, icon: FolderOpen },
    { label: "Pendientes", value: pendientesRevision.length, icon: FileClock },
    { label: "RA Definidos", value: raTotal, icon: BookOpen },
  ]

  return (
    <div className="space-y-4">
      <Card className="border-border bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <CardTitle className="text-xl">Dashboard Administrativo</CardTitle>
          <CardDescription>
            Control ejecutivo de la ficha {ficha.configuracion.ficha || "-"} y estado operativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={onOpenAdminPanel} className="gap-1.5">
            Ir a Panel de Gestion
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onSelectCategoria(null)}>
            Reiniciar filtros
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de Calidad de Evidencias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded border p-2 text-sm">
              <span>Aprobadas</span>
              <Badge variant="secondary" className="gap-1">
                <CircleCheck className="h-3.5 w-3.5" />
                {aprobadas.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded border p-2 text-sm">
              <span>Rechazadas</span>
              <Badge variant="destructive" className="gap-1">
                <CircleX className="h-3.5 w-3.5" />
                {rechazadas.length}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded border p-2 text-sm">
              <span>Pendientes de revision</span>
              <Badge variant="outline" className="gap-1">
                <FileClock className="h-3.5 w-3.5" />
                {pendientesRevision.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modulos Activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {modulos.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{mod.key}</span>
                <Badge variant={mod.enabled ? "secondary" : "outline"}>
                  {mod.enabled ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categorias con mas carga</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topCategorias.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin categorias con evidencias.</p>
            )}
            {topCategorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategoria(cat.id)}
                className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-muted/40"
              >
                <span>{cat.nombre}</span>
                <Badge variant="outline">{cat.total}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendientes Criticos</CardTitle>
            <CardDescription>Ordenados por antiguedad de apertura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendientesCriticos.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay pendientes de revision.</p>
            )}
            {pendientesCriticos.map((ev) => (
              <div key={ev.id} className="rounded border px-3 py-2 text-xs">
                <p className="font-medium text-foreground">{ev.titulo}</p>
                <p className="text-muted-foreground">
                  {ev.autor} · {ev.resultado_aprendizaje}
                </p>
                <p className="text-muted-foreground">
                  {formatDate(ev.fecha)} · {daysOpen(ev.fecha)} dias abierta
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

