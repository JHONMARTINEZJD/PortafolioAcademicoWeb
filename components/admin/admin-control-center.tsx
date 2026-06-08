"use client"

import { useMemo, useState } from "react"
import type { Ficha } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type EndpointCheck = {
  id: string
  label: string
  run: () => Promise<number>
}

export function AdminControlCenter({ ficha }: { ficha: Ficha }) {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"todos" | "aprendiz" | "instructor" | "admin">("todos")
  const [checkRunning, setCheckRunning] = useState(false)
  const [checkResults, setCheckResults] = useState<Record<string, number>>({})

  const estudiantes = ficha.estudiantes
  const aprendices = estudiantes.filter((e) => e.rol === "aprendiz")
  const instructores = estudiantes.filter((e) => e.rol === "instructor")
  const competenciasSinInstructor = ficha.competencias.filter((c) => !c.instructor_id).length
  const categoriasSinCompetencia = ficha.categorias.filter((c) => !c.competencia_id).length

  const estudiantesFiltrados = useMemo(() => {
    return estudiantes.filter((est) => {
      const matchRole = roleFilter === "todos" ? true : est.rol === roleFilter
      const text = `${est.nombre} ${est.correo} ${est.documento} ${est.usuario || ""}`.toLowerCase()
      const matchQuery = query.trim() ? text.includes(query.trim().toLowerCase()) : true
      return matchRole && matchQuery
    })
  }, [estudiantes, roleFilter, query])

  const endpoints: EndpointCheck[] = [
    {
      id: "auth_session",
      label: "Sesion activa",
      run: async () => (await fetch("/api/auth/session")).status,
    },
    {
      id: "portfolio_get",
      label: "Snapshot hibrido",
      run: async () => (await fetch("/api/portfolio/hybrid")).status,
    },
    {
      id: "portfolio_test",
      label: "PostgreSQL testOnly",
      run: async () =>
        (
          await fetch("/api/portfolio/hybrid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ testOnly: true }),
          })
        ).status,
    },
    {
      id: "audit_recent",
      label: "Auditoria reciente",
      run: async () => (await fetch("/api/audit/recent?limit=5")).status,
    },
    {
      id: "risk",
      label: "Analitica riesgo",
      run: async () =>
        (await fetch(`/api/analytics/risk?fichaId=${encodeURIComponent(ficha.id)}`)).status,
    },
    {
      id: "review_queue",
      label: "Cola revision",
      run: async () =>
        (await fetch(`/api/analytics/review-queue?fichaId=${encodeURIComponent(ficha.id)}`)).status,
    },
    {
      id: "admin_users",
      label: "Usuarios app",
      run: async () => (await fetch("/api/admin/users")).status,
    },
    {
      id: "reports_evidencias",
      label: "Reporte evidencias",
      run: async () =>
        (await fetch(`/api/reports/evidencias.csv?fichaId=${encodeURIComponent(ficha.id)}`)).status,
    },
    {
      id: "reports_ra",
      label: "Reporte RA",
      run: async () =>
        (await fetch(`/api/reports/ra.csv?fichaId=${encodeURIComponent(ficha.id)}`)).status,
    },
  ]

  const runChecks = async () => {
    setCheckRunning(true)
    const next: Record<string, number> = {}
    for (const endpoint of endpoints) {
      try {
        next[endpoint.id] = await endpoint.run()
      } catch {
        next[endpoint.id] = 0
      }
    }
    setCheckResults(next)
    setCheckRunning(false)
    const failing = Object.values(next).filter((s) => s < 200 || s >= 300).length
    if (failing === 0) {
      toast.success("Todos los endpoints administrativos respondieron OK")
    } else {
      toast.error(`Diagnostico con ${failing} endpoint(s) en error`)
    }
  }

  const checkSummary = useMemo(() => {
    const statuses = Object.values(checkResults)
    if (!statuses.length) return { ok: 0, fail: 0 }
    const ok = statuses.filter((s) => s >= 200 && s < 300).length
    return { ok, fail: statuses.length - ok }
  }, [checkResults])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Centro de Control Administrativo</CardTitle>
          <CardDescription>
            Gestion integral de ficha, estructura academica y salud operativa del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Aprendices</p>
            <p className="text-xl font-semibold">{aprendices.length}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Instructores</p>
            <p className="text-xl font-semibold">{instructores.length}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Comp. sin instructor</p>
            <p className="text-xl font-semibold">{competenciasSinInstructor}</p>
          </div>
          <div className="rounded border p-3">
            <p className="text-xs text-muted-foreground">Categorias sin competencia</p>
            <p className="text-xl font-semibold">{categoriasSinCompetencia}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filtro rapido de usuarios</CardTitle>
          <CardDescription>
            Verifica coherencia de usuarios cargados antes de editar desde el modulo de estudiantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Busqueda</Label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, correo, documento o usuario"
              />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprendiz">Aprendiz</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="h-9">
                Coincidencias: {estudiantesFiltrados.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostico de Endpoints</CardTitle>
          <CardDescription>
            Prueba de conectividad y respuesta para endpoints criticos administrativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void runChecks()} disabled={checkRunning}>
              {checkRunning ? "Probando..." : "Probar endpoints"}
            </Button>
            <Badge variant="outline">OK: {checkSummary.ok}</Badge>
            <Badge variant={checkSummary.fail > 0 ? "destructive" : "secondary"}>
              Fallos: {checkSummary.fail}
            </Badge>
          </div>
          <div className="space-y-1">
            {endpoints.map((endpoint) => {
              const status = checkResults[endpoint.id]
              const ok = typeof status === "number" && status >= 200 && status < 300
              return (
                <div key={endpoint.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span>{endpoint.label}</span>
                  <Badge variant={status == null ? "outline" : ok ? "secondary" : "destructive"}>
                    {status == null ? "Pendiente" : status === 0 ? "Error red" : `HTTP ${status}`}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

