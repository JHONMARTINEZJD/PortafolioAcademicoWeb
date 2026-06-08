"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  PortfolioData,
  Estudiante,
  Categoria,
  Evidencia,
  EstadoEvidencia,
  Competencia,
  ResultadoAprendizaje,
  ConfiguracionPortafolio,
  Ficha,
  AsistenciaRegistro,
  AseoConfig,
  AseoMes,
  EvaluacionRubrica,
  PlanMejora,
  AlertaSistema,
  EventoCronograma,
  ActaCompromiso,
  PlantillaTexto,
  BackupSnapshot,
} from "@/lib/types"

const EMPTY_PORTFOLIO: PortfolioData = { fichas: [] }

const ACTIVE_FICHA_KEY = "portfolio-active-ficha"
const SYNC_INTERVAL_MS = 60 * 1000

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function normalizeConfiguracion(raw: any): ConfiguracionPortafolio {
  const slaRevisionDias =
    Number.isFinite(Number(raw?.sla_revision_dias)) && Number(raw?.sla_revision_dias) > 0
      ? Math.min(60, Math.floor(Number(raw?.sla_revision_dias)))
      : 3
  const minimoEvidenciasPorRa =
    Number.isFinite(Number(raw?.minimo_evidencias_por_ra)) &&
    Number(raw?.minimo_evidencias_por_ra) >= 0
      ? Math.min(20, Math.floor(Number(raw?.minimo_evidencias_por_ra)))
      : 1

  return {
    institucion: toText(raw?.institucion, "SENA"),
    programa: toText(raw?.programa),
    ficha: toText(raw?.ficha),
    centro_formacion: toText(raw?.centro_formacion),
    jornada: toText(raw?.jornada),
    instructor_lider: toText(raw?.instructor_lider),
    fecha_corte_evidencias: toText(raw?.fecha_corte_evidencias) || undefined,
    sla_revision_dias: slaRevisionDias,
    minimo_evidencias_por_ra: minimoEvidenciasPorRa,
    aseo_habilitado:
      typeof raw?.aseo_habilitado === "boolean" ? raw.aseo_habilitado : true,
    asistencia_habilitada:
      typeof raw?.asistencia_habilitada === "boolean"
        ? raw.asistencia_habilitada
        : true,
    alertas_habilitadas:
      typeof raw?.alertas_habilitadas === "boolean"
        ? raw.alertas_habilitadas
        : true,
    cronograma_habilitado:
      typeof raw?.cronograma_habilitado === "boolean"
        ? raw.cronograma_habilitado
        : true,
    observador_habilitado:
      typeof raw?.observador_habilitado === "boolean"
        ? raw.observador_habilitado
        : true,
  }
}

function normalizeEstudiante(raw: any): Estudiante {
  const rol =
    raw?.rol === "admin" || raw?.rol === "instructor" || raw?.rol === "aprendiz"
      ? raw.rol
      : "aprendiz"
  return {
    id: toText(raw?.id, generateId()),
    nombre: toText(raw?.nombre, "Sin nombre"),
    correo: toText(raw?.correo),
    documento: toText(raw?.documento),
    telefono: toText(raw?.telefono),
    rol,
    usuario: toText(raw?.usuario) || undefined,
    clave: toText(raw?.clave) || undefined,
    es_vocero: Boolean(raw?.es_vocero),
    es_gestor_ficha: Boolean(raw?.es_gestor_ficha),
  }
}

function normalizeAsistencia(raw: any): AsistenciaRegistro {
  return {
    id: toText(raw?.id, generateId()),
    instructor_id: toText(raw?.instructor_id),
    fecha: toText(raw?.fecha, new Date().toISOString().split("T")[0]),
    presentes: Array.isArray(raw?.presentes)
      ? raw.presentes.map((p: unknown) => toText(p)).filter(Boolean)
      : [],
  }
}

function normalizeAseoMes(raw: any): AseoMes {
  return {
    mes: toText(raw?.mes),
    fechas_formacion: Array.isArray(raw?.fechas_formacion)
      ? raw.fechas_formacion.map((f: unknown) => toText(f)).filter(Boolean)
      : [],
    asignaciones: Array.isArray(raw?.asignaciones)
      ? raw.asignaciones
          .map((a: any) => ({
            fecha: toText(a?.fecha),
            estudiante_id: toText(a?.estudiante_id),
          }))
          .filter((a: any) => a.fecha && a.estudiante_id)
      : [],
  }
}

function normalizeAseo(raw: any): AseoConfig {
  return {
    habilitado: Boolean(raw?.habilitado),
    historial_estudiantes: Array.isArray(raw?.historial_estudiantes)
      ? raw.historial_estudiantes.map((s: unknown) => toText(s)).filter(Boolean)
      : [],
    meses: Array.isArray(raw?.meses) ? raw.meses.map(normalizeAseoMes) : [],
  }
}

function normalizeEvidencia(raw: any): Evidencia {
  const tipoValido =
    raw?.tipo === "pdf" ||
    raw?.tipo === "video" ||
    raw?.tipo === "imagen" ||
    raw?.tipo === "presentacion"
      ? raw.tipo
      : "pdf"

  return {
    id: toText(raw?.id, generateId()),
    titulo: toText(raw?.titulo, "Evidencia"),
    descripcion: toText(raw?.descripcion),
    tipo: tipoValido,
    url: toText(raw?.url),
    fecha: toText(raw?.fecha, new Date().toISOString().split("T")[0]),
    autor: toText(raw?.autor, "Sin autor"),
    resultado_aprendizaje: toText(raw?.resultado_aprendizaje, "Sin RA"),
    competencia_id: toText(raw?.competencia_id) || undefined,
    estudiante_id: toText(raw?.estudiante_id) || undefined,
    es_personal: Boolean(raw?.es_personal),
    es_material_apoyo: Boolean(raw?.es_material_apoyo),
    estado: (["borrador", "enviada", "revisada", "aprobada", "rechazada"].includes(
      raw?.estado
    )
      ? raw.estado
      : "enviada") as EstadoEvidencia,
    retroalimentacion: toText(raw?.retroalimentacion) || undefined,
  }
}

function normalizeCategoria(raw: any): Categoria {
  const evidenciasRaw = Array.isArray(raw?.evidencias) ? raw.evidencias : []
  const evidencias = evidenciasRaw.map(normalizeEvidencia)
  const competenciaIdFromEvidence = evidencias.find(
    (e: Evidencia) => e.competencia_id
  )?.competencia_id
  return {
    id: toText(raw?.id, generateId()),
    nombre: toText(raw?.nombre, "Categoria"),
    descripcion: toText(raw?.descripcion),
    icono: toText(raw?.icono, "file-text"),
    competencia_id:
      toText(raw?.competencia_id) || competenciaIdFromEvidence || undefined,
    evidencias,
  }
}

function normalizeRA(raw: any): ResultadoAprendizaje {
  return {
    id: toText(raw?.id, generateId()),
    codigo: toText(raw?.codigo, "RA"),
    descripcion: toText(raw?.descripcion),
  }
}

function normalizeCompetencia(raw: any): Competencia {
  const rasRaw = Array.isArray(raw?.resultados_aprendizaje)
    ? raw.resultados_aprendizaje
    : []
  return {
    id: toText(raw?.id, generateId()),
    codigo: toText(raw?.codigo, "COMP"),
    nombre: toText(raw?.nombre, "Competencia"),
    instructor_id: toText(raw?.instructor_id) || undefined,
    resultados_aprendizaje: rasRaw.map(normalizeRA),
  }
}

function normalizeFicha(raw: any): Ficha {
  const estudiantesRaw = Array.isArray(raw?.estudiantes) ? raw.estudiantes : []
  const categoriasRaw = Array.isArray(raw?.categorias) ? raw.categorias : []
  const competenciasRaw = Array.isArray(raw?.competencias) ? raw.competencias : []
  const asistenciasRaw = Array.isArray(raw?.asistencias) ? raw.asistencias : []
  const evaluacionesRaw = Array.isArray(raw?.evaluaciones_rubrica)
    ? raw.evaluaciones_rubrica
    : []
  const planesRaw = Array.isArray(raw?.planes_mejora) ? raw.planes_mejora : []
  const alertasRaw = Array.isArray(raw?.alertas) ? raw.alertas : []
  const cronogramaRaw = Array.isArray(raw?.cronograma) ? raw.cronograma : []
  const actasRaw = Array.isArray(raw?.actas) ? raw.actas : []
  const plantillasRaw = Array.isArray(raw?.plantillas) ? raw.plantillas : []
  const versionesRaw = Array.isArray(raw?.evidencias_versiones)
    ? raw.evidencias_versiones
    : []
  const backupsRaw = Array.isArray(raw?.backups_locales) ? raw.backups_locales : []
  return {
    id: toText(raw?.id, generateId()),
    configuracion: normalizeConfiguracion(raw?.configuracion ?? raw),
    estudiantes: estudiantesRaw.map(normalizeEstudiante),
    categorias: categoriasRaw.map(normalizeCategoria),
    competencias: competenciasRaw.map(normalizeCompetencia),
    asistencias: asistenciasRaw.map(normalizeAsistencia),
    aseo: normalizeAseo(raw?.aseo),
    evaluaciones_rubrica: evaluacionesRaw.map((e: any) => ({
      id: toText(e?.id, generateId()),
      evidencia_id: toText(e?.evidencia_id),
      instructor_id: toText(e?.instructor_id),
      criterios: Array.isArray(e?.criterios)
        ? e.criterios.map((c: any) => ({
            criterio: toText(c?.criterio),
            puntaje: Number(c?.puntaje) || 0,
            maximo: Number(c?.maximo) || 5,
          }))
        : [],
      observaciones: toText(e?.observaciones),
      fecha: toText(e?.fecha, new Date().toISOString().split("T")[0]),
    })),
    planes_mejora: planesRaw.map((p: any) => ({
      id: toText(p?.id, generateId()),
      aprendiz_id: toText(p?.aprendiz_id),
      evidencia_id: toText(p?.evidencia_id) || undefined,
      descripcion: toText(p?.descripcion),
      fecha_compromiso: toText(p?.fecha_compromiso),
      estado: ["abierto", "en_proceso", "cerrado"].includes(p?.estado)
        ? p.estado
        : "abierto",
    })),
    alertas: alertasRaw.map((a: any) => ({
      id: toText(a?.id, generateId()),
      tipo: ["asistencia", "evidencia", "riesgo", "general"].includes(a?.tipo)
        ? a.tipo
        : "general",
      titulo: toText(a?.titulo),
      detalle: toText(a?.detalle),
      fecha: toText(a?.fecha, new Date().toISOString().split("T")[0]),
      rol_destino: ["admin", "instructor", "aprendiz", "todos"].includes(a?.rol_destino)
        ? a.rol_destino
        : "todos",
    })),
    cronograma: cronogramaRaw.map((c: any) => ({
      id: toText(c?.id, generateId()),
      fecha: toText(c?.fecha),
      titulo: toText(c?.titulo),
      descripcion: toText(c?.descripcion) || undefined,
      competencia_id: toText(c?.competencia_id) || undefined,
    })),
    actas: actasRaw.map((a: any) => ({
      id: toText(a?.id, generateId()),
      fecha: toText(a?.fecha, new Date().toISOString().split("T")[0]),
      tema: toText(a?.tema),
      compromisos: toText(a?.compromisos),
      responsable: toText(a?.responsable),
    })),
    plantillas: plantillasRaw.map((p: any) => ({
      id: toText(p?.id, generateId()),
      nombre: toText(p?.nombre),
      tipo: ["retroalimentacion", "observacion", "comunicado"].includes(p?.tipo)
        ? p.tipo
        : "retroalimentacion",
      contenido: toText(p?.contenido),
    })),
    evidencias_versiones: versionesRaw.map((v: any) => ({
      id: toText(v?.id, generateId()),
      evidencia_id: toText(v?.evidencia_id),
      fecha: toText(v?.fecha, new Date().toISOString()),
      snapshot: normalizeEvidencia(v?.snapshot || {}),
    })),
    backups_locales: backupsRaw.map((b: any) => ({
      id: toText(b?.id, generateId()),
      fecha: toText(b?.fecha, new Date().toISOString()),
      nombre: toText(b?.nombre, "Respaldo local"),
      data: normalizeFicha({ ...(b?.data || {}), backups_locales: [] }),
    })),
  }
}

function normalizeImportedData(input: unknown): PortfolioData | null {
  if (!input || typeof input !== "object") return null
  const data = input as any

  if (Array.isArray(data.fichas) && data.fichas.length > 0) {
    const normalized = { fichas: data.fichas.map(normalizeFicha) }
    return normalizeCrossFichaIdentities(normalized)
  }

  if (
    data.configuracion ||
    Array.isArray(data.estudiantes) ||
    Array.isArray(data.categorias) ||
    Array.isArray(data.competencias)
  ) {
    const normalized = { fichas: [normalizeFicha(data)] }
    return normalizeCrossFichaIdentities(normalized)
  }

  return null
}

function normalizeCrossFichaIdentities(portfolio: PortfolioData): PortfolioData {
  const canonicalByKey = new Map<string, string>()
  const canonicalByLegacyId = new Map<string, string>()

  for (const ficha of portfolio.fichas) {
    for (const est of ficha.estudiantes) {
      const keys = [
        est.usuario ? `u:${est.rol}:${est.usuario.trim().toLowerCase()}` : "",
        est.correo ? `c:${est.rol}:${est.correo.trim().toLowerCase()}` : "",
        est.documento ? `d:${est.rol}:${est.documento.trim()}` : "",
      ].filter(Boolean)
      const existing = keys.map((k) => canonicalByKey.get(k)).find(Boolean)
      const canonicalId = existing || est.id
      for (const k of keys) canonicalByKey.set(k, canonicalId)
      canonicalByLegacyId.set(est.id, canonicalId)
    }
  }

  const mapId = (value: string | undefined | null): string | undefined =>
    value ? canonicalByLegacyId.get(value) || value : undefined
  const mapArrayIds = (values: string[] | undefined): string[] =>
    Array.isArray(values)
      ? values.map((v) => canonicalByLegacyId.get(v) || v)
      : []

  return {
    fichas: portfolio.fichas.map((ficha) => ({
      ...ficha,
      estudiantes: ficha.estudiantes.map((est) => ({
        ...est,
        id: canonicalByLegacyId.get(est.id) || est.id,
      })),
      competencias: ficha.competencias.map((c) => ({
        ...c,
        instructor_id: mapId(c.instructor_id),
      })),
      categorias: ficha.categorias.map((cat) => ({
        ...cat,
        evidencias: cat.evidencias.map((ev) => ({
          ...ev,
          estudiante_id: mapId(ev.estudiante_id),
        })),
      })),
      asistencias: ficha.asistencias.map((a) => ({
        ...a,
        instructor_id: mapId(a.instructor_id) || a.instructor_id,
        presentes: mapArrayIds(a.presentes),
      })),
      aseo: {
        ...ficha.aseo,
        historial_estudiantes: mapArrayIds(ficha.aseo.historial_estudiantes),
        meses: (ficha.aseo.meses || []).map((m) => ({
          ...m,
          asignaciones: (m.asignaciones || []).map((asig) => ({
            ...asig,
            estudiante_id: mapId(asig.estudiante_id) || asig.estudiante_id,
          })),
        })),
      },
      planes_mejora: (ficha.planes_mejora || []).map((p) => ({
        ...p,
        aprendiz_id: mapId(p.aprendiz_id) || p.aprendiz_id,
      })),
    })),
  }
}

function loadActiveFichaId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(ACTIVE_FICHA_KEY)
  } catch {
    return null
  }
}

function saveActiveFichaId(fichaId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ACTIVE_FICHA_KEY, fichaId)
  } catch {
    // storage full or unavailable
  }
}

export function usePortfolioStore() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fichaActiva, setFichaActiva] = useState<string | null>(null)
  const [syncInfo, setSyncInfo] = useState<{
    lastBackupAt: string | null
    lastSyncAt: string | null
    lastPullAt: string | null
    lastError: string | null
  }>({
    lastBackupAt: null,
    lastSyncAt: null,
    lastPullAt: null,
    lastError: null,
  })
  const dataRef = useRef<PortfolioData | null>(null)
  const remoteUpdatedAtRef = useRef<number>(0)

  const syncToHybrid = useCallback(async (payload: PortfolioData) => {
    const pushedAt = new Date().toISOString()
    setSyncInfo((prev) => ({ ...prev, lastBackupAt: pushedAt, lastError: null }))

    try {
      const response = await fetch("/api/portfolio/hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: payload,
          updatedAt: new Date().toISOString(),
        }),
      })
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return
        }
        throw new Error(`sync_failed_${response.status}`)
      }
      setSyncInfo((prev) => ({
        ...prev,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
      }))
    } catch (error) {
      setSyncInfo((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "sync_failed",
      }))
    }
  }, [])

  const pullFromHybrid = useCallback(async (force = false) => {
    try {
      const response = await fetch("/api/portfolio/hybrid", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) return
      const result = await response.json()
      const remoteData = result?.data
      const remoteUpdatedAt = Date.parse(result?.updatedAt || "")
      if (!remoteData || !Number.isFinite(remoteUpdatedAt)) return

      if (!force && remoteUpdatedAt <= remoteUpdatedAtRef.current) {
        setSyncInfo((prev) => ({ ...prev, lastPullAt: new Date().toISOString() }))
        return
      }

      const normalized = normalizeImportedData(remoteData)
      if (!normalized || normalized.fichas.length === 0) return

      setData(normalized)
      dataRef.current = normalized
      remoteUpdatedAtRef.current = remoteUpdatedAt

      const previousActive = loadActiveFichaId()
      const activeFichaId =
        previousActive && normalized.fichas.some((f) => f.id === previousActive)
          ? previousActive
          : normalized.fichas[0]?.id || null
      setFichaActiva(activeFichaId)

      setSyncInfo((prev) => ({
        ...prev,
        lastPullAt: new Date().toISOString(),
        lastError: null,
      }))
    } catch (error) {
      setSyncInfo((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "pull_failed",
      }))
    }
  }, [])

  const persist = useCallback((updated: PortfolioData) => {
    setData(updated)
    dataRef.current = updated
    remoteUpdatedAtRef.current = Date.now()
    void syncToHybrid(updated)
  }, [syncToHybrid])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await pullFromHybrid(true)
      if (!cancelled && !dataRef.current) {
        const fallback = EMPTY_PORTFOLIO
        if (fallback && fallback.fichas.length > 0) {
          setData(fallback)
          dataRef.current = fallback
          setFichaActiva(loadActiveFichaId() || fallback.fichas[0]?.id || null)
          setSyncInfo((prev) => ({
            ...prev,
            lastError: prev.lastError || "using_seed_fallback",
          }))
        }
        if (!fallback.fichas.length) {
          setData(fallback)
          dataRef.current = fallback
          setFichaActiva(null)
        }
      }
      if (!cancelled) setIsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [pullFromHybrid])

  const setPostgresUrl = useCallback((_url: string) => {
    // Server-only DATABASE_URL by design.
  }, [])

  const probarConexionPostgres = useCallback(async () => {
    try {
      const response = await fetch("/api/portfolio/hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testOnly: true,
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (isLoading) return
    const timer = window.setInterval(() => {
      void pullFromHybrid()
    }, SYNC_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [isLoading, pullFromHybrid])

  const getFichaActual = useCallback(() => {
    if (!data || !fichaActiva) return null
    return data.fichas.find(f => f.id === fichaActiva) || null
  }, [data, fichaActiva])

  // --- Manejo de Fichas ---
  const cambiarFicha = useCallback((fichaId: string) => {
    if (!data || !data.fichas.find(f => f.id === fichaId)) return
    setFichaActiva(fichaId)
    saveActiveFichaId(fichaId)
  }, [data])

  const agregarFicha = useCallback(
    (config: ConfiguracionPortafolio) => {
      if (!data) return
      const nuevaFicha: Ficha = {
        id: generateId(),
        configuracion: config,
        estudiantes: [],
        categorias: [],
        competencias: [],
        asistencias: [],
        aseo: { habilitado: false, historial_estudiantes: [], meses: [] },
        evaluaciones_rubrica: [],
        planes_mejora: [],
        alertas: [],
        cronograma: [],
        actas: [],
        plantillas: [],
        evidencias_versiones: [],
        backups_locales: [],
      }
      const updated = { ...data, fichas: [...data.fichas, nuevaFicha] }
      persist(updated)
      setFichaActiva(nuevaFicha.id)
      saveActiveFichaId(nuevaFicha.id)
    },
    [data, persist]
  )

  const eliminarFicha = useCallback(
    (fichaId: string) => {
      if (!data || data.fichas.length <= 1) return
      const fichasActualizadas = data.fichas.filter(f => f.id !== fichaId)
      persist({ ...data, fichas: fichasActualizadas })
      
      if (fichaActiva === fichaId) {
        const nuevaFicha = fichasActualizadas[0]
        setFichaActiva(nuevaFicha?.id || null)
        if (nuevaFicha) saveActiveFichaId(nuevaFicha.id)
      }
    },
    [data, fichaActiva, persist]
  )

  const editarFicha = useCallback(
    (fichaId: string, config: Partial<ConfiguracionPortafolio>) => {
      if (!data) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaId
            ? { ...f, configuracion: { ...f.configuracion, ...config } }
            : f
        ),
      })
    },
    [data, persist]
  )

  // --- Estudiantes ---
  const addEstudiante = useCallback(
    (est: Omit<Estudiante, "id">) => {
      if (!data || !fichaActiva) return
      const usuarioKey = (est.usuario || "").trim().toLowerCase()
      const correoKey = (est.correo || "").trim().toLowerCase()
      const documentoKey = (est.documento || "").trim()
      const existingGlobal = data.fichas
        .flatMap((f) => f.estudiantes)
        .find((s) => {
          if (s.rol !== est.rol) return false
          const sameUsuario =
            Boolean(usuarioKey) &&
            Boolean(s.usuario) &&
            s.usuario!.trim().toLowerCase() === usuarioKey
          const sameCorreo =
            Boolean(correoKey) &&
            Boolean(s.correo) &&
            s.correo.trim().toLowerCase() === correoKey
          const sameDocumento =
            Boolean(documentoKey) &&
            Boolean(s.documento) &&
            s.documento.trim() === documentoKey
          return sameUsuario || sameCorreo || sameDocumento
        })
      const nuevoId = existingGlobal?.id || generateId()
      const nuevo: Estudiante = { ...est, id: nuevoId }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                estudiantes: f.estudiantes.some((s) => s.id === nuevoId)
                  ? f.estudiantes
                  : [...f.estudiantes, nuevo],
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const updateEstudiante = useCallback(
    (id: string, est: Partial<Estudiante>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                estudiantes: f.estudiantes.map(e =>
                  e.id === id ? { ...e, ...est } : e
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteEstudiante = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? { ...f, estudiantes: f.estudiantes.filter(e => e.id !== id) }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Categorias ---
  const addCategoria = useCallback(
    (cat: Omit<Categoria, "id" | "evidencias">) => {
      if (!data || !fichaActiva) return
      const nueva: Categoria = { ...cat, id: generateId(), evidencias: [] }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? { ...f, categorias: [...f.categorias, nueva] }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const updateCategoria = useCallback(
    (id: string, cat: Partial<Omit<Categoria, "evidencias">>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                categorias: f.categorias.map(c =>
                  c.id === id ? { ...c, ...cat } : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteCategoria = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? { ...f, categorias: f.categorias.filter(c => c.id !== id) }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Evidencias ---
  const addEvidencia = useCallback(
    (catId: string, ev: Omit<Evidencia, "id">) => {
      if (!data || !fichaActiva) return
      const nueva: Evidencia = { ...ev, id: generateId() }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                categorias: f.categorias.map(c =>
                  c.id === catId
                    ? { ...c, evidencias: [...c.evidencias, nueva] }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const updateEvidencia = useCallback(
    (catId: string, evId: string, ev: Partial<Evidencia>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                evidencias_versiones: [
                  ...(f.evidencias_versiones || []),
                  ...f.categorias
                    .flatMap((cat) => cat.evidencias)
                    .filter((e) => e.id === evId)
                    .map((actual) => ({
                      id: generateId(),
                      evidencia_id: evId,
                      fecha: new Date().toISOString(),
                      snapshot: actual,
                    })),
                ],
                categorias: f.categorias.map(c =>
                  c.id === catId
                    ? {
                        ...c,
                        evidencias: c.evidencias.map(e =>
                          e.id === evId ? { ...e, ...ev } : e
                        ),
                      }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteEvidencia = useCallback(
    (catId: string, evId: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                categorias: f.categorias.map(c =>
                  c.id === catId
                    ? { ...c, evidencias: c.evidencias.filter(e => e.id !== evId) }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Evidencias Personales (para aprendices) ---
  const agregarEvidenciaPersonal = useCallback(
    (catId: string, ev: Omit<Evidencia, "id"> & { estudiante_id?: string }) => {
      if (!data || !fichaActiva) return
      const nueva: Evidencia = {
        ...ev,
        id: generateId(),
        es_personal: true,
      }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                categorias: f.categorias.map(c =>
                  c.id === catId
                    ? { ...c, evidencias: [...c.evidencias, nueva] }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

    const editarEvidenciaPersonal = useCallback(
      (catId: string, evId: string, ev: Partial<Evidencia>) => {
        if (!data || !fichaActiva) return
        persist({
          ...data,
          fichas: data.fichas.map(f =>
            f.id === fichaActiva
              ? {
                  ...f,
                  categorias: f.categorias.map(c =>
                    c.id === catId
                      ? {
                          ...c,
                          evidencias: c.evidencias.map(e =>
                            e.id === evId && e.es_personal ? { ...e, ...ev } : e
                          ),
                        }
                      : c
                  ),
                }
              : f
          ),
        })
      },
      [data, fichaActiva, persist]
    )

    const eliminarEvidenciaPersonal = useCallback(
      (catId: string, evId: string) => {
        if (!data || !fichaActiva) return
        persist({
          ...data,
          fichas: data.fichas.map(f =>
            f.id === fichaActiva
              ? {
                  ...f,
                  categorias: f.categorias.map(c =>
                    c.id === catId
                      ? {
                          ...c,
                          evidencias: c.evidencias.filter(e => !(e.id === evId && e.es_personal)),
                        }
                      : c
                  ),
                }
              : f
          ),
        })
      },
      [data, fichaActiva, persist]
    )

  // --- Competencias ---
  const addCompetencia = useCallback(
    (comp: Omit<Competencia, "id" | "resultados_aprendizaje">) => {
      if (!data || !fichaActiva) return
      const nueva: Competencia = {
        ...comp,
        id: generateId(),
        resultados_aprendizaje: [],
      }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? { ...f, competencias: [...f.competencias, nueva] }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const updateCompetencia = useCallback(
    (id: string, comp: Partial<Omit<Competencia, "resultados_aprendizaje">>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                competencias: f.competencias.map(c =>
                  c.id === id ? { ...c, ...comp } : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteCompetencia = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? { ...f, competencias: f.competencias.filter(c => c.id !== id) }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Resultados de Aprendizaje ---
  const addRA = useCallback(
    (compId: string, ra: Omit<ResultadoAprendizaje, "id">) => {
      if (!data || !fichaActiva) return
      const nuevo: ResultadoAprendizaje = { ...ra, id: generateId() }
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                competencias: f.competencias.map(c =>
                  c.id === compId
                    ? {
                        ...c,
                        resultados_aprendizaje: [
                          ...c.resultados_aprendizaje,
                          nuevo,
                        ],
                      }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const updateRA = useCallback(
    (compId: string, raId: string, ra: Partial<ResultadoAprendizaje>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                competencias: f.competencias.map(c =>
                  c.id === compId
                    ? {
                        ...c,
                        resultados_aprendizaje: c.resultados_aprendizaje.map(r =>
                          r.id === raId ? { ...r, ...ra } : r
                        ),
                      }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteRA = useCallback(
    (compId: string, raId: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                competencias: f.competencias.map(c =>
                  c.id === compId
                    ? {
                        ...c,
                        resultados_aprendizaje: c.resultados_aprendizaje.filter(
                          (r) => r.id !== raId
                        ),
                      }
                    : c
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Configuracion ---
  const updateConfiguracion = useCallback(
    (config: Partial<ConfiguracionPortafolio>) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map(f =>
          f.id === fichaActiva
            ? {
                ...f,
                configuracion: { ...f.configuracion, ...config },
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Asistencia de Instructor ---
  const upsertAsistencia = useCallback(
    (instructorId: string, fecha: string, presentes: string[]) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                asistencias: (() => {
                  const existing = f.asistencias.find(
                    (a) => a.instructor_id === instructorId && a.fecha === fecha
                  )
                  if (existing) {
                    return f.asistencias.map((a) =>
                      a.id === existing.id ? { ...a, presentes } : a
                    )
                  }
                  return [
                    ...f.asistencias,
                    { id: generateId(), instructor_id: instructorId, fecha, presentes },
                  ]
                })(),
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteAsistencia = useCallback(
    (asistenciaId: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                asistencias: f.asistencias.filter((a) => a.id !== asistenciaId),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Aseo de Salon ---
  const setAseoHabilitado = useCallback(
    (habilitado: boolean) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                configuracion: { ...f.configuracion, aseo_habilitado: habilitado },
                aseo: { ...f.aseo, habilitado },
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const setAsistenciaHabilitada = useCallback(
    (habilitado: boolean) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                configuracion: { ...f.configuracion, asistencia_habilitada: habilitado },
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const generarAseoMes = useCallback(
    (mes: string, fechasFormacion: string[]) => {
      if (!data || !fichaActiva) return
      const ficha = data.fichas.find((f) => f.id === fichaActiva)
      if (!ficha) return
      const aprendices = ficha.estudiantes.filter((e) => e.rol === "aprendiz")
      if (aprendices.length === 0) return

      let historial = [...(ficha.aseo?.historial_estudiantes || [])]
      const aprendizIds = aprendices.map((a) => a.id)

      const seleccionarCandidato = (excluidos: Set<string>): string | null => {
        let candidatos = aprendizIds.filter(
          (id) => !historial.includes(id) && !excluidos.has(id)
        )

        if (candidatos.length === 0) {
          historial = []
          candidatos = aprendizIds.filter((id) => !excluidos.has(id))
        }

        if (candidatos.length === 0) return null

        const idx = Math.floor(Math.random() * candidatos.length)
        const elegido = candidatos[idx]
        historial.push(elegido)

        if (historial.length >= aprendizIds.length) {
          historial = []
        }

        return elegido
      }

      const asignaciones = fechasFormacion.flatMap((fecha) => {
        const excluidos = new Set<string>()
        const personasPorFecha = Math.min(2, aprendizIds.length)
        const resultado: { fecha: string; estudiante_id: string }[] = []

        for (let i = 0; i < personasPorFecha; i += 1) {
          const candidato = seleccionarCandidato(excluidos)
          if (!candidato) break
          excluidos.add(candidato)
          resultado.push({ fecha, estudiante_id: candidato })
        }

        return resultado
      })

      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                aseo: {
                  ...f.aseo,
                  habilitado:
                    typeof f.configuracion.aseo_habilitado === "boolean"
                      ? f.configuracion.aseo_habilitado
                      : f.aseo.habilitado,
                  historial_estudiantes: historial,
                  meses: [
                    ...(f.aseo.meses || []).filter((m) => m.mes !== mes),
                    {
                      mes,
                      fechas_formacion: fechasFormacion,
                      asignaciones,
                    },
                  ].sort((a, b) => a.mes.localeCompare(b.mes)),
                },
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const limpiarAseoMes = useCallback(
    (mes: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                aseo: {
                  ...f.aseo,
                  historial_estudiantes: [],
                  meses: (f.aseo.meses || []).filter((m) => m.mes !== mes),
                },
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const ejecutarRespaldoManual = useCallback(async () => {
    if (!dataRef.current) return false
    await syncToHybrid(dataRef.current)
    return true
  }, [syncToHybrid])

  // --- Modulos Avanzados ---
  const upsertEvaluacionRubrica = useCallback(
    (payload: Omit<EvaluacionRubrica, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                evaluaciones_rubrica: payload.id
                  ? (f.evaluaciones_rubrica || []).map((e) =>
                      e.id === payload.id ? { ...e, ...payload, id: payload.id! } : e
                    )
                  : [
                      ...(f.evaluaciones_rubrica || []),
                      { ...payload, id: generateId() },
                    ],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteEvaluacionRubrica = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                evaluaciones_rubrica: (f.evaluaciones_rubrica || []).filter(
                  (e) => e.id !== id
                ),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const upsertPlanMejora = useCallback(
    (payload: Omit<PlanMejora, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                planes_mejora: payload.id
                  ? (f.planes_mejora || []).map((p) =>
                      p.id === payload.id ? { ...p, ...payload, id: payload.id! } : p
                    )
                  : [...(f.planes_mejora || []), { ...payload, id: generateId() }],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deletePlanMejora = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                planes_mejora: (f.planes_mejora || []).filter((p) => p.id !== id),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const upsertAlerta = useCallback(
    (payload: Omit<AlertaSistema, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                alertas: payload.id
                  ? (f.alertas || []).map((a) =>
                      a.id === payload.id ? { ...a, ...payload, id: payload.id! } : a
                    )
                  : [...(f.alertas || []), { ...payload, id: generateId() }],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteAlerta = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                alertas: (f.alertas || []).filter((a) => a.id !== id),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const upsertEventoCronograma = useCallback(
    (payload: Omit<EventoCronograma, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                cronograma: payload.id
                  ? (f.cronograma || []).map((c) =>
                      c.id === payload.id ? { ...c, ...payload, id: payload.id! } : c
                    )
                  : [...(f.cronograma || []), { ...payload, id: generateId() }],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteEventoCronograma = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                cronograma: (f.cronograma || []).filter((c) => c.id !== id),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const upsertActa = useCallback(
    (payload: Omit<ActaCompromiso, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                actas: payload.id
                  ? (f.actas || []).map((a) =>
                      a.id === payload.id ? { ...a, ...payload, id: payload.id! } : a
                    )
                  : [...(f.actas || []), { ...payload, id: generateId() }],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deleteActa = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                actas: (f.actas || []).filter((a) => a.id !== id),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const upsertPlantilla = useCallback(
    (payload: Omit<PlantillaTexto, "id"> & { id?: string }) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id !== fichaActiva
            ? f
            : {
                ...f,
                plantillas: payload.id
                  ? (f.plantillas || []).map((p) =>
                      p.id === payload.id ? { ...p, ...payload, id: payload.id! } : p
                    )
                  : [...(f.plantillas || []), { ...payload, id: generateId() }],
              }
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const deletePlantilla = useCallback(
    (id: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                plantillas: (f.plantillas || []).filter((p) => p.id !== id),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const actualizarEstadoEvidencia = useCallback(
    (catId: string, evId: string, estado: EstadoEvidencia, retroalimentacion = "") => {
      if (!data || !fichaActiva) return
      updateEvidencia(catId, evId, { estado, retroalimentacion })
    },
    [data, fichaActiva, updateEvidencia]
  )

  const crearBackupLocal = useCallback(
    (nombre: string) => {
      if (!data || !fichaActiva) return
      const fichaActual = data.fichas.find((f) => f.id === fichaActiva)
      if (!fichaActual) return
      const snapshot: BackupSnapshot = {
        id: generateId(),
        fecha: new Date().toISOString(),
        nombre: nombre.trim() || `Respaldo ${new Date().toLocaleString("es-CO")}`,
        data: { ...fichaActual, backups_locales: [] },
      }
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                backups_locales: [snapshot, ...(f.backups_locales || [])].slice(0, 20),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const restaurarBackupLocal = useCallback(
    (backupId: string) => {
      if (!data || !fichaActiva) return
      const fichaActual = data.fichas.find((f) => f.id === fichaActiva)
      const backup = fichaActual?.backups_locales?.find((b) => b.id === backupId)
      if (!backup) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? { ...backup.data, id: f.id, backups_locales: f.backups_locales || [] }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  const eliminarBackupLocal = useCallback(
    (backupId: string) => {
      if (!data || !fichaActiva) return
      persist({
        ...data,
        fichas: data.fichas.map((f) =>
          f.id === fichaActiva
            ? {
                ...f,
                backups_locales: (f.backups_locales || []).filter((b) => b.id !== backupId),
              }
            : f
        ),
      })
    },
    [data, fichaActiva, persist]
  )

  // --- Import/Export/Reset ---
  const exportData = useCallback(() => {
    if (!data) return ""
    return JSON.stringify(data, null, 2)
  }, [data])

  const importData = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json)
        const normalized = normalizeImportedData(parsed)
        if (!normalized || normalized.fichas.length === 0) return false

        persist(normalized)
        const previousActive = loadActiveFichaId()
        const activeFichaId =
          previousActive &&
          normalized.fichas.some((f) => f.id === previousActive)
            ? previousActive
            : normalized.fichas[0].id
        setFichaActiva(activeFichaId)
        saveActiveFichaId(activeFichaId)
        return true
      } catch {
        return false
      }
    },
    [persist]
  )

  const resetData = useCallback(() => {
    persist(EMPTY_PORTFOLIO)
    setFichaActiva(null)
  }, [persist])

  // Proporcionar datos de la ficha actual para compatibilidad
  const fichaActualData = getFichaActual()
  const dataProxy: PortfolioData | null = fichaActualData
    ? {
        fichas: [fichaActualData], // Envuelto en array para compatibilidad
      }
    : { fichas: [] }

  return {
    data: dataProxy,
    isLoading,
    fichaActiva,
    fichas: data?.fichas || [],
    cambiarFicha,
    agregarFicha,
    editarFicha,
    eliminarFicha,
    // Estudiantes
    addEstudiante,
    updateEstudiante,
    deleteEstudiante,
    // Categorias
    addCategoria,
    updateCategoria,
    deleteCategoria,
    // Evidencias
    addEvidencia,
    updateEvidencia,
    deleteEvidencia,
    agregarEvidenciaPersonal,
    editarEvidenciaPersonal,
    eliminarEvidenciaPersonal,
    // Competencias
    addCompetencia,
    updateCompetencia,
    deleteCompetencia,
    // RA
    addRA,
    updateRA,
    deleteRA,
    // Asistencia
    upsertAsistencia,
    deleteAsistencia,
    // Aseo
    setAseoHabilitado,
    setAsistenciaHabilitada,
    generarAseoMes,
    limpiarAseoMes,
    // Modulos avanzados
    upsertEvaluacionRubrica,
    deleteEvaluacionRubrica,
    upsertPlanMejora,
    deletePlanMejora,
    upsertAlerta,
    deleteAlerta,
    upsertEventoCronograma,
    deleteEventoCronograma,
    upsertActa,
    deleteActa,
    upsertPlantilla,
    deletePlantilla,
    actualizarEstadoEvidencia,
    crearBackupLocal,
    restaurarBackupLocal,
    eliminarBackupLocal,
    // Config
    updateConfiguracion,
    // Import/Export
    exportData,
    importData,
    resetData,
    // Sync/Backup
    syncInfo,
    postgresUrl: "",
    setPostgresUrl,
    probarConexionPostgres,
    ejecutarRespaldoManual,
  }
}
