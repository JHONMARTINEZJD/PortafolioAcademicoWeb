"use client"

import { useMemo, useState } from "react"
import type { Categoria, Competencia } from "@/lib/types"
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
  FolderPlus,
  FileText,
  Users,
  Calculator,
  Briefcase,
  Rocket,
  BookOpen,
  Globe,
  Landmark,
  ShieldCheck,
  Heart,
} from "lucide-react"
import { toast } from "sonner"

const iconOptions = [
  { value: "file-text", label: "Documento", Icon: FileText },
  { value: "users", label: "Usuarios", Icon: Users },
  { value: "calculator", label: "Calculadora", Icon: Calculator },
  { value: "briefcase", label: "Maletin", Icon: Briefcase },
  { value: "rocket", label: "Cohete", Icon: Rocket },
  { value: "book-open", label: "Libro", Icon: BookOpen },
  { value: "globe", label: "Globo", Icon: Globe },
  { value: "landmark", label: "Institucion", Icon: Landmark },
  { value: "shield-check", label: "Seguridad", Icon: ShieldCheck },
  { value: "heart", label: "Bienestar", Icon: Heart },
]

const iconMap: Record<string, React.ElementType> = Object.fromEntries(
  iconOptions.map((o) => [o.value, o.Icon])
)

interface CategoriasManagerProps {
  categorias: Categoria[]
  competencias: Competencia[]
  onAdd: (cat: Omit<Categoria, "id" | "evidencias">) => void
  onUpdate: (id: string, cat: Partial<Omit<Categoria, "evidencias">>) => void
  onDelete: (id: string) => void
}

const emptyForm = {
  nombre: "",
  descripcion: "",
  icono: "file-text",
  competencia_id: "",
}

export function CategoriasManager({
  categorias,
  competencias,
  onAdd,
  onUpdate,
  onDelete,
}: CategoriasManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [competenciaFiltro, setCompetenciaFiltro] = useState("todas")

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (cat: Categoria) => {
    setForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      icono: cat.icono,
      competencia_id: cat.competencia_id || "",
    })
    setEditingId(cat.id)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.competencia_id) {
      toast.error("Nombre y competencia son obligatorios")
      return
    }

    if (editingId) {
      onUpdate(editingId, form)
      toast.success("Categoria actualizada")
    } else {
      onAdd(form)
      toast.success("Categoria creada")
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id)
      toast.success("Categoria eliminada")
      setDeleteTarget(null)
    }
  }

  const categoriasFiltradas = useMemo(() => {
    return categorias.filter((cat) => {
      const matchComp =
        competenciaFiltro === "todas" ? true : cat.competencia_id === competenciaFiltro
      const text = `${cat.nombre} ${cat.descripcion}`.toLowerCase()
      const matchSearch = search.trim()
        ? text.includes(search.trim().toLowerCase())
        : true
      return matchComp && matchSearch
    })
  }, [categorias, competenciaFiltro, search])

  const resumen = useMemo(() => {
    const totalEvidencias = categorias.reduce((acc, cat) => acc + cat.evidencias.length, 0)
    const sinCompetencia = categorias.filter((cat) => !cat.competencia_id).length
    return {
      totalCategorias: categorias.length,
      totalEvidencias,
      sinCompetencia,
      competenciasAsignables: competencias.length,
    }
  }, [categorias, competencias.length])

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Categorias
          </h3>
          <p className="text-sm text-muted-foreground">
            Organiza las evidencias en categorias tematicas.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nueva
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o descripcion"
        />
        <Select value={competenciaFiltro} onValueChange={setCompetenciaFiltro}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por competencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las competencias</SelectItem>
            {competencias.map((comp) => (
              <SelectItem key={comp.id} value={comp.id}>
                {comp.codigo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-muted-foreground">
          Mostrando {categoriasFiltradas.length} de {categorias.length}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Categorias</p>
          <p className="text-xl font-semibold">{resumen.totalCategorias}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Evidencias asociadas</p>
          <p className="text-xl font-semibold">{resumen.totalEvidencias}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Sin competencia</p>
          <p className="text-xl font-semibold">{resumen.sinCompetencia}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Competencias disponibles</p>
          <p className="text-xl font-semibold">{resumen.competenciasAsignables}</p>
        </div>
      </div>

      {categoriasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <FolderPlus className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {categorias.length === 0
              ? "No hay categorias creadas"
              : "No hay resultados para los filtros aplicados"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
          <div className="rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0">
                  <TableHead className="w-12">Icono</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">Descripcion</TableHead>
                  <TableHead className="hidden lg:table-cell">Competencia</TableHead>
                  <TableHead className="w-24 text-center">Evidencias</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriasFiltradas.map((cat) => {
                  const Icon = iconMap[cat.icono] || FileText
                  return (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {cat.nombre}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {cat.descripcion}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {competencias.find((c) => c.id === cat.competencia_id)?.codigo || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{cat.evidencias.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(cat)}
                            aria-label={`Editar ${cat.nombre}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(cat)}
                            aria-label={`Eliminar ${cat.nombre}`}
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
        title={editingId ? "Editar Categoria" : "Nueva Categoria"}
        description="Define una categoria para agrupar evidencias."
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Actualizar" : "Crear"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input
            id="cat-nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Gestion Documental"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cat-desc">Descripcion</Label>
          <Textarea
            id="cat-desc"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Describe brevemente el contenido de esta categoria..."
            rows={3}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cat-icono">Icono</Label>
          <Select
            value={form.icono}
            onValueChange={(v) => setForm({ ...form, icono: v })}
          >
            <SelectTrigger id="cat-icono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <opt.Icon className="h-4 w-4" />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cat-comp">Competencia asociada</Label>
          <Select
            value={form.competencia_id}
            onValueChange={(v) => setForm({ ...form, competencia_id: v })}
          >
            <SelectTrigger id="cat-comp">
              <SelectValue placeholder="Selecciona competencia" />
            </SelectTrigger>
            <SelectContent>
              {competencias.map((comp) => (
                <SelectItem key={comp.id} value={comp.id}>
                  {comp.codigo} - {comp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </EntityFormDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.evidencias.length > 0
                ? `Esta categoria tiene ${deleteTarget.evidencias.length} evidencia(s) asociada(s). Al eliminarla, tambien se perderan todas sus evidencias.`
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
