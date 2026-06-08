"use client"

import { useMemo, useState } from "react"
import type { Competencia, Estudiante, ResultadoAprendizaje } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { EntityFormDialog } from "./entity-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, BookOpen, GraduationCap } from "lucide-react"
import { toast } from "sonner"

interface CompetenciasManagerProps {
  competencias: Competencia[]
  instructores: Estudiante[]
  onAddComp: (comp: Omit<Competencia, "id" | "resultados_aprendizaje">) => void
  onUpdateComp: (id: string, comp: Partial<Omit<Competencia, "resultados_aprendizaje">>) => void
  onDeleteComp: (id: string) => void
  onAddRA: (compId: string, ra: Omit<ResultadoAprendizaje, "id">) => void
  onUpdateRA: (compId: string, raId: string, ra: Partial<ResultadoAprendizaje>) => void
  onDeleteRA: (compId: string, raId: string) => void
}

const emptyCompForm = { codigo: "", nombre: "", instructor_id: "none" }
const emptyRAForm = { codigo: "", descripcion: "" }

export function CompetenciasManager({
  competencias,
  instructores,
  onAddComp,
  onUpdateComp,
  onDeleteComp,
  onAddRA,
  onUpdateRA,
  onDeleteRA,
}: CompetenciasManagerProps) {
  const { isAdmin, isInstructor, userId } = useAuth()
  const [compDialogOpen, setCompDialogOpen] = useState(false)
  const [raDialogOpen, setRADialogOpen] = useState(false)
  const [editingCompId, setEditingCompId] = useState<string | null>(null)
  const [editingRA, setEditingRA] = useState<{
    compId: string
    raId: string | null
  } | null>(null)
  const [compForm, setCompForm] = useState(emptyCompForm)
  const [raForm, setRAForm] = useState(emptyRAForm)
  const [search, setSearch] = useState("")
  const [instructorFiltro, setInstructorFiltro] = useState("todos")
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "comp" | "ra"
    compId: string
    raId?: string
    label: string
  } | null>(null)
  const instructoresById = Object.fromEntries(
    instructores.map((ins) => [ins.id, ins.nombre])
  )
  const competenciasVisibles = useMemo(() => {
    const base = isInstructor
      ? competencias.filter((comp) => comp.instructor_id === userId)
      : competencias
    return base.filter((comp) => {
      const matchInstructor =
        instructorFiltro === "todos"
          ? true
          : instructorFiltro === "sin-asignar"
            ? !comp.instructor_id
            : comp.instructor_id === instructorFiltro
      const text = `${comp.codigo} ${comp.nombre}`.toLowerCase()
      const matchSearch = search.trim()
        ? text.includes(search.trim().toLowerCase())
        : true
      return matchInstructor && matchSearch
    })
  }, [competencias, instructorFiltro, isInstructor, search, userId])

  const resumen = useMemo(() => {
    const totalRA = competencias.reduce(
      (acc, comp) => acc + comp.resultados_aprendizaje.length,
      0
    )
    const sinInstructor = competencias.filter((comp) => !comp.instructor_id).length
    return {
      totalCompetencias: competencias.length,
      totalRA,
      sinInstructor,
      instructores: instructores.length,
    }
  }, [competencias, instructores.length])

  // Competencia CRUD
  const openCreateComp = () => {
    if (!isAdmin) return
    setCompForm(emptyCompForm)
    setEditingCompId(null)
    setCompDialogOpen(true)
  }

  const openEditComp = (comp: Competencia) => {
    if (!isAdmin) return
    setCompForm({
      codigo: comp.codigo,
      nombre: comp.nombre,
      instructor_id: comp.instructor_id || "none",
    })
    setEditingCompId(comp.id)
    setCompDialogOpen(true)
  }

  const handleSubmitComp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!compForm.codigo.trim() || !compForm.nombre.trim()) return
    const payload = {
      ...compForm,
      instructor_id:
        compForm.instructor_id && compForm.instructor_id !== "none"
          ? compForm.instructor_id
          : undefined,
    }
    if (editingCompId) {
      onUpdateComp(editingCompId, payload)
      toast.success("Competencia actualizada")
    } else {
      onAddComp(payload)
      toast.success("Competencia creada")
    }
    setCompDialogOpen(false)
  }

  // RA CRUD
  const openCreateRA = (compId: string) => {
    const comp = competencias.find((c) => c.id === compId)
    const canManageRA = isAdmin || (isInstructor && comp?.instructor_id === userId)
    if (!canManageRA) return
    setRAForm(emptyRAForm)
    setEditingRA({ compId, raId: null })
    setRADialogOpen(true)
  }

  const openEditRA = (compId: string, ra: ResultadoAprendizaje) => {
    const comp = competencias.find((c) => c.id === compId)
    const canManageRA = isAdmin || (isInstructor && comp?.instructor_id === userId)
    if (!canManageRA) return
    setRAForm({ codigo: ra.codigo, descripcion: ra.descripcion })
    setEditingRA({ compId, raId: ra.id })
    setRADialogOpen(true)
  }

  const handleSubmitRA = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRA || !raForm.codigo.trim() || !raForm.descripcion.trim()) return
    const comp = competencias.find((c) => c.id === editingRA.compId)
    const canManageRA = isAdmin || (isInstructor && comp?.instructor_id === userId)
    if (!canManageRA) return
    if (editingRA.raId) {
      onUpdateRA(editingRA.compId, editingRA.raId, raForm)
      toast.success("Resultado de aprendizaje actualizado")
    } else {
      onAddRA(editingRA.compId, raForm)
      toast.success("Resultado de aprendizaje creado")
    }
    setRADialogOpen(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === "comp") {
      if (!isAdmin) return
      onDeleteComp(deleteTarget.compId)
      toast.success("Competencia eliminada")
    } else if (deleteTarget.raId) {
      const comp = competencias.find((c) => c.id === deleteTarget.compId)
      const canManageRA =
        isAdmin || (isInstructor && comp?.instructor_id === userId)
      if (!canManageRA) return
      onDeleteRA(deleteTarget.compId, deleteTarget.raId)
      toast.success("Resultado de aprendizaje eliminado")
    }
    setDeleteTarget(null)
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Competencias y Resultados de Aprendizaje
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra competencias y resultados segun tu rol.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateComp} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        )}
      </div>
      {!isInstructor && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por codigo o nombre"
          />
          <Select value={instructorFiltro} onValueChange={setInstructorFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por instructor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sin-asignar">Sin instructor</SelectItem>
              {instructores.map((ins) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            Mostrando {competenciasVisibles.length} de {competencias.length}
          </div>
        </div>
      )}

      {!isInstructor && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Competencias</p>
            <p className="text-xl font-semibold">{resumen.totalCompetencias}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">RA definidos</p>
            <p className="text-xl font-semibold">{resumen.totalRA}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Sin instructor</p>
            <p className="text-xl font-semibold">{resumen.sinInstructor}</p>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Instructores disponibles</p>
            <p className="text-xl font-semibold">{resumen.instructores}</p>
          </div>
        </div>
      )}

      {competenciasVisibles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <BookOpen className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {isInstructor
              ? "No tienes competencias asignadas"
              : "No hay competencias definidas"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
          <div className="p-4">
            <Accordion type="multiple" className="flex flex-col gap-2">
              {competenciasVisibles.map((comp) => {
                const canManageRA =
                  isAdmin || (isInstructor && comp.instructor_id === userId)
                return (
                <AccordionItem
                  key={comp.id}
                  value={comp.id}
                  className="rounded-lg border border-border bg-card px-4 data-[state=open]:bg-card"
                >
                  <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                    <AccordionTrigger className="flex-1 py-3 text-left hover:no-underline">
                      <div className="flex flex-col gap-1 pr-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            {comp.codigo}
                          </Badge>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {comp.resultados_aprendizaje.length} RA
                          </Badge>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {comp.instructor_id
                              ? `Instructor: ${instructoresById[comp.instructor_id] || "No encontrado"}`
                              : "Sin instructor"}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium text-foreground leading-snug">
                          {comp.nombre}
                        </span>
                      </div>
                    </AccordionTrigger>
                    {isAdmin && (
                      <div className="mt-2 flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditComp(comp)
                          }}
                          aria-label="Editar competencia"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget({
                              type: "comp",
                              compId: comp.id,
                              label: comp.nombre,
                            })
                          }}
                          aria-label="Eliminar competencia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <AccordionContent className="pb-4">
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Resultados de Aprendizaje
                        </p>
                        {canManageRA && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => openCreateRA(comp.id)}
                          >
                            <Plus className="h-3 w-3" />
                            Agregar RA
                          </Button>
                        )}
                      </div>

                      {comp.resultados_aprendizaje.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          Sin resultados de aprendizaje
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {comp.resultados_aprendizaje.map((ra) => (
                            <div
                              key={ra.id}
                              className="group flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                            >
                              <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {ra.codigo}
                                </span>
                                <p className="text-sm text-foreground leading-snug">
                                  {ra.descripcion}
                                </p>
                              </div>
                              {canManageRA && (
                              <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditRA(comp.id, ra)}
                              aria-label="Editar RA"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "ra",
                                  compId: comp.id,
                                  raId: ra.id,
                                  label: ra.descripcion,
                                })
                              }
                              aria-label="Eliminar RA"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                              )}
                        </div>
                      ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </ScrollArea>
      )}

      {/* Dialog: Competencia */}
      <EntityFormDialog
        open={compDialogOpen}
        onClose={() => setCompDialogOpen(false)}
        title={editingCompId ? "Editar Competencia" : "Nueva Competencia"}
        description="Define una competencia del programa formativo."
        onSubmit={handleSubmitComp}
        submitLabel={editingCompId ? "Actualizar" : "Crear"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="comp-codigo">Codigo</Label>
          <Input
            id="comp-codigo"
            value={compForm.codigo}
            onChange={(e) =>
              setCompForm({ ...compForm, codigo: e.target.value })
            }
            placeholder="210601003"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="comp-nombre">Nombre</Label>
          <Textarea
            id="comp-nombre"
            value={compForm.nombre}
            onChange={(e) =>
              setCompForm({ ...compForm, nombre: e.target.value })
            }
            placeholder="Organizar la documentacion teniendo en cuenta las normas legales..."
            rows={3}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="comp-ins">Instructor asignado</Label>
          <Select
            value={compForm.instructor_id}
            onValueChange={(value) => setCompForm({ ...compForm, instructor_id: value })}
          >
            <SelectTrigger id="comp-ins">
              <SelectValue placeholder="Selecciona instructor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {instructores.map((ins) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EntityFormDialog>

      {/* Dialog: RA */}
      <EntityFormDialog
        open={raDialogOpen}
        onClose={() => setRADialogOpen(false)}
        title={
          editingRA?.raId
            ? "Editar Resultado de Aprendizaje"
            : "Nuevo Resultado de Aprendizaje"
        }
        description="Define un resultado de aprendizaje asociado a la competencia."
        onSubmit={handleSubmitRA}
        submitLabel={editingRA?.raId ? "Actualizar" : "Crear"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="ra-codigo">Codigo</Label>
          <Input
            id="ra-codigo"
            value={raForm.codigo}
            onChange={(e) =>
              setRAForm({ ...raForm, codigo: e.target.value })
            }
            placeholder="RA1"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ra-desc">Descripcion</Label>
          <Textarea
            id="ra-desc"
            value={raForm.descripcion}
            onChange={(e) =>
              setRAForm({ ...raForm, descripcion: e.target.value })
            }
            placeholder="Organizar documentos de archivo aplicando la legislacion vigente"
            rows={3}
            required
          />
        </div>
      </EntityFormDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar{" "}
              {deleteTarget?.type === "comp"
                ? "competencia"
                : "resultado de aprendizaje"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "comp"
                ? "Al eliminar esta competencia, tambien se eliminaran todos sus resultados de aprendizaje asociados."
                : "Esta accion no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
