"use client"

import { useEffect, useState, useMemo } from "react"
import type {
  Categoria,
  Evidencia,
  TipoEvidencia,
  EstadoEvidencia,
  Estudiante,
  Competencia,
} from "@/lib/types"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Plus,
  Pencil,
  Trash2,
  FilePlus,
  FileText,
  Video,
  Image as ImageIcon,
  Presentation,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const tipoBadge: Record<string, { label: string; className: string; Icon: React.ElementType }> = {
  pdf: { label: "PDF", className: "bg-red-50 text-red-600", Icon: FileText },
  video: { label: "Video", className: "bg-blue-50 text-blue-600", Icon: Video },
  imagen: { label: "Imagen", className: "bg-emerald-50 text-emerald-600", Icon: ImageIcon },
  presentacion: { label: "Presentacion", className: "bg-amber-50 text-amber-600", Icon: Presentation },
}

interface EvidenciasManagerProps {
  categorias: Categoria[]
  estudiantes: Estudiante[]
  competencias: Competencia[]
  onAdd: (catId: string, ev: Omit<Evidencia, "id">) => void
  onUpdate: (catId: string, evId: string, ev: Partial<Evidencia>) => void
  onDelete: (catId: string, evId: string) => void
  canEditAuthor?: boolean
}

const emptyForm = {
  titulo: "",
  descripcion: "",
  tipo: "pdf" as TipoEvidencia,
  url: "",
  fecha: "",
  autor: "",
  estudiante_id: "",
  resultado_aprendizaje: "",
  competencia_id: "",
  estado: "enviada" as EstadoEvidencia,
  retroalimentacion: "",
}

export function EvidenciasManager({
  categorias,
  estudiantes,
  competencias,
  onAdd,
  onUpdate,
  onDelete,
  canEditAuthor = true,
}: EvidenciasManagerProps) {
  const isRestrictedMode = !canEditAuthor
  const [selectedCatId, setSelectedCatId] = useState<string>(
    categorias[0]?.id || ""
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ catId: string; evId: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [busqueda, setBusqueda] = useState("")
  const [filtroAprendiz, setFiltroAprendiz] = useState("todos")
  const [filtroRA, setFiltroRA] = useState("todos")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroTipo, setFiltroTipo] = useState("todos")

  const selectedCat = categorias.find((c) => c.id === selectedCatId)
  const evidencias = selectedCat?.evidencias || []
  const competenciaFijaCategoria = selectedCat?.competencia_id || ""
  const evidenciaEditando = editingId
    ? evidencias.find((ev) => ev.id === editingId) || null
    : null

  useEffect(() => {
    if (!categorias.length) {
      setSelectedCatId("")
      return
    }
    if (!categorias.some((c) => c.id === selectedCatId)) {
      setSelectedCatId(categorias[0].id)
    }
  }, [categorias, selectedCatId])

  const allRAs = useMemo(() => {
    return competencias.flatMap((c) =>
      c.resultados_aprendizaje.map((ra) => ({
        id: ra.id,
        label: `${ra.codigo} - ${ra.descripcion}`,
        compId: c.id,
      }))
    )
  }, [competencias])

  const evidenciasFiltradas = useMemo(() => {
    let result = evidencias

    if (filtroAprendiz !== "todos") {
      result = result.filter((ev) => ev.estudiante_id === filtroAprendiz)
    }
    if (filtroRA !== "todos") {
      result = result.filter((ev) => ev.resultado_aprendizaje === filtroRA)
    }
    if (filtroEstado !== "todos") {
      result = result.filter((ev) => (ev.estado || "enviada") === filtroEstado)
    }
    if (filtroTipo !== "todos") {
      result = result.filter((ev) => ev.tipo === filtroTipo)
    }
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      result = result.filter(
        (ev) =>
          ev.titulo.toLowerCase().includes(q) ||
          ev.descripcion.toLowerCase().includes(q) ||
          ev.autor.toLowerCase().includes(q) ||
          ev.resultado_aprendizaje.toLowerCase().includes(q)
      )
    }
    return result
  }, [evidencias, filtroAprendiz, filtroRA, filtroEstado, filtroTipo, busqueda])

  const aprendicesConEvidencias = useMemo(() => {
    const ids = new Set(evidencias.map((ev) => ev.estudiante_id).filter(Boolean))
    return estudiantes
      .filter((est) => ids.has(est.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  }, [evidencias, estudiantes])

  const rasDisponibles = useMemo(() => {
    const values = Array.from(
      new Set(evidencias.map((ev) => ev.resultado_aprendizaje).filter(Boolean))
    )
    return values.sort((a, b) => a.localeCompare(b, "es"))
  }, [evidencias])

  const openCreate = () => {
    if (isRestrictedMode) return
    setForm({
      ...emptyForm,
      fecha: new Date().toISOString().split("T")[0],
      competencia_id: competenciaFijaCategoria,
      estado: "enviada",
      retroalimentacion: "",
    })
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (ev: Evidencia) => {
    setForm({
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      tipo: ev.tipo,
      url: ev.url,
      fecha: ev.fecha,
      autor: ev.autor,
      estudiante_id: ev.estudiante_id || "",
      resultado_aprendizaje: ev.resultado_aprendizaje,
      competencia_id: ev.competencia_id || competenciaFijaCategoria,
      estado: ev.estado || "enviada",
      retroalimentacion: ev.retroalimentacion || "",
    })
    setEditingId(ev.id)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.titulo.trim() ||
      !form.url.trim() ||
      !selectedCatId ||
      !form.autor ||
      !form.competencia_id ||
      !form.resultado_aprendizaje
    ) {
      toast.error("Completa los campos obligatorios: autor, competencia y RA")
      return
    }
    if (competenciaFijaCategoria && form.competencia_id !== competenciaFijaCategoria) {
      toast.error("La evidencia debe usar la competencia asociada a la categoria")
      return
    }

    if (editingId) {
      const evidenciaActual = evidencias.find((ev) => ev.id === editingId)
      const payload: Partial<Evidencia> =
        isRestrictedMode && evidenciaActual
          ? {
              ...form,
              autor: evidenciaActual.autor,
              estudiante_id: evidenciaActual.estudiante_id,
              url: evidenciaActual.url,
              competencia_id: evidenciaActual.competencia_id,
            }
          : form
      onUpdate(selectedCatId, editingId, payload)
      toast.success("Evidencia actualizada")
    } else {
      onAdd(selectedCatId, form)
      toast.success("Evidencia agregada")
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.catId, deleteTarget.evId)
      toast.success("Evidencia eliminada")
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Evidencias
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra las evidencias de cada categoria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCatId} onValueChange={setSelectedCatId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Selecciona categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={openCreate}
            size="sm"
            className="gap-1.5"
            disabled={!selectedCatId || isRestrictedMode}
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-5">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar titulo, autor, RA..."
            className="md:col-span-2"
          />
          <Select value={filtroAprendiz} onValueChange={setFiltroAprendiz}>
            <SelectTrigger>
              <SelectValue placeholder="Aprendiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los aprendices</SelectItem>
              {aprendicesConEvidencias.map((est) => (
                <SelectItem key={est.id} value={est.id}>
                  {est.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroRA} onValueChange={setFiltroRA}>
            <SelectTrigger>
              <SelectValue placeholder="Resultado de aprendizaje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los RA</SelectItem>
              {rasDisponibles.map((ra) => (
                <SelectItem key={ra} value={ra}>
                  {ra}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="borrador">borrador</SelectItem>
              <SelectItem value="enviada">enviada</SelectItem>
              <SelectItem value="revisada">revisada</SelectItem>
              <SelectItem value="aprobada">aprobada</SelectItem>
              <SelectItem value="rechazada">rechazada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Tipo de archivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="imagen">Imagen</SelectItem>
              <SelectItem value="presentacion">Presentacion</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBusqueda("")
              setFiltroAprendiz("todos")
              setFiltroRA("todos")
              setFiltroEstado("todos")
              setFiltroTipo("todos")
            }}
          >
            Limpiar filtros
          </Button>
          <Badge variant="secondary" className="ml-auto">
            {evidenciasFiltradas.length} / {evidencias.length} evidencias
          </Badge>
        </div>
      </div>

      {evidenciasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <FilePlus className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {selectedCatId ? "No hay evidencias con esos filtros" : "Selecciona una categoria"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
          <div className="rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0">
                  <TableHead className="w-24">Tipo</TableHead>
                  <TableHead>Titulo</TableHead>
                <TableHead className="hidden md:table-cell">Autor</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden md:table-cell">Estado</TableHead>
                <TableHead className="hidden lg:table-cell">RA</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {evidenciasFiltradas.map((ev) => {
                const badge = tipoBadge[ev.tipo] || tipoBadge.pdf
                return (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
                          badge.className
                        )}
                      >
                        <badge.Icon className="h-3 w-3" />
                        {badge.label}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground max-w-xs truncate">
                      {ev.titulo}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {ev.autor.split(" ").slice(0, 2).join(" ")}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {new Date(ev.fecha).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">
                        {ev.estado || "enviada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="secondary" className="text-xs max-w-[200px] truncate">
                        {ev.resultado_aprendizaje}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(ev)}
                          aria-label={`Editar ${ev.titulo}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDeleteTarget({ catId: selectedCatId, evId: ev.id })
                          }
                          aria-label={`Eliminar ${ev.titulo}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            </Table>
          </div>
        </ScrollArea>
      )}

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? "Editar Evidencia" : "Nueva Evidencia"}
        description={`Categoria: ${selectedCat?.nombre || ""}`}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Actualizar" : "Agregar"}
      >
        {isRestrictedMode && evidenciaEditando && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium">Autor:</span>{" "}
            <span>{evidenciaEditando.autor || "Sin autor"}</span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="ev-titulo">Titulo</Label>
          <Input
            id="ev-titulo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Tabla de Retencion Documental"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ev-desc">Descripcion</Label>
          <Textarea
            id="ev-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Breve descripcion de la evidencia..."
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-tipo">Tipo de archivo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) =>
                setForm({ ...form, tipo: v as TipoEvidencia })
              }
            >
              <SelectTrigger id="ev-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="imagen">Imagen</SelectItem>
                <SelectItem value="presentacion">Presentacion</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-fecha">Fecha</Label>
            <Input
              id="ev-fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ev-url">URL del recurso</Label>
          <div className="flex gap-2">
            <Input
              id="ev-url"
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              required
              readOnly={isRestrictedMode}
            />
            {isRestrictedMode && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(form.url || "")
                    toast.success("URL copiada")
                  } catch {
                    toast.error("No se pudo copiar la URL")
                  }
                }}
              >
                Copiar
              </Button>
            )}
          </div>
        </div>
        {canEditAuthor && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-autor">Autor *</Label>
            <Select
              value={form.estudiante_id}
              onValueChange={(v) => {
                const estudiante = estudiantes.find((est) => est.id === v)
                setForm({
                  ...form,
                  estudiante_id: v,
                  autor: estudiante?.nombre || "",
                })
              }}
            >
              <SelectTrigger id="ev-autor">
                <SelectValue placeholder="Selecciona autor" />
              </SelectTrigger>
              <SelectContent>
                {estudiantes.map((est) => (
                  <SelectItem key={est.id} value={est.id}>
                    {est.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {canEditAuthor && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-comp">Competencia *</Label>
            <Select
              value={form.competencia_id}
              onValueChange={(v) =>
                setForm({ ...form, competencia_id: v, resultado_aprendizaje: "" })
              }
              disabled={!!competenciaFijaCategoria}
            >
              <SelectTrigger id="ev-comp">
                <SelectValue placeholder="Selecciona competencia" />
              </SelectTrigger>
              <SelectContent>
                {competencias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} - {c.nombre.slice(0, 60)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {competenciaFijaCategoria && (
              <p className="text-xs text-muted-foreground">
                Esta categoria esta vinculada a una competencia especifica.
              </p>
            )}
          </div>
        )}
        {canEditAuthor && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-ra">Resultado de Aprendizaje *</Label>
            <Select
              value={form.resultado_aprendizaje}
              onValueChange={(v) =>
                setForm({ ...form, resultado_aprendizaje: v })
              }
            >
              <SelectTrigger id="ev-ra">
                <SelectValue placeholder="Selecciona RA" />
              </SelectTrigger>
              <SelectContent>
                {allRAs
                  .filter(
                    (ra) =>
                      !form.competencia_id || ra.compId === form.competencia_id
                  )
                  .map((ra) => (
                    <SelectItem key={ra.id} value={ra.label}>
                      {ra.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-estado">Estado</Label>
            <Select
              value={form.estado}
              onValueChange={(v) =>
                setForm({ ...form, estado: v as EstadoEvidencia })
              }
            >
              <SelectTrigger id="ev-estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">borrador</SelectItem>
                <SelectItem value="enviada">enviada</SelectItem>
                <SelectItem value="revisada">revisada</SelectItem>
                <SelectItem value="aprobada">aprobada</SelectItem>
                <SelectItem value="rechazada">rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-retro">Retroalimentacion</Label>
            <Textarea
              id="ev-retro"
              value={form.retroalimentacion || ""}
              onChange={(e) =>
                setForm({ ...form, retroalimentacion: e.target.value })
              }
              rows={2}
            />
          </div>
        </div>
      </EntityFormDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar evidencia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La evidencia sera eliminada permanentemente.
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
