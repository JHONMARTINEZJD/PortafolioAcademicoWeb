"use client"

import { useState, useMemo, useEffect } from "react"
import type { Evidencia, Ficha } from "@/lib/types"
import { usePortfolioStore } from "@/lib/storage"
import { useAuth } from "@/lib/auth-context"
import { PortfolioSidebar } from "@/components/portfolio-sidebar"
import { PortfolioHeader } from "@/components/portfolio-header"
import { EvidenceCard } from "@/components/evidence-card"
import { EvidenceViewer } from "@/components/evidence-viewer"
import { DashboardStats } from "@/components/dashboard-stats"
import { AdminLogin } from "@/components/admin/admin-login"
import { AdminLayout } from "@/components/admin/admin-layout"
import { AdminOverviewDashboard } from "@/components/admin/admin-overview-dashboard"
import { AgregarFichaDialog } from "@/components/agregar-ficha-dialog"
import { SubirEvidenciaPersonal } from "@/components/subir-evidencia-personal"
import { CambiarCredencialesDialog } from "@/components/cambiar-credenciales-dialog"
import { AseoSalonPanel } from "@/components/aseo-salon-panel"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Users, Loader2 } from "lucide-react"

function sortFichasForView(list: Ficha[]): Ficha[] {
  return [...list].sort((a, b) => {
    const rawA = (a.configuracion.ficha || "").trim()
    const rawB = (b.configuracion.ficha || "").trim()
    const numA = Number(rawA)
    const numB = Number(rawB)
    const hasNumA = Number.isFinite(numA)
    const hasNumB = Number.isFinite(numB)
    if (hasNumA && hasNumB && numA !== numB) return numA - numB
    return rawA.localeCompare(rawB, "es")
  })
}

export function PortfolioDashboard() {
  const store = usePortfolioStore()
  const {
    isAdmin,
    isInstructor,
    isAprendiz,
    isPublic,
    userId,
    username,
    nombre,
    canAccessManagement,
  } = useAuth()
  const { data, isLoading, fichas, cambiarFicha, fichaActiva } = store

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null)
  const [competenciaActiva, setCompetenciaActiva] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [filtroRA, setFiltroRA] = useState<string>("todos")
  const [evidenciaSeleccionada, setEvidenciaSeleccionada] = useState<{
    evidencia: Evidencia
    categoriaId: string
  } | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [adminView, setAdminView] = useState(false)
  const [agregarFichaOpen, setAgregarFichaOpen] = useState(false)
  const [subirEvidenciaOpen, setSubirEvidenciaOpen] = useState(false)
  const [editarEvidenciaOpen, setEditarEvidenciaOpen] = useState(false)
  const [cambiarCredencialesOpen, setCambiarCredencialesOpen] = useState(false)

  const fichasPermitidas = useMemo(() => {
    if (isAdmin) return sortFichasForView(fichas)
    if (isPublic || !userId) return []
    const rolObjetivo = isInstructor ? "instructor" : isAprendiz ? "aprendiz" : null
    if (!rolObjetivo) return []
    return sortFichasForView(
      fichas.filter((f) =>
        f.estudiantes.some((e) => {
          if (e.rol !== rolObjetivo) return false
          const byId = e.id === userId
          const byUsername =
            Boolean(username) &&
            Boolean(e.usuario) &&
            e.usuario!.trim().toLowerCase() === username!.trim().toLowerCase()
          return byId || byUsername
        })
      )
    )
  }, [fichas, isAdmin, isPublic, isInstructor, isAprendiz, userId, username])

  useEffect(() => {
    if (isPublic || isAdmin) return
    if (fichasPermitidas.length === 0) return
    const allowed = fichasPermitidas.some((f) => f.id === fichaActiva)
    if (!allowed) {
      cambiarFicha(fichasPermitidas[0].id)
    }
  }, [isPublic, isAdmin, fichasPermitidas, fichaActiva, cambiarFicha])

  // CORREGIDO: Usar la ficha activa en lugar de fichas[0]
  const fichaActualData = data?.fichas.find(f => f.id === fichaActiva) || data?.fichas[0]

  const competenciasTodas = fichaActualData?.competencias || []
  const categoriasTodas = fichaActualData?.categorias || []
  const aprendicesFicha = useMemo(
    () => (fichaActualData?.estudiantes || []).filter((e) => e.rol === "aprendiz"),
    [fichaActualData]
  )
  const aprendizActual = useMemo(
    () => aprendicesFicha.find((e) => e.id === userId),
    [aprendicesFicha, userId]
  )
  const esVocero = Boolean(aprendizActual?.es_vocero)
  const permisoAprendizSubir = true

  const evidenciasPermitidasAprendiz = useMemo(() => {
    if (!isAprendiz || !userId) return null
    return categoriasTodas.flatMap((cat) =>
      cat.evidencias.filter((ev) => {
        const byId = ev.estudiante_id === userId
        const byAuthor =
          !!nombre &&
          ev.autor.trim().toLowerCase() === nombre.trim().toLowerCase()
        return byId || byAuthor
      })
    )
  }, [categoriasTodas, isAprendiz, nombre, userId])

  const alertasVisibles = useMemo(() => {
    const alertas = fichaActualData?.alertas || []
    return alertas.filter((a) => {
      if (a.rol_destino === "todos") return true
      if (isAdmin) return a.rol_destino === "admin"
      if (isInstructor) return a.rol_destino === "instructor"
      if (isAprendiz) return a.rol_destino === "aprendiz"
      return false
    })
  }, [fichaActualData?.alertas, isAdmin, isInstructor, isAprendiz])

  const competenciasVisibles = useMemo(() => {
    if (!fichaActualData) return []
    if (isPublic) return []
    if (isAdmin) return competenciasTodas
    if (isInstructor && userId) {
      return competenciasTodas.filter((comp) => comp.instructor_id === userId)
    }
    if (isAprendiz) return competenciasTodas
    if (!evidenciasPermitidasAprendiz) return competenciasTodas
    return competenciasTodas
  }, [
    isAdmin,
    isInstructor,
    userId,
    competenciasTodas,
    fichaActualData,
    isAprendiz,
    isPublic,
  ])

  const categoriasVisibles = useMemo(() => {
    if (!fichaActualData) return []
    if (isPublic) return []
    if (isAdmin) return categoriasTodas
    if (isInstructor) {
      const compIds = new Set(competenciasVisibles.map((c) => c.id))
      return categoriasTodas.filter(
        (cat) => cat.competencia_id && compIds.has(cat.competencia_id)
      )
    }
    if (isAprendiz) return categoriasTodas
    if (!evidenciasPermitidasAprendiz) return categoriasTodas
    const evidenceIds = new Set(evidenciasPermitidasAprendiz.map((ev) => ev.id))
    return categoriasTodas
      .map((cat) => ({
        ...cat,
        evidencias: cat.evidencias.filter((ev) => evidenceIds.has(ev.id)),
      }))
      .filter((cat) => cat.evidencias.length > 0)
  }, [
    isAdmin,
    isInstructor,
    categoriasTodas,
    competenciasVisibles,
    evidenciasPermitidasAprendiz,
    fichaActualData,
    isAprendiz,
    isPublic,
  ])

  useEffect(() => {
    if (categoriaActiva && !categoriasVisibles.some((c) => c.id === categoriaActiva)) {
      setCategoriaActiva(null)
    }
  }, [categoriaActiva, categoriasVisibles])

  useEffect(() => {
    if (competenciaActiva && !competenciasVisibles.some((c) => c.id === competenciaActiva)) {
      setCompetenciaActiva(null)
      setFiltroRA("todos")
    }
  }, [competenciaActiva, competenciasVisibles])

  useEffect(() => {
    if (isPublic && !loginOpen) {
      setLoginOpen(true)
    }
  }, [isPublic, loginOpen])

  useEffect(() => {
    if (!isLoading && isAdmin && fichas.length === 0) {
      setAdminView(true)
    }
  }, [isAdmin, isLoading, fichas.length])

  const categoriaSeleccionada = categoriasVisibles.find(
    (c: any) => c.id === categoriaActiva
  )

  // Obtener competencia seleccionada
  const competenciaSeleccionada = competenciasVisibles.find(
    (comp: any) => comp.id === competenciaActiva
  )

  const raDisponibles = useMemo(() => {
    if (categoriaSeleccionada) {
      return Array.from(
        new Set(
          categoriaSeleccionada.evidencias
            .map((ev) => ev.resultado_aprendizaje)
            .filter(Boolean)
        )
      )
    }

    return (competenciaSeleccionada?.resultados_aprendizaje || []).map(
      (ra) => `${ra.codigo} - ${ra.descripcion}`
    )
  }, [categoriaSeleccionada, competenciaSeleccionada])

  const evidenciasFiltradas = useMemo(() => {
    if (!categoriasVisibles.length) return []
    let evidencias = categoriaSeleccionada
      ? categoriaSeleccionada.evidencias
      : categoriasVisibles.flatMap((c) => c.evidencias) || []

    if (isAprendiz && userId) {
      evidencias = evidencias.filter((ev) => {
        if (ev.es_material_apoyo) return true
        const byId = ev.estudiante_id === userId
        const byAuthor =
          !!nombre &&
          ev.autor.trim().toLowerCase() === nombre.trim().toLowerCase()
        return byId || byAuthor
      })
    }

    if (filtroTipo !== "todos") {
      evidencias = evidencias.filter((e) => e.tipo === filtroTipo)
    }

    if (filtroRA !== "todos") {
      evidencias = evidencias.filter((e) => e.resultado_aprendizaje === filtroRA)
    }

    if (busqueda.trim()) {
      const query = busqueda.toLowerCase()
      evidencias = evidencias.filter(
        (e) =>
          e.titulo.toLowerCase().includes(query) ||
          e.descripcion.toLowerCase().includes(query) ||
          e.autor.toLowerCase().includes(query) ||
          e.resultado_aprendizaje.toLowerCase().includes(query)
      )
    }

    return evidencias
  }, [
    isAprendiz,
    userId,
    nombre,
    categoriaSeleccionada,
    categoriasVisibles,
    filtroTipo,
    filtroRA,
    busqueda,
  ])

  const materialApoyoFiltrado = useMemo(
    () =>
      evidenciasFiltradas
        .filter((ev) => ev.es_material_apoyo)
        .sort((a, b) => a.titulo.localeCompare(b.titulo, "es")),
    [evidenciasFiltradas]
  )

  const evidenciasAprendicesFiltradas = useMemo(
    () =>
      evidenciasFiltradas
        .filter((ev) => !ev.es_material_apoyo)
        .sort((a, b) => {
          const byAutor = (a.autor || "").localeCompare(b.autor || "", "es")
          if (byAutor !== 0) return byAutor
          return a.titulo.localeCompare(b.titulo, "es")
        }),
    [evidenciasFiltradas]
  )

  const evidenciasPorAutor = useMemo(() => {
    const grouped = new Map<string, Evidencia[]>()
    for (const ev of evidenciasAprendicesFiltradas) {
      const autor = ev.autor || "Sin autor"
      if (!grouped.has(autor)) grouped.set(autor, [])
      grouped.get(autor)!.push(ev)
    }
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "es")
    )
  }, [evidenciasAprendicesFiltradas])

  const handleOpenEvidencia = (evidencia: Evidencia) => {
    const categoriaId =
      categoriasVisibles.find((cat) =>
        cat.evidencias.some((ev) => ev.id === evidencia.id)
      )?.id || ""

    setEvidenciaSeleccionada({ evidencia, categoriaId })
    setViewerOpen(true)
  }

  const esEvidenciaDelAprendiz = (evidencia: Evidencia) => {
    if (!isAprendiz || !userId) return false
    if (evidencia.estudiante_id && evidencia.estudiante_id === userId) return true
    if (nombre && evidencia.autor.trim().toLowerCase() === nombre.trim().toLowerCase()) {
      return true
    }
    return false
  }

  const handleSelectCategoria = (id: string | null) => {
    setCategoriaActiva(id)
    setSidebarOpen(false)
    setFiltroTipo("todos")
    setFiltroRA("todos")
    setCompetenciaActiva(null)
    setBusqueda("")
    setAdminView(false)
  }

  const handleOpenAdmin = () => {
    if (!canAccessManagement) return
    setAdminView(true)
    setSidebarOpen(false)
  }

  const handleLoginSuccess = () => {
    setLoginOpen(false)
    setAdminView(true)
  }

  const handleLoginClose = () => {
    if (isPublic) return
    setLoginOpen(false)
  }

  const handleAgregarFicha = (config: any) => {
    if (store.agregarFicha) {
      store.agregarFicha(config)
      setAgregarFichaOpen(false)
    }
  }

  const handleEditarFicha = (fichaId: string, config: any) => {
    if (store.editarFicha) {
      store.editarFicha(fichaId, config)
    }
  }

  const handleEliminarFicha = (fichaId: string) => {
    if (!store.eliminarFicha) return
    if (fichas.length <= 1) {
      toast.error("Debe existir al menos una ficha")
      return
    }
    store.eliminarFicha(fichaId)
    toast.success("Ficha eliminada correctamente")
  }

  const handleSubirEvidenciaPersonal = (datos: any) => {
    if (store.agregarEvidenciaPersonal && isAprendiz && userId) {
      const {
        categoriaId,
        titulo,
        descripcion,
        tipo,
        url,
        fecha,
        competencia_id,
        resultado_aprendizaje,
      } = datos
      store.agregarEvidenciaPersonal(categoriaId, {
        titulo,
        descripcion,
        tipo,
        url,
        fecha,
        autor: nombre || "Aprendiz",
        estudiante_id: userId,
        competencia_id,
        resultado_aprendizaje,
        es_personal: true,
      })
      setSubirEvidenciaOpen(false)
    }
  }

  const handleEditarEvidenciaPersonal = (datos: any) => {
    if (!evidenciaSeleccionada || !store.editarEvidenciaPersonal) return
    if (!esEvidenciaDelAprendiz(evidenciaSeleccionada.evidencia)) return
    const { categoriaId, ...resto } = datos
    const categoriaObjetivo = categoriaId || evidenciaSeleccionada.categoriaId
    const evidenciaObjetivo = evidenciaSeleccionada.evidencia

    if (evidenciaObjetivo.es_personal) {
      store.editarEvidenciaPersonal(
        categoriaObjetivo,
        evidenciaObjetivo.id,
        { ...resto, es_personal: true }
      )
    } else {
      store.updateEvidencia(categoriaObjetivo, evidenciaObjetivo.id, {
        ...resto,
        estudiante_id: evidenciaObjetivo.estudiante_id || userId || undefined,
      })
    }
    setEditarEvidenciaOpen(false)
    setViewerOpen(false)
  }

  const handleEliminarEvidenciaPersonal = () => {
    if (!evidenciaSeleccionada || !store.eliminarEvidenciaPersonal) return
    if (!esEvidenciaDelAprendiz(evidenciaSeleccionada.evidencia)) return

    if (evidenciaSeleccionada.evidencia.es_personal) {
      store.eliminarEvidenciaPersonal(
        evidenciaSeleccionada.categoriaId,
        evidenciaSeleccionada.evidencia.id
      )
    } else {
      store.deleteEvidencia(
        evidenciaSeleccionada.categoriaId,
        evidenciaSeleccionada.evidencia.id
      )
    }
    setViewerOpen(false)
    setEditarEvidenciaOpen(false)
    setEvidenciaSeleccionada(null)
    toast.success("Evidencia personal eliminada")
  }

  const handleCambiarCredenciales = (payload: {
    usuarioActual: string
    claveActual: string
    nuevoUsuario: string
    nuevaClave: string
  }) => {
    if (!userId || !fichaActualData) return false
    const usuario = fichaActualData.estudiantes.find((e) => e.id === userId)
    if (!usuario) return false

    const okUsuario = (usuario.usuario || "") === payload.usuarioActual
    const okClave = (usuario.clave || "") === payload.claveActual
    if (!okUsuario || !okClave) return false

    store.updateEstudiante(userId, {
      usuario: payload.nuevoUsuario,
      clave: payload.nuevaClave,
    })
    return true
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando portafolio...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin && !isPublic && fichasPermitidas.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Sin ficha asociada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu cuenta no tiene una ficha asignada. Solicita al administrador asociarte a una ficha para continuar.
          </p>
        </div>
      </div>
    )
  }

  if (isPublic) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background px-4">
        <AdminLogin
          open
          onClose={handleLoginClose}
          onSuccess={handleLoginSuccess}
        />
      </div>
    )
  }

  const titulo = adminView
    ? "Panel de Administracion"
    : isPublic
      ? "Acceso Requerido"
    : categoriaSeleccionada
      ? categoriaSeleccionada.nombre
      : "Vista General"

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <PortfolioSidebar
        categorias={categoriasVisibles}
        competencias={competenciasVisibles}
        configuracion={fichaActualData?.configuracion || null}
        categoriaActiva={categoriaActiva}
        onSelectCategoria={handleSelectCategoria}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onSubirEvidencia={() => setSubirEvidenciaOpen(true)}
        onOpenCambiarCredenciales={() => setCambiarCredencialesOpen(true)}
        isAdminView={adminView}
        canSubirEvidencia={permisoAprendizSubir}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {adminView && canAccessManagement ? (
          <AdminLayout
            store={store}
            onBack={() => setAdminView(false)}
          />
        ) : (
          <>
            <PortfolioHeader
              onToggleSidebar={() => setSidebarOpen(true)}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              titulo={titulo}
              fichas={isAdmin ? fichas : fichasPermitidas}
              fichaActiva={fichaActiva}
              onChangeFicha={(id) => {
                if (isAdmin || fichasPermitidas.some((f) => f.id === id)) {
                  cambiarFicha(id)
                }
              }}
              onAgregarFicha={() => setAgregarFichaOpen(true)}
              onEditarFicha={handleEditarFicha}
              onEliminarFicha={handleEliminarFicha}
            />

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
                {isPublic && (
                  <section className="mb-8 rounded-xl border border-dashed border-border bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Inicia sesion para acceder a tus evidencias y funcionalidades segun tu rol.
                    </p>
                  </section>
                )}
                {/* Overview stats on dashboard */}
                {isAdmin && categoriaActiva === null && fichaActualData && (
                  <section className="mb-8">
                    <AdminOverviewDashboard
                      ficha={fichaActualData}
                      onOpenAdminPanel={handleOpenAdmin}
                      onSelectCategoria={handleSelectCategoria}
                    />
                  </section>
                )}

                {categoriaActiva === null && fichaActualData && !isPublic && !isAdmin && (
                  <section className="mb-8">
                    <DashboardStats categorias={categoriasVisibles} />

                    {/* Info bar */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-card-foreground">
                          {fichaActualData.configuracion.programa}
                        </span>
                      </div>
                      <Badge variant="outline" className="border-border text-muted-foreground">
                        Ficha {fichaActualData.configuracion.ficha}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {
                          fichaActualData.estudiantes.filter(
                            (est) => est.rol === "aprendiz"
                          ).length
                        }{" "}
                        aprendices
                      </div>
                    </div>
                  </section>
                )}

                {categoriaActiva === null &&
                  fichaActualData &&
                  !isPublic &&
                  !isAdmin &&
                  (Boolean(fichaActualData.configuracion.cronograma_habilitado) ||
                    Boolean(fichaActualData.configuracion.alertas_habilitadas)) && (
                  <section className="mb-8 grid gap-4 lg:grid-cols-2">
                    {Boolean(fichaActualData.configuracion.cronograma_habilitado) && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h3 className="mb-2 text-sm font-semibold">Cronograma</h3>
                      <div className="space-y-2 text-sm">
                        {(fichaActualData.cronograma || []).slice(0, 6).map((ev) => (
                          <div key={ev.id} className="rounded-md border p-2">
                            <p className="font-medium">{ev.fecha}</p>
                            <p className="text-muted-foreground">{ev.titulo}</p>
                          </div>
                        ))}
                        {(fichaActualData.cronograma || []).length === 0 && (
                          <p className="text-muted-foreground">No hay eventos programados.</p>
                        )}
                      </div>
                    </div>
                    )}
                    {Boolean(fichaActualData.configuracion.alertas_habilitadas) && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h3 className="mb-2 text-sm font-semibold">Alertas</h3>
                      <div className="space-y-2 text-sm">
                        {alertasVisibles.slice(0, 6).map((al) => (
                          <div key={al.id} className="rounded-md border p-2">
                            <p className="font-medium">{al.titulo}</p>
                            <p className="text-muted-foreground">{al.detalle}</p>
                          </div>
                        ))}
                        {alertasVisibles.length === 0 && (
                          <p className="text-muted-foreground">No hay alertas.</p>
                        )}
                      </div>
                    </div>
                    )}
                  </section>
                )}

                {isAprendiz &&
                  fichaActualData &&
                  Boolean(fichaActualData.configuracion.aseo_habilitado) && (
                  <section className="mb-8">
                    <AseoSalonPanel
                      enabled={Boolean(fichaActualData.configuracion.aseo_habilitado)}
                      aseo={fichaActualData.aseo}
                      aprendices={aprendicesFicha}
                      isVocero={esVocero}
                      onProgramarMes={store.generarAseoMes}
                    />
                  </section>
                )}

                {/* Category description */}
                {categoriaSeleccionada && !isPublic && (
                  <section className="mb-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {categoriaSeleccionada.descripcion}
                    </p>
                  </section>
                )}

                {/* Filter bar */}
                {!isPublic && (!isAdmin || Boolean(categoriaSeleccionada)) && (
                <section className="mb-5 space-y-3">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      {evidenciasAprendicesFiltradas.length}{" "}
                      {evidenciasAprendicesFiltradas.length === 1 ? "evidencia" : "evidencias"} de aprendices
                      {" · "}
                      {materialApoyoFiltrado.length}{" "}
                      {materialApoyoFiltrado.length === 1
                        ? "material de apoyo"
                        : "materiales de apoyo"}
                      {busqueda && (
                        <span>
                          {" "}
                          para{" "}
                          <span className="font-medium text-foreground">
                            {`"${busqueda}"`}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Filtros - Layout responsive con scroll */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {/* Filtro de Tipo */}
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-9 w-full sm:w-40 border-border bg-card text-sm">
                        <SelectValue placeholder="Tipo de archivo" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="todos">Todos los tipos</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="imagen">Imagen</SelectItem>
                        <SelectItem value="presentacion">Presentacion</SelectItem>
                      </SelectContent>
                    </Select>

                    {!categoriaSeleccionada && (
                      <Select
                        value={competenciaActiva || "todos"}
                        onValueChange={(val) =>
                          setCompetenciaActiva(val === "todos" ? null : val)
                        }
                      >
                        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-64 border-border bg-card text-sm">
                          <SelectValue placeholder="Competencia" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="todos">Todas las competencias</SelectItem>
                          {competenciasVisibles.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.codigo} - {comp.nombre.substring(0, 40)}...
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Filtro de RA: en categoria se muestra directo; en vista general depende de competencia */}
                    {(categoriaSeleccionada || competenciaActiva) && (
                      <Select value={filtroRA} onValueChange={setFiltroRA}>
                        <SelectTrigger className="h-9 w-full sm:flex-1 sm:min-w-72 border-border bg-card text-sm">
                          <SelectValue placeholder="Resultado de aprendizaje" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="todos">Todos los resultados</SelectItem>
                          {raDisponibles.map((ra) => (
                            <SelectItem key={ra} value={ra}>
                              {ra}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </section>
                )}

                {(!isAdmin || Boolean(categoriaSeleccionada)) &&
                (materialApoyoFiltrado.length > 0 || evidenciasAprendicesFiltradas.length > 0) ? (
                  <div className="space-y-8">
                    {materialApoyoFiltrado.length > 0 && (
                      <section className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Material de apoyo del instructor
                          </h3>
                          <Badge variant="outline">{materialApoyoFiltrado.length}</Badge>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {materialApoyoFiltrado.map((evidencia) => (
                            <EvidenceCard
                              key={evidencia.id}
                              evidencia={evidencia}
                              onClick={() => handleOpenEvidencia(evidencia)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {evidenciasAprendicesFiltradas.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Evidencias de aprendices
                          </h3>
                          <Badge variant="outline">{evidenciasAprendicesFiltradas.length}</Badge>
                        </div>

                        <div className="space-y-6">
                          {evidenciasPorAutor.map(([autor, evidenciasAutor]) => (
                            <div key={autor} className="space-y-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {autor}
                              </p>
                              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {evidenciasAutor.map((evidencia) => (
                                  <EvidenceCard
                                    key={evidencia.id}
                                    evidencia={evidencia}
                                    onClick={() => handleOpenEvidencia(evidencia)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (!isAdmin || Boolean(categoriaSeleccionada)) ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16">
                    <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {isPublic
                        ? "Inicia sesion para ver evidencias"
                        : "No se encontraron evidencias"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      {isPublic
                        ? "Usa el acceso en la barra lateral para continuar"
                        : "Intenta con otro termino de busqueda o cambia los filtros"}
                    </p>
                  </div>
                ) : null}
              </div>
            </main>
          </>
        )}
      </div>

      <EvidenceViewer
        evidencia={evidenciaSeleccionada?.evidencia || null}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        canManagePersonal={
          !!evidenciaSeleccionada?.evidencia &&
          esEvidenciaDelAprendiz(evidenciaSeleccionada.evidencia)
        }
        onEditPersonal={() => {
          setViewerOpen(false)
          setEditarEvidenciaOpen(true)
        }}
        onDeletePersonal={handleEliminarEvidenciaPersonal}
      />

      <AdminLogin
        open={loginOpen}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
      />

      <AgregarFichaDialog
        open={agregarFichaOpen}
        onClose={() => setAgregarFichaOpen(false)}
        onAgregar={handleAgregarFicha}
      />

      <SubirEvidenciaPersonal
        open={subirEvidenciaOpen && permisoAprendizSubir}
        onClose={() => setSubirEvidenciaOpen(false)}
        categorias={categoriasVisibles}
        competencias={competenciasVisibles}
        onSubir={handleSubirEvidenciaPersonal}
      />

      <SubirEvidenciaPersonal
        open={editarEvidenciaOpen}
        onClose={() => setEditarEvidenciaOpen(false)}
        categorias={categoriasVisibles}
        competencias={competenciasVisibles}
        mode="editar"
        initialData={
          evidenciaSeleccionada
            ? {
                titulo: evidenciaSeleccionada.evidencia.titulo,
                descripcion: evidenciaSeleccionada.evidencia.descripcion,
                tipo: evidenciaSeleccionada.evidencia.tipo,
                url: evidenciaSeleccionada.evidencia.url,
                categoriaId: evidenciaSeleccionada.categoriaId,
                fecha: evidenciaSeleccionada.evidencia.fecha,
                competencia_id: evidenciaSeleccionada.evidencia.competencia_id || "",
                resultado_aprendizaje:
                  evidenciaSeleccionada.evidencia.resultado_aprendizaje,
              }
            : null
        }
        onSubir={handleEditarEvidenciaPersonal}
        onEliminar={handleEliminarEvidenciaPersonal}
      />

      <CambiarCredencialesDialog
        open={cambiarCredencialesOpen}
        onClose={() => setCambiarCredencialesOpen(false)}
        onSubmit={handleCambiarCredenciales}
      />
    </div>
  )
}
