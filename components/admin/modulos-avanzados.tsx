"use client"

import { useEffect, useMemo, useState } from "react"
import type { EstadoEvidencia, Ficha, Estudiante, Evidencia } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface ModulosAvanzadosProps {
  ficha: Ficha
  userId: string | null
  isAdmin: boolean
  isInstructor: boolean
  onUpsertEvaluacion: (payload: {
    evidencia_id: string
    instructor_id: string
    criterios: Array<{ criterio: string; puntaje: number; maximo: number }>
    observaciones: string
    fecha: string
  }) => void
  onDeleteEvaluacion: (id: string) => void
  onUpsertPlan: (payload: {
    aprendiz_id: string
    evidencia_id?: string
    descripcion: string
    fecha_compromiso: string
    estado: "abierto" | "en_proceso" | "cerrado"
  }) => void
  onDeletePlan: (id: string) => void
  onUpsertAlerta: (payload: {
    tipo: "asistencia" | "evidencia" | "riesgo" | "general"
    titulo: string
    detalle: string
    fecha: string
    rol_destino: "admin" | "instructor" | "aprendiz" | "todos"
  }) => void
  onDeleteAlerta: (id: string) => void
  onUpsertCronograma: (payload: {
    fecha: string
    titulo: string
    descripcion?: string
    competencia_id?: string
  }) => void
  onDeleteCronograma: (id: string) => void
  onUpsertActa: (payload: {
    fecha: string
    tema: string
    compromisos: string
    responsable: string
  }) => void
  onDeleteActa: (id: string) => void
  onUpsertPlantilla: (payload: {
    nombre: string
    tipo: "retroalimentacion" | "observacion" | "comunicado"
    contenido: string
  }) => void
  onDeletePlantilla: (id: string) => void
  onCrearBackup: (nombre: string) => void
  onRestaurarBackup: (id: string) => void
  onEliminarBackup: (id: string) => void
  onActualizarEstadoEvidencia: (
    categoriaId: string,
    evidenciaId: string,
    estado: EstadoEvidencia,
    retroalimentacion?: string
  ) => void
}

export function ModulosAvanzados({
  ficha,
  userId,
  isAdmin,
  isInstructor,
  onUpsertEvaluacion,
  onDeleteEvaluacion,
  onUpsertPlan,
  onDeletePlan,
  onUpsertAlerta,
  onDeleteAlerta,
  onUpsertCronograma,
  onDeleteCronograma,
  onUpsertActa,
  onDeleteActa,
  onUpsertPlantilla,
  onDeletePlantilla,
  onCrearBackup,
  onRestaurarBackup,
  onEliminarBackup,
  onActualizarEstadoEvidencia,
}: ModulosAvanzadosProps) {
  const instructores = ficha.estudiantes.filter((e) => e.rol === "instructor")
  const aprendices = ficha.estudiantes.filter((e) => e.rol === "aprendiz")
  const instructorCompetenciaIds = useMemo(() => {
    if (!isInstructor || !userId) return []
    return ficha.competencias
      .filter((c) => c.instructor_id === userId)
      .map((c) => c.id)
  }, [ficha.competencias, isInstructor, userId])
  const categoriasGestion = useMemo(() => {
    if (isAdmin) return ficha.categorias
    const allowed = new Set(instructorCompetenciaIds)
    return ficha.categorias.filter((cat) => cat.competencia_id && allowed.has(cat.competencia_id))
  }, [ficha.categorias, instructorCompetenciaIds, isAdmin])
  const evidencias = useMemo(
    () =>
      categoriasGestion.flatMap((cat) =>
        cat.evidencias.map((ev) => ({ ...ev, categoria_id: cat.id, categoria: cat.nombre }))
      ),
    [categoriasGestion]
  )
  const aprendicesGestion = useMemo(() => {
    if (isAdmin) return aprendices
    const evidenciasSet = new Set(
      evidencias
        .filter((ev) => !!ev.estudiante_id)
        .map((ev) => ev.estudiante_id as string)
    )
    return aprendices.filter((a) => evidenciasSet.has(a.id))
  }, [aprendices, evidencias, isAdmin])

  const [evId, setEvId] = useState(evidencias[0]?.id || "")
  const [evObs, setEvObs] = useState("")
  const [evScore, setEvScore] = useState(5)
  const [planAprendiz, setPlanAprendiz] = useState(aprendicesGestion[0]?.id || "")
  const [planDesc, setPlanDesc] = useState("")
  const [planFecha, setPlanFecha] = useState(new Date().toISOString().slice(0, 10))
  const [alertaTitulo, setAlertaTitulo] = useState("")
  const [alertaDetalle, setAlertaDetalle] = useState("")
  const [alertaRol, setAlertaRol] = useState<"admin" | "instructor" | "aprendiz" | "todos">(
    "todos"
  )
  const [cronogramaFecha, setCronogramaFecha] = useState(new Date().toISOString().slice(0, 10))
  const [cronogramaTitulo, setCronogramaTitulo] = useState("")
  const [cronogramaDesc, setCronogramaDesc] = useState("")
  const [actaTema, setActaTema] = useState("")
  const [actaCompromisos, setActaCompromisos] = useState("")
  const [plantillaNombre, setPlantillaNombre] = useState("")
  const [plantillaContenido, setPlantillaContenido] = useState("")
  const [backupNombre, setBackupNombre] = useState("")
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditEvents, setAuditEvents] = useState<
    Array<{
      id: string
      at: string
      actor_username: string
      actor_role: string
      action: string
      detail: string | null
    }>
  >([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [appUsers, setAppUsers] = useState<
    Array<{
      id: string
      username: string
      role: "admin" | "instructor" | "aprendiz"
      displayName: string
      linkedEstudianteId: string | null
      mustChangePassword: boolean
      isActive: boolean
    }>
  >([])
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({})
  const [riskLoading, setRiskLoading] = useState(false)
  const [riskItems, setRiskItems] = useState<
    Array<{
      aprendizId: string
      nombre: string
      asistenciaPct: number
      evidencias: number
      aprobadas: number
      rechazadas: number
      pendientes: number
      riesgo: "alto" | "medio" | "bajo"
    }>
  >([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewQueue, setReviewQueue] = useState<{
    rules: {
      slaDias: number
      minPorRa: number
      fechaCorte: string | null
    }
    summary: {
      pendingTotal: number
      overdueTotal: number
      beforeCutoffTotal: number
      raCoverageGapsTotal: number
    }
    items: Array<{
      id: string
      titulo: string
      autor: string
      ra: string
      fecha: string
      diasAbierta: number
    }>
    coverageGaps: Array<{
      aprendizId: string
      aprendiz: string
      ra: string
      entregadas: number
      faltantes: number
    }>
  } | null>(null)
  const [revisionEstado, setRevisionEstado] = useState<EstadoEvidencia>("revisada")
  const [revisionRetro, setRevisionRetro] = useState("")

  const asistenciaPorAprendiz = useMemo(() => {
    const totalRegistros = ficha.asistencias.length || 1
    return aprendicesGestion
      .map((ap) => {
        const presentes = ficha.asistencias.filter((a) => a.presentes.includes(ap.id)).length
        return {
          id: ap.id,
          nombre: ap.nombre,
          porcentaje: Math.round((presentes / totalRegistros) * 100),
          presentes,
        }
      })
      .sort((a, b) => a.porcentaje - b.porcentaje)
  }, [aprendicesGestion, ficha.asistencias])

  const instructorActual = instructores.find((i) => i.id === userId)
  const canUseInstructorModules = isAdmin || isInstructor
  const canDeleteGlobal = isAdmin

  const downloadReport = async (path: string, filename: string) => {
    try {
      const response = await fetch(path)
      if (!response.ok) {
        toast.error("No se pudo generar el reporte")
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Reporte descargado")
    } catch {
      toast.error("Error descargando reporte")
    }
  }

  const loadAudit = async () => {
    setAuditLoading(true)
    try {
      const response = await fetch("/api/audit/recent?limit=40")
      if (!response.ok) {
        setAuditEvents([])
        return
      }
      const body = await response.json()
      setAuditEvents(Array.isArray(body?.events) ? body.events : [])
    } catch {
      setAuditEvents([])
    } finally {
      setAuditLoading(false)
    }
  }

  const loadAccounts = async () => {
    if (!isAdmin) return
    setAccountsLoading(true)
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        setAppUsers([])
        return
      }
      const body = await response.json()
      setAppUsers(Array.isArray(body?.users) ? body.users : [])
    } catch {
      setAppUsers([])
    } finally {
      setAccountsLoading(false)
    }
  }

  const syncAccounts = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_from_ficha" }),
      })
      if (!response.ok) {
        toast.error("No se pudieron sincronizar cuentas")
        return
      }
      const body = await response.json()
      toast.success(
        `Cuentas sincronizadas: escaneadas ${body?.result?.scanned || 0}, actualizadas ${body?.result?.createdOrUpdated || 0}`
      )
      await loadAccounts()
      await loadAudit()
    } catch {
      toast.error("Error sincronizando cuentas")
    }
  }

  const resetUserPassword = async (userId: string) => {
    const newPassword = (tempPasswords[userId] || "").trim()
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres")
      return
    }
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          newPassword,
          mustChangePassword: true,
        }),
      })
      if (!response.ok) {
        toast.error("No se pudo resetear la contraseña")
        return
      }
      setTempPasswords((prev) => ({ ...prev, [userId]: "" }))
      toast.success("Contraseña reseteada")
      await loadAccounts()
      await loadAudit()
    } catch {
      toast.error("Error al resetear contraseña")
    }
  }

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_active",
          isActive,
        }),
      })
      if (!response.ok) {
        toast.error("No se pudo actualizar el estado de la cuenta")
        return
      }
      toast.success("Estado de cuenta actualizado")
      await loadAccounts()
      await loadAudit()
    } catch {
      toast.error("Error actualizando cuenta")
    }
  }

  const loadRisk = async () => {
    setRiskLoading(true)
    try {
      const response = await fetch(
        `/api/analytics/risk?fichaId=${encodeURIComponent(ficha.id)}`
      )
      if (!response.ok) {
        setRiskItems([])
        return
      }
      const body = await response.json()
      setRiskItems(Array.isArray(body?.items) ? body.items : [])
    } catch {
      setRiskItems([])
    } finally {
      setRiskLoading(false)
    }
  }

  const loadReviewQueue = async () => {
    setReviewLoading(true)
    try {
      const response = await fetch(
        `/api/analytics/review-queue?fichaId=${encodeURIComponent(ficha.id)}`
      )
      if (!response.ok) {
        setReviewQueue(null)
        return
      }
      const body = await response.json()
      setReviewQueue({
        rules: body?.rules || { slaDias: 3, minPorRa: 1, fechaCorte: null },
        summary: body?.summary || {
          pendingTotal: 0,
          overdueTotal: 0,
          beforeCutoffTotal: 0,
          raCoverageGapsTotal: 0,
        },
        items: Array.isArray(body?.items) ? body.items : [],
        coverageGaps: Array.isArray(body?.coverageGaps) ? body.coverageGaps : [],
      })
    } catch {
      setReviewQueue(null)
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    void loadAudit()
    void loadAccounts()
    void loadRisk()
    void loadReviewQueue()
  }, [])

  useEffect(() => {
    if (!evidencias.length) {
      setEvId("")
      setPlanAprendiz("")
      return
    }
    if (!evidencias.some((e) => e.id === evId)) {
      setEvId(evidencias[0]?.id || "")
    }
    if (planAprendiz && !aprendicesGestion.some((a) => a.id === planAprendiz)) {
      setPlanAprendiz(aprendicesGestion[0]?.id || "")
    }
  }, [evidencias, evId, planAprendiz, aprendicesGestion])

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4">
        {isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Evaluacion por Rubrica</CardTitle>
            <CardDescription>Califica evidencias por criterio y deja observaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Evidencia</Label>
                <Select value={evId} onValueChange={setEvId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {evidencias.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Puntaje (0-5)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={evScore}
                  onChange={(e) => setEvScore(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={!canUseInstructorModules || !evId}
                  onClick={() => {
                    const instructor = isAdmin ? instructores[0]?.id : instructorActual?.id
                    if (!instructor) return
                    onUpsertEvaluacion({
                      evidencia_id: evId,
                      instructor_id: instructor,
                      criterios: [{ criterio: "Calidad general", puntaje: evScore, maximo: 5 }],
                      observaciones: evObs,
                      fecha: new Date().toISOString().slice(0, 10),
                    })
                    setEvObs("")
                    toast.success("Evaluacion registrada")
                  }}
                >
                  Guardar evaluacion
                </Button>
              </div>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea value={evObs} onChange={(e) => setEvObs(e.target.value)} />
            </div>
            <div className="space-y-2">
              {(ficha.evaluaciones_rubrica || []).map((ev) => (
                <div key={ev.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{ev.fecha} · {ev.observaciones || "Sin observacion"}</span>
                  {(isAdmin || ev.instructor_id === userId) && (
                    <Button size="sm" variant="outline" onClick={() => onDeleteEvaluacion(ev.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Revision de Evidencias</CardTitle>
            <CardDescription>
              Cambia estado y retroalimentacion de evidencias bajo tu gestion.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Evidencia</Label>
              <Select value={evId} onValueChange={setEvId}>
                <SelectTrigger><SelectValue placeholder="Selecciona evidencia" /></SelectTrigger>
                <SelectContent>
                  {evidencias.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.categoria} · {ev.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={revisionEstado} onValueChange={(v) => setRevisionEstado(v as EstadoEvidencia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="revisada">revisada</SelectItem>
                  <SelectItem value="aprobada">aprobada</SelectItem>
                  <SelectItem value="rechazada">rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!evId || !canUseInstructorModules}
                onClick={() => {
                  const selected = evidencias.find((e) => e.id === evId)
                  if (!selected) return
                  onActualizarEstadoEvidencia(
                    selected.categoria_id,
                    selected.id,
                    revisionEstado,
                    revisionRetro
                  )
                  setRevisionRetro("")
                  toast.success("Estado de evidencia actualizado")
                }}
              >
                Guardar revision
              </Button>
            </div>
            <div className="md:col-span-4">
              <Label>Retroalimentacion</Label>
              <Textarea
                value={revisionRetro}
                onChange={(e) => setRevisionRetro(e.target.value)}
                placeholder="Comentarios de revision para el aprendiz"
              />
            </div>
          </CardContent>
        </Card>
        )}

        {isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Bandeja de Revision Operativa</CardTitle>
            <CardDescription>
              Controla pendientes por SLA, fecha de corte y cobertura minima por RA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Pendientes: {reviewQueue?.summary.pendingTotal ?? 0}
              </Badge>
              <Badge variant="destructive">
                Vencidas SLA: {reviewQueue?.summary.overdueTotal ?? 0}
              </Badge>
              <Badge variant="secondary">
                Antes de corte: {reviewQueue?.summary.beforeCutoffTotal ?? 0}
              </Badge>
              <Badge variant="outline">
                Brechas RA: {reviewQueue?.summary.raCoverageGapsTotal ?? 0}
              </Badge>
              <Button variant="outline" onClick={() => void loadReviewQueue()} disabled={reviewLoading}>
                {reviewLoading ? "Actualizando..." : "Actualizar bandeja"}
              </Button>
              <Button
                variant="outline"
                disabled={!reviewQueue || !canUseInstructorModules}
                onClick={() => {
                  if (!reviewQueue) return
                  const overdue = reviewQueue.summary.overdueTotal
                  const gaps = reviewQueue.summary.raCoverageGapsTotal
                  if (overdue === 0 && gaps === 0) {
                    toast.success("No hay atrasos ni brechas para alertar")
                    return
                  }
                  onUpsertAlerta({
                    tipo: "evidencia",
                    titulo: "Alerta automatica de revision academica",
                    detalle: `Pendientes SLA: ${overdue}. Brechas RA: ${gaps}. Corte: ${
                      reviewQueue.rules.fechaCorte || "sin fecha de corte"
                    }.`,
                    fecha: new Date().toISOString().slice(0, 10),
                    rol_destino: "instructor",
                  })
                  toast.success("Alerta operativa generada")
                }}
              >
                Generar alerta automatica
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              SLA configurado: {reviewQueue?.rules.slaDias ?? 3} dias. Minimo por RA:{" "}
              {reviewQueue?.rules.minPorRa ?? 1}. Fecha corte:{" "}
              {reviewQueue?.rules.fechaCorte || "Sin definir"}.
            </p>
            <div className="rounded border p-3">
              <p className="mb-2 text-sm font-medium">Pendientes prioritarios</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {!reviewQueue || reviewQueue.items.length === 0 ? (
                  <p>Sin pendientes en estado enviada.</p>
                ) : (
                  reviewQueue.items.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded border px-2 py-1">
                      {item.autor} · {item.ra} · {item.titulo} · {item.diasAbierta} dias
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded border p-3">
              <p className="mb-2 text-sm font-medium">Brechas de cobertura RA</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {!reviewQueue || reviewQueue.coverageGaps.length === 0 ? (
                  <p>Sin brechas segun el minimo configurado.</p>
                ) : (
                  reviewQueue.coverageGaps.slice(0, 8).map((gap) => (
                    <div key={`${gap.aprendizId}-${gap.ra}`} className="rounded border px-2 py-1">
                      {gap.aprendiz} · {gap.ra} · faltan {gap.faltantes} (tiene {gap.entregadas})
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {isInstructor && (
        <Card>
          <CardHeader>
            <CardTitle>Plan de Mejora</CardTitle>
            <CardDescription>Seguimiento de acciones correctivas por aprendiz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Aprendiz</Label>
                <Select value={planAprendiz} onValueChange={setPlanAprendiz}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {aprendicesGestion.map((ap) => (
                      <SelectItem key={ap.id} value={ap.id}>{ap.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha compromiso</Label>
                <Input type="date" value={planFecha} onChange={(e) => setPlanFecha(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={!canUseInstructorModules || !planAprendiz || !planDesc.trim()}
                  onClick={() => {
                    onUpsertPlan({
                      aprendiz_id: planAprendiz,
                      descripcion: planDesc,
                      fecha_compromiso: planFecha,
                      estado: "abierto",
                    })
                    setPlanDesc("")
                    toast.success("Plan de mejora creado")
                  }}
                >
                  Crear plan
                </Button>
              </div>
            </div>
            <Textarea value={planDesc} onChange={(e) => setPlanDesc(e.target.value)} placeholder="Acciones de mejora..." />
            <div className="space-y-2">
              {(ficha.planes_mejora || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{p.descripcion} · {p.estado}</span>
                  {canDeleteGlobal && (
                    <Button size="sm" variant="outline" onClick={() => onDeletePlan(p.id)}>
                      Eliminar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Alertas y Cronograma</CardTitle>
            <CardDescription>Mensajes internos y agenda academica de la ficha.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded border p-3">
              <Label>Titulo alerta</Label>
              <Input value={alertaTitulo} onChange={(e) => setAlertaTitulo(e.target.value)} />
              <Label>Detalle</Label>
              <Textarea value={alertaDetalle} onChange={(e) => setAlertaDetalle(e.target.value)} />
              <Label>Destino</Label>
              <Select value={alertaRol} onValueChange={(v: any) => setAlertaRol(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="aprendiz">Aprendiz</SelectItem>
                </SelectContent>
              </Select>
              <Button
                disabled={!isAdmin}
                onClick={() => {
                  if (!alertaTitulo.trim()) return
                  onUpsertAlerta({
                    tipo: "general",
                    titulo: alertaTitulo,
                    detalle: alertaDetalle,
                    fecha: new Date().toISOString().slice(0, 10),
                    rol_destino: alertaRol,
                  })
                  setAlertaTitulo("")
                  setAlertaDetalle("")
                }}
              >
                Crear alerta
              </Button>
              <div className="space-y-1">
                {(ficha.alertas || []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span>{a.titulo}</span>
                    {canDeleteGlobal && (
                      <Button size="sm" variant="ghost" onClick={() => onDeleteAlerta(a.id)}>
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 rounded border p-3">
              <Label>Fecha evento</Label>
              <Input type="date" value={cronogramaFecha} onChange={(e) => setCronogramaFecha(e.target.value)} />
              <Label>Titulo</Label>
              <Input value={cronogramaTitulo} onChange={(e) => setCronogramaTitulo(e.target.value)} />
              <Label>Descripcion</Label>
              <Textarea value={cronogramaDesc} onChange={(e) => setCronogramaDesc(e.target.value)} />
              <Button
                disabled={!isAdmin}
                onClick={() => {
                  if (!cronogramaTitulo.trim()) return
                  onUpsertCronograma({
                    fecha: cronogramaFecha,
                    titulo: cronogramaTitulo,
                    descripcion: cronogramaDesc,
                  })
                  setCronogramaTitulo("")
                  setCronogramaDesc("")
                }}
              >
                Agendar
              </Button>
              <div className="space-y-1">
                {(ficha.cronograma || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.fecha} · {c.titulo}</span>
                    {canDeleteGlobal && (
                      <Button size="sm" variant="ghost" onClick={() => onDeleteCronograma(c.id)}>
                        Quitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actas y Plantillas</CardTitle>
            <CardDescription>Documenta compromisos y reutiliza textos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded border p-3">
              <Label>Tema acta</Label>
              <Input value={actaTema} onChange={(e) => setActaTema(e.target.value)} />
              <Label>Compromisos</Label>
              <Textarea value={actaCompromisos} onChange={(e) => setActaCompromisos(e.target.value)} />
              <Button
                disabled={!isAdmin}
                onClick={() => {
                  if (!actaTema.trim()) return
                  onUpsertActa({
                    fecha: new Date().toISOString().slice(0, 10),
                    tema: actaTema,
                    compromisos: actaCompromisos,
                    responsable: "Sistema",
                  })
                  setActaTema("")
                  setActaCompromisos("")
                }}
              >
                Guardar acta
              </Button>
              {(ficha.actas || []).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>{a.fecha} · {a.tema}</span>
                  {canDeleteGlobal && (
                    <Button size="sm" variant="ghost" onClick={() => onDeleteActa(a.id)}>
                      Quitar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2 rounded border p-3">
              <Label>Nombre plantilla</Label>
              <Input value={plantillaNombre} onChange={(e) => setPlantillaNombre(e.target.value)} />
              <Label>Contenido</Label>
              <Textarea value={plantillaContenido} onChange={(e) => setPlantillaContenido(e.target.value)} />
              <Button
                disabled={!isAdmin}
                onClick={() => {
                  if (!plantillaNombre.trim()) return
                  onUpsertPlantilla({
                    nombre: plantillaNombre,
                    tipo: "retroalimentacion",
                    contenido: plantillaContenido,
                  })
                  setPlantillaNombre("")
                  setPlantillaContenido("")
                }}
              >
                Guardar plantilla
              </Button>
              {(ficha.plantillas || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span>{p.nombre}</span>
                  {canDeleteGlobal && (
                    <Button size="sm" variant="ghost" onClick={() => onDeletePlantilla(p.id)}>
                      Quitar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observador y Productividad</CardTitle>
            <CardDescription>Riesgo por asistencia y carga de revision del instructor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Evidencias: {evidencias.length}</Badge>
              <Badge variant="outline">Rubricas: {(ficha.evaluaciones_rubrica || []).length}</Badge>
              <Badge variant="outline">Planes: {(ficha.planes_mejora || []).length}</Badge>
            </div>
            <div className="space-y-2">
              {asistenciaPorAprendiz.map((r) => (
                <div key={r.id} className="rounded border p-2 text-sm">
                  {r.nombre}: {r.porcentaje}% asistencia ({r.presentes} registros)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Semaforo de Riesgo por Aprendiz</CardTitle>
            <CardDescription>
              Detecta tempranamente riesgo academico combinando asistencia y avance de evidencias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive">
                Alto: {riskItems.filter((r) => r.riesgo === "alto").length}
              </Badge>
              <Badge variant="secondary">
                Medio: {riskItems.filter((r) => r.riesgo === "medio").length}
              </Badge>
              <Badge variant="outline">
                Bajo: {riskItems.filter((r) => r.riesgo === "bajo").length}
              </Badge>
              <Button variant="outline" onClick={() => void loadRisk()} disabled={riskLoading}>
                {riskLoading ? "Actualizando..." : "Actualizar semaforo"}
              </Button>
            </div>
            <div className="space-y-2">
              {riskItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin datos de riesgo disponibles.
                </p>
              )}
              {riskItems.map((r) => (
                <div key={r.aprendizId} className="rounded border p-2 text-sm">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-medium">{r.nombre}</span>
                    <Badge
                      variant={
                        r.riesgo === "alto"
                          ? "destructive"
                          : r.riesgo === "medio"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {r.riesgo.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Asistencia: {r.asistenciaPct}% · Evidencias: {r.evidencias} ·
                    Aprobadas: {r.aprobadas} · Rechazadas: {r.rechazadas} · Pendientes: {r.pendientes}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Cuentas de acceso</CardTitle>
            <CardDescription>
              Administra usuarios de login en base de datos y sincroniza desde la ficha actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isAdmin ? (
              <p className="text-sm text-muted-foreground">
                Solo administradores pueden gestionar cuentas.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void syncAccounts()}>
                    Sincronizar desde ficha
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void loadAccounts()}
                    disabled={accountsLoading}
                  >
                    {accountsLoading ? "Actualizando..." : "Actualizar cuentas"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {appUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin cuentas en base de datos.</p>
                  )}
                  {appUsers.map((u) => (
                    <div key={u.id} className="rounded border p-3 text-sm">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{u.role}</Badge>
                        <span className="font-medium">{u.username}</span>
                        <span className="text-muted-foreground">({u.displayName})</span>
                        {!u.isActive && <Badge variant="destructive">Inactiva</Badge>}
                        {u.mustChangePassword && <Badge variant="secondary">Cambio obligado</Badge>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                        <Input
                          placeholder="Nueva contraseña temporal"
                          type="password"
                          value={tempPasswords[u.id] || ""}
                          onChange={(e) =>
                            setTempPasswords((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                        />
                        <Button variant="outline" onClick={() => void resetUserPassword(u.id)}>
                          Reset password
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => void toggleUserActive(u.id, !u.isActive)}
                          disabled={u.role === "admin" && u.isActive}
                        >
                          {u.isActive ? "Desactivar" : "Activar"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Reportes y Auditoria</CardTitle>
            <CardDescription>
              Exporta consolidados en CSV y revisa trazabilidad de acciones recientes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  downloadReport(
                    `/api/reports/evidencias.csv?fichaId=${encodeURIComponent(ficha.id)}`,
                    `reporte-evidencias-${ficha.configuracion.ficha || ficha.id}.csv`
                  )
                }
              >
                Descargar evidencias CSV
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  downloadReport(
                    `/api/reports/ra.csv?fichaId=${encodeURIComponent(ficha.id)}`,
                    `reporte-ra-${ficha.configuracion.ficha || ficha.id}.csv`
                  )
                }
              >
                Descargar RA CSV
              </Button>
              <Button variant="outline" onClick={() => void loadAudit()} disabled={auditLoading}>
                {auditLoading ? "Actualizando..." : "Actualizar auditoria"}
              </Button>
            </div>
            <div className="rounded border p-3">
              <p className="mb-2 text-sm font-medium">Auditoria reciente</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {auditEvents.length === 0 && <p>Sin eventos disponibles.</p>}
                {auditEvents.map((ev) => (
                  <div key={ev.id} className="rounded border px-2 py-1">
                    <span className="font-medium text-foreground">{ev.action}</span>
                    {" · "}
                    {new Date(ev.at).toLocaleString("es-CO")}
                    {" · "}
                    {ev.actor_username} ({ev.actor_role})
                    {ev.detail ? ` · ${ev.detail}` : ""}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Versionado y Respaldo Local</CardTitle>
            <CardDescription>Historial de cambios y puntos de restauracion sin BD externa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border p-3">
              <p className="mb-2 text-sm font-medium">Versiones de evidencias</p>
              <div className="space-y-1">
                {(ficha.evidencias_versiones || []).slice(-10).reverse().map((v) => (
                  <div key={v.id} className="text-xs text-muted-foreground">
                    {new Date(v.fecha).toLocaleString("es-CO")} · {v.snapshot.titulo}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded border p-3 space-y-2">
              <Label>Nombre del respaldo</Label>
              <div className="flex gap-2">
                <Input
                  value={backupNombre}
                  onChange={(e) => setBackupNombre(e.target.value)}
                  placeholder="Respaldo semanal"
                />
                <Button
                  onClick={() => {
                    onCrearBackup(backupNombre)
                    setBackupNombre("")
                    toast.success("Respaldo local creado")
                  }}
                >
                  Crear
                </Button>
              </div>
              {(ficha.backups_locales || []).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{b.nombre}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onRestaurarBackup(b.id)}>
                      Restaurar
                    </Button>
                    {canDeleteGlobal && (
                      <Button size="sm" variant="ghost" onClick={() => onEliminarBackup(b.id)}>
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
