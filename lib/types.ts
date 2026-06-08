export type TipoEvidencia = "pdf" | "video" | "imagen" | "presentacion"
export type UserRole = "aprendiz" | "instructor" | "admin"
export type EstadoEvidencia =
  | "borrador"
  | "enviada"
  | "revisada"
  | "aprobada"
  | "rechazada"

export interface ResultadoAprendizaje {
  id: string
  codigo: string
  descripcion: string
}

export interface Competencia {
  id: string
  codigo: string
  nombre: string
  instructor_id?: string
  resultados_aprendizaje: ResultadoAprendizaje[]
}

export interface Evidencia {
  id: string
  titulo: string
  descripcion: string
  tipo: TipoEvidencia
  url: string
  fecha: string
  autor: string
  resultado_aprendizaje: string
  competencia_id?: string
  estudiante_id?: string
  es_personal?: boolean
  es_material_apoyo?: boolean
  estado?: EstadoEvidencia
  retroalimentacion?: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion: string
  icono: string
  competencia_id?: string
  evidencias: Evidencia[]
}

export interface Estudiante {
  id: string
  nombre: string
  correo: string
  documento: string
  telefono: string
  rol: UserRole
  usuario?: string
  clave?: string
  es_vocero?: boolean
  es_gestor_ficha?: boolean
}

export interface AsistenciaRegistro {
  id: string
  instructor_id: string
  fecha: string
  presentes: string[]
}

export interface AseoAsignacion {
  fecha: string
  estudiante_id: string
}

export interface AseoMes {
  mes: string
  fechas_formacion: string[]
  asignaciones: AseoAsignacion[]
}

export interface AseoConfig {
  habilitado: boolean
  historial_estudiantes: string[]
  meses: AseoMes[]
}

export interface ConfiguracionPortafolio {
  institucion: string
  programa: string
  ficha: string
  centro_formacion: string
  jornada: string
  instructor_lider: string
  fecha_corte_evidencias?: string
  sla_revision_dias?: number
  minimo_evidencias_por_ra?: number
  aseo_habilitado?: boolean
  asistencia_habilitada?: boolean
  alertas_habilitadas?: boolean
  cronograma_habilitado?: boolean
  observador_habilitado?: boolean
}

export interface EvidenciaVersion {
  id: string
  evidencia_id: string
  fecha: string
  snapshot: Evidencia
}

export interface EvaluacionRubrica {
  id: string
  evidencia_id: string
  instructor_id: string
  criterios: Array<{ criterio: string; puntaje: number; maximo: number }>
  observaciones: string
  fecha: string
}

export interface PlanMejora {
  id: string
  aprendiz_id: string
  evidencia_id?: string
  descripcion: string
  fecha_compromiso: string
  estado: "abierto" | "en_proceso" | "cerrado"
}

export interface AlertaSistema {
  id: string
  tipo: "asistencia" | "evidencia" | "riesgo" | "general"
  titulo: string
  detalle: string
  fecha: string
  rol_destino: "admin" | "instructor" | "aprendiz" | "todos"
}

export interface EventoCronograma {
  id: string
  fecha: string
  titulo: string
  descripcion?: string
  competencia_id?: string
}

export interface ActaCompromiso {
  id: string
  fecha: string
  tema: string
  compromisos: string
  responsable: string
}

export interface PlantillaTexto {
  id: string
  nombre: string
  tipo: "retroalimentacion" | "observacion" | "comunicado"
  contenido: string
}

export interface BackupSnapshot {
  id: string
  fecha: string
  nombre: string
  data: Ficha
}

export interface Ficha {
  id: string
  configuracion: ConfiguracionPortafolio
  estudiantes: Estudiante[]
  categorias: Categoria[]
  competencias: Competencia[]
  asistencias: AsistenciaRegistro[]
  aseo: AseoConfig
  evaluaciones_rubrica?: EvaluacionRubrica[]
  planes_mejora?: PlanMejora[]
  alertas?: AlertaSistema[]
  cronograma?: EventoCronograma[]
  actas?: ActaCompromiso[]
  plantillas?: PlantillaTexto[]
  evidencias_versiones?: EvidenciaVersion[]
  backups_locales?: BackupSnapshot[]
}

export interface PortfolioData {
  fichas: Ficha[]
}
