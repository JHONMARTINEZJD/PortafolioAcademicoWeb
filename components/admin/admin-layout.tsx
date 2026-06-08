"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EstudiantesManager } from "./estudiantes-manager"
import { CategoriasManager } from "./categorias-manager"
import { EvidenciasManager } from "./evidencias-manager"
import { MaterialApoyoManager } from "./material-apoyo-manager"
import { AsistenciaManager } from "./asistencia-manager"
import { CompetenciasManager } from "./competencias-manager"
import { ConfiguracionManager } from "./configuracion-manager"
import { ModulosAvanzados } from "./modulos-avanzados"
import { AdminControlCenter } from "./admin-control-center"
import { AgregarFichaDialog } from "@/components/agregar-ficha-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/lib/auth-context"
import {
  Users,
  FolderOpen,
  FileText,
  Upload,
  CalendarCheck2,
  BookOpen,
  Settings,
  ArrowLeft,
  ShieldCheck,
  Layers3,
  LayoutDashboard,
} from "lucide-react"
import type { usePortfolioStore } from "@/lib/storage"

interface AdminLayoutProps {
  store: ReturnType<typeof usePortfolioStore>
  onBack: () => void
}

export function AdminLayout({ store, onBack }: AdminLayoutProps) {
  const { isAdmin, isInstructor, userId } = useAuth()
  const { data, fichaActiva } = store
  const [createFichaOpen, setCreateFichaOpen] = useState(false)
  const fichaActual =
    data?.fichas.find((f) => f.id === fichaActiva) || data?.fichas[0]

  if (!data) return null

  if (!fichaActual) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver al portafolio</span>
            </Button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-4 w-px bg-border" />
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">
                {isAdmin ? "Panel de Administracion" : "Panel de Instructor"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">No hay fichas creadas</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea la primera ficha para habilitar la gestion academica y administrativa.
            </p>
            <div className="mt-5">
              <Button onClick={() => setCreateFichaOpen(true)}>Crear primera ficha</Button>
            </div>
          </div>
        </div>

        <AgregarFichaDialog
          open={createFichaOpen}
          onClose={() => setCreateFichaOpen(false)}
          onAgregar={store.agregarFicha}
        />
      </div>
    )
  }

  const competenciasGestion = isInstructor
    ? fichaActual.competencias.filter((comp) => comp.instructor_id === userId)
    : fichaActual.competencias
  const instructorActual = isInstructor
    ? fichaActual.estudiantes.find((est) => est.id === userId)
    : null
  const competenciaIdsGestion = new Set(competenciasGestion.map((comp) => comp.id))
  const categoriasGestion = isInstructor
    ? fichaActual.categorias.filter(
        (cat) => cat.competencia_id && competenciaIdsGestion.has(cat.competencia_id)
      )
    : fichaActual.categorias
  const asistenciaGlobalHabilitada =
    typeof fichaActual.configuracion.asistencia_habilitada === "boolean"
      ? fichaActual.configuracion.asistencia_habilitada
      : true

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver al portafolio</span>
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-4 w-px bg-border" />
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">
              {isAdmin ? "Panel de Administracion" : "Panel de Instructor"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-muted/30 px-4 py-2.5 text-xs md:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Ficha {fichaActual.configuracion.ficha || "-"}</Badge>
          <Badge variant="secondary">{fichaActual.configuracion.programa || "Programa"}</Badge>
          <span className="text-muted-foreground">
            {fichaActual.estudiantes.filter((e) => e.rol === "aprendiz").length} aprendices
          </span>
          <span className="text-muted-foreground">
            {fichaActual.estudiantes.filter((e) => e.rol === "instructor").length} instructores
          </span>
          <span className="text-muted-foreground">
            {fichaActual.categorias.length} categorias
          </span>
          <span className="text-muted-foreground">
            {fichaActual.competencias.length} competencias
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue={isAdmin ? "control" : "competencias"}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border bg-background px-4 md:px-6 overflow-x-auto">
          <TabsList className="h-auto min-w-max bg-transparent gap-0 p-0">
            {isAdmin && (
              <TabsTrigger
                value="control"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Centro de Control</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="estudiantes"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Estudiantes</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="categorias"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="competencias"
              className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Competencias</span>
            </TabsTrigger>
            {isInstructor && (
              <TabsTrigger
                value="material-apoyo"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Material Apoyo</span>
              </TabsTrigger>
            )}
            {isInstructor && asistenciaGlobalHabilitada && (
              <TabsTrigger
                value="asistencia"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <CalendarCheck2 className="h-4 w-4" />
                <span className="hidden sm:inline">Asistencia</span>
              </TabsTrigger>
            )}
            {isInstructor && (
              <TabsTrigger
                value="evidencias"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Revision Evidencias</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="configuracion"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configuracion</span>
              </TabsTrigger>
            )}
            {(isAdmin || isInstructor) && (
              <TabsTrigger
                value="modulos-avanzados"
                className="rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1.5"
              >
                <Layers3 className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isAdmin ? "Gestion Avanzada" : "Academico+"}
                </span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 h-full">
            {isAdmin && (
              <TabsContent value="control" className="mt-0 h-full flex flex-col">
                <AdminControlCenter ficha={fichaActual} />
              </TabsContent>
            )}
            {isAdmin && (
              <TabsContent value="estudiantes" className="mt-0 h-full flex flex-col">
                <EstudiantesManager
                  estudiantes={fichaActual.estudiantes}
                  onAdd={store.addEstudiante}
                  onUpdate={store.updateEstudiante}
                  onDelete={store.deleteEstudiante}
                />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="categorias" className="mt-0 h-full flex flex-col">
                <CategoriasManager
                  categorias={fichaActual.categorias}
                  competencias={fichaActual.competencias}
                  onAdd={store.addCategoria}
                  onUpdate={store.updateCategoria}
                  onDelete={store.deleteCategoria}
                />
              </TabsContent>
            )}

            <TabsContent value="competencias" className="mt-0 h-full flex flex-col">
              <CompetenciasManager
                competencias={competenciasGestion}
                instructores={fichaActual.estudiantes.filter(
                  (est) => est.rol === "instructor"
                )}
                onAddComp={store.addCompetencia}
                onUpdateComp={store.updateCompetencia}
                onDeleteComp={store.deleteCompetencia}
                onAddRA={store.addRA}
                onUpdateRA={store.updateRA}
                onDeleteRA={store.deleteRA}
              />
            </TabsContent>

            {isInstructor && (
              <TabsContent value="material-apoyo" className="mt-0 h-full flex flex-col">
                <MaterialApoyoManager
                  categorias={categoriasGestion}
                  competencias={competenciasGestion}
                  onAdd={store.addEvidencia}
                  onUpdate={store.updateEvidencia}
                  onDelete={store.deleteEvidencia}
                />
              </TabsContent>
            )}

            {isInstructor && asistenciaGlobalHabilitada && (
              <TabsContent value="asistencia" className="mt-0 h-full flex flex-col">
                <AsistenciaManager
                  instructores={fichaActual.estudiantes.filter((e) => e.rol === "instructor")}
                  aprendices={fichaActual.estudiantes.filter((e) => e.rol === "aprendiz")}
                  asistencias={fichaActual.asistencias || []}
                  enabled={asistenciaGlobalHabilitada}
                  currentInstructorId={isInstructor ? userId : null}
                  isAdmin={isAdmin}
                  canExportConsolidado={Boolean(instructorActual?.es_gestor_ficha)}
                  fichaCodigo={fichaActual.configuracion.ficha}
                  onGuardar={store.upsertAsistencia}
                  onEliminar={store.deleteAsistencia}
                />
              </TabsContent>
            )}

            {isInstructor && (
              <TabsContent value="evidencias" className="mt-0 h-full flex flex-col">
                <EvidenciasManager
                  categorias={categoriasGestion}
                  estudiantes={fichaActual.estudiantes}
                  competencias={competenciasGestion}
                  onAdd={store.addEvidencia}
                  onUpdate={store.updateEvidencia}
                  onDelete={store.deleteEvidencia}
                  canEditAuthor={false}
                />
              </TabsContent>
            )}

            {isAdmin && (
              <TabsContent value="configuracion" className="mt-0 h-full flex flex-col">
                <ConfiguracionManager
                  configuracion={fichaActual.configuracion}
                  onUpdate={store.updateConfiguracion}
                  onToggleAseo={store.setAseoHabilitado}
                  onToggleAsistencia={store.setAsistenciaHabilitada}
                  onClearAseoMonth={store.limpiarAseoMes}
                  onManualBackup={store.ejecutarRespaldoManual}
                  onTestPostgres={store.probarConexionPostgres}
                  syncInfo={store.syncInfo}
                  onExport={store.exportData}
                  onImport={store.importData}
                  onReset={store.resetData}
                />
              </TabsContent>
            )}

            {(isAdmin || isInstructor) && (
              <TabsContent value="modulos-avanzados" className="mt-0 h-full flex flex-col">
                <ModulosAvanzados
                  ficha={fichaActual}
                  userId={userId}
                  isAdmin={isAdmin}
                  isInstructor={isInstructor}
                  onUpsertEvaluacion={store.upsertEvaluacionRubrica}
                  onDeleteEvaluacion={store.deleteEvaluacionRubrica}
                  onUpsertPlan={store.upsertPlanMejora}
                  onDeletePlan={store.deletePlanMejora}
                  onUpsertAlerta={store.upsertAlerta}
                  onDeleteAlerta={store.deleteAlerta}
                  onUpsertCronograma={store.upsertEventoCronograma}
                  onDeleteCronograma={store.deleteEventoCronograma}
                  onUpsertActa={store.upsertActa}
                  onDeleteActa={store.deleteActa}
                  onUpsertPlantilla={store.upsertPlantilla}
                  onDeletePlantilla={store.deletePlantilla}
                  onCrearBackup={store.crearBackupLocal}
                  onRestaurarBackup={store.restaurarBackupLocal}
                  onEliminarBackup={store.eliminarBackupLocal}
                  onActualizarEstadoEvidencia={store.actualizarEstadoEvidencia}
                />
              </TabsContent>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
