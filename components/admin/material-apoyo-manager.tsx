"use client"

import { useMemo, useState } from "react"
import type { Categoria, Competencia, Evidencia, TipoEvidencia } from "@/lib/types"
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
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react"
import { toast } from "sonner"

interface MaterialApoyoManagerProps {
  categorias: Categoria[]
  competencias: Competencia[]
  onAdd: (catId: string, ev: Omit<Evidencia, "id">) => void
  onUpdate: (catId: string, evId: string, ev: Partial<Evidencia>) => void
  onDelete: (catId: string, evId: string) => void
}

const emptyForm = {
  titulo: "",
  descripcion: "",
  tipo: "pdf" as TipoEvidencia,
  url: "",
  fecha: new Date().toISOString().split("T")[0],
  resultado_aprendizaje: "",
}

export function MaterialApoyoManager({
  categorias,
  competencias,
  onAdd,
  onUpdate,
  onDelete,
}: MaterialApoyoManagerProps) {
  const { nombre } = useAuth()
  const [selectedCatId, setSelectedCatId] = useState(categorias[0]?.id || "")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ catId: string; evId: string } | null>(null)
  const [form, setForm] = useState(emptyForm)

  const categoriaSeleccionada = categorias.find((cat) => cat.id === selectedCatId)
  const competenciaCategoria = competencias.find(
    (comp) => comp.id === categoriaSeleccionada?.competencia_id
  )
  const raDisponibles = competenciaCategoria?.resultados_aprendizaje || []
  const materiales = (categoriaSeleccionada?.evidencias || []).filter(
    (ev) => ev.es_material_apoyo
  )

  const openCreate = () => {
    setForm({ ...emptyForm, fecha: new Date().toISOString().split("T")[0] })
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
      resultado_aprendizaje: ev.resultado_aprendizaje,
    })
    setEditingId(ev.id)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCatId || !categoriaSeleccionada?.competencia_id) {
      toast.error("Selecciona una categoria con competencia asociada")
      return
    }
    if (!form.titulo.trim() || !form.url.trim() || !form.resultado_aprendizaje) {
      toast.error("Completa titulo, URL y RA")
      return
    }

    const payload: Omit<Evidencia, "id"> = {
      titulo: form.titulo,
      descripcion: form.descripcion,
      tipo: form.tipo,
      url: form.url,
      fecha: form.fecha,
      autor: nombre || "Instructor",
      resultado_aprendizaje: form.resultado_aprendizaje,
      competencia_id: categoriaSeleccionada.competencia_id,
      es_material_apoyo: true,
    }

    if (editingId) {
      onUpdate(selectedCatId, editingId, payload)
      toast.success("Material de apoyo actualizado")
    } else {
      onAdd(selectedCatId, payload)
      toast.success("Material de apoyo agregado")
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    onDelete(deleteTarget.catId, deleteTarget.evId)
    toast.success("Material de apoyo eliminado")
    setDeleteTarget(null)
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Material de Apoyo</h3>
          <p className="text-sm text-muted-foreground">
            Contenido del instructor visible para todos los aprendices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedCatId} onValueChange={setSelectedCatId}>
            <SelectTrigger className="w-56">
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
          <Button onClick={openCreate} size="sm" className="gap-1.5" disabled={!selectedCatId}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {materiales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No hay material de apoyo en esta categoria
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 sticky top-0">
                <TableHead>Titulo</TableHead>
                <TableHead className="hidden md:table-cell">RA</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materiales.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="font-medium text-foreground">
                    {ev.titulo}{" "}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Apoyo
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {ev.resultado_aprendizaje}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {ev.fecha}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(ev)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ catId: selectedCatId, evId: ev.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? "Editar Material de Apoyo" : "Nuevo Material de Apoyo"}
        description={`Categoria: ${categoriaSeleccionada?.nombre || "-"}`}
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Actualizar" : "Crear"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="mat-titulo">Titulo</Label>
          <Input
            id="mat-titulo"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mat-desc">Descripcion</Label>
          <Textarea
            id="mat-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mat-tipo">Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm({ ...form, tipo: v as TipoEvidencia })}
            >
              <SelectTrigger id="mat-tipo">
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
            <Label htmlFor="mat-fecha">Fecha</Label>
            <Input
              id="mat-fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mat-ra">Resultado de Aprendizaje</Label>
          <Select
            value={form.resultado_aprendizaje}
            onValueChange={(v) => setForm({ ...form, resultado_aprendizaje: v })}
          >
            <SelectTrigger id="mat-ra">
              <SelectValue placeholder="Selecciona RA" />
            </SelectTrigger>
            <SelectContent>
              {raDisponibles.map((ra) => (
                <SelectItem key={ra.id} value={`${ra.codigo} - ${ra.descripcion}`}>
                  {ra.codigo} - {ra.descripcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mat-url">URL</Label>
          <Input
            id="mat-url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://..."
            required
          />
        </div>
      </EntityFormDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar material de apoyo</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

