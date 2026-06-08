"use client"

import { useMemo, useState } from "react"
import type { Estudiante } from "@/lib/types"
import { EntityFormDialog } from "./entity-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

interface EstudiantesManagerProps {
  estudiantes: Estudiante[]
  onAdd: (est: Omit<Estudiante, "id">) => void
  onUpdate: (id: string, est: Partial<Estudiante>) => void
  onDelete: (id: string) => void
}

const emptyForm: Omit<Estudiante, "id"> = {
  nombre: "",
  correo: "",
  documento: "",
  telefono: "",
  rol: "aprendiz",
  usuario: "",
  clave: "",
  es_vocero: false,
  es_gestor_ficha: false,
}

export function EstudiantesManager({
  estudiantes,
  onAdd,
  onUpdate,
  onDelete,
}: EstudiantesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState("")
  const [rolFiltro, setRolFiltro] = useState<"todos" | "aprendiz" | "instructor" | "admin">("todos")

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (est: Estudiante) => {
    setForm({
      nombre: est.nombre,
      correo: est.correo,
      documento: est.documento,
      telefono: est.telefono,
      rol: est.rol,
      usuario: est.usuario || "",
      clave: est.clave || "",
      es_vocero: Boolean(est.es_vocero),
      es_gestor_ficha: Boolean(est.es_gestor_ficha),
    })
    setEditingId(est.id)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.correo.trim()) return
    if (
      (form.rol === "instructor" || form.rol === "aprendiz") &&
      (!form.usuario?.trim() || !form.clave?.trim())
    ) {
      toast.error(
        "Para aprendiz e instructor, usuario y contrasena son obligatorios"
      )
      return
    }

    if (editingId) {
      onUpdate(editingId, form)
      toast.success("Estudiante actualizado correctamente")
    } else {
      onAdd(form)
      toast.success("Estudiante agregado correctamente")
    }
    setDialogOpen(false)
  }

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId)
      toast.success("Estudiante eliminado")
      setDeleteId(null)
    }
  }

  const estudiantesFiltrados = useMemo(() => {
    return estudiantes.filter((est) => {
      const matchRol = rolFiltro === "todos" ? true : est.rol === rolFiltro
      const text =
        `${est.nombre} ${est.correo} ${est.documento} ${est.usuario || ""}`.toLowerCase()
      const matchSearch = search.trim()
        ? text.includes(search.trim().toLowerCase())
        : true
      return matchRol && matchSearch
    })
  }, [estudiantes, rolFiltro, search])

  const resumen = useMemo(() => {
    const aprendices = estudiantes.filter((e) => e.rol === "aprendiz").length
    const instructores = estudiantes.filter((e) => e.rol === "instructor").length
    const admins = estudiantes.filter((e) => e.rol === "admin").length
    const conCredenciales = estudiantes.filter(
      (e) => e.rol === "admin" || (Boolean(e.usuario) && Boolean(e.clave))
    ).length
    return { aprendices, instructores, admins, conCredenciales }
  }, [estudiantes])

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Estudiantes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los aprendices del programa.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, documento o usuario"
        />
        <Select value={rolFiltro} onValueChange={(v) => setRolFiltro(v as typeof rolFiltro)}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            <SelectItem value="aprendiz">Aprendiz</SelectItem>
            <SelectItem value="instructor">Instructor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-muted-foreground">
          Mostrando {estudiantesFiltrados.length} de {estudiantes.length}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Aprendices</p>
          <p className="text-xl font-semibold">{resumen.aprendices}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Instructores</p>
          <p className="text-xl font-semibold">{resumen.instructores}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Admins</p>
          <p className="text-xl font-semibold">{resumen.admins}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Con credenciales</p>
          <p className="text-xl font-semibold">{resumen.conCredenciales}</p>
        </div>
      </div>

      {estudiantesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <UserPlus className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {estudiantes.length === 0
              ? "No hay estudiantes registrados"
              : "No hay resultados para los filtros aplicados"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden">
          <div className="rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 sticky top-0">
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden sm:table-cell">Correo</TableHead>
                  <TableHead className="hidden md:table-cell">Documento</TableHead>
                  <TableHead className="hidden lg:table-cell">Usuario</TableHead>
                  <TableHead className="hidden md:table-cell">Telefono</TableHead>
                  <TableHead className="hidden lg:table-cell">Vocero</TableHead>
                  <TableHead className="hidden lg:table-cell">Gestor ficha</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estudiantesFiltrados.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-medium text-foreground">
                      {est.nombre}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {est.correo}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {est.documento || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {est.rol === "admin" ? "-" : est.usuario || "-"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {est.telefono || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {est.rol === "aprendiz" ? (est.es_vocero ? "Si" : "No") : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {est.rol === "instructor" ? (est.es_gestor_ficha ? "Si" : "No") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={est.rol === "admin" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {est.rol === "admin"
                          ? "Admin"
                          : est.rol === "instructor"
                            ? "Instructor"
                            : "Aprendiz"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(est)}
                          aria-label={`Editar ${est.nombre}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(est.id)}
                          aria-label={`Eliminar ${est.nombre}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      )}

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? "Editar Estudiante" : "Nuevo Estudiante"}
        description="Completa la informacion del estudiante."
        onSubmit={handleSubmit}
        submitLabel={editingId ? "Actualizar" : "Agregar"}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="est-nombre">Nombre completo</Label>
          <Input
            id="est-nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Juan Carlos Martinez"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="est-correo">Correo electronico</Label>
          <Input
            id="est-correo"
            type="email"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            placeholder="usuario@misena.edu.co"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="est-doc">Documento</Label>
            <Input
              id="est-doc"
              value={form.documento}
              onChange={(e) =>
                setForm({ ...form, documento: e.target.value.replace(/\D/g, "") })
              }
              placeholder="1012345678"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="est-tel">Telefono</Label>
            <Input
              id="est-tel"
              value={form.telefono}
              onChange={(e) =>
                setForm({ ...form, telefono: e.target.value.replace(/\D/g, "") })
              }
              placeholder="3101234567"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="est-rol">Rol</Label>
          <Select
            value={form.rol}
            onValueChange={(v) =>
              setForm({
                ...form,
                rol: v as "aprendiz" | "admin" | "instructor",
                es_vocero: v === "aprendiz" ? form.es_vocero : false,
                es_gestor_ficha: v === "instructor" ? form.es_gestor_ficha : false,
              })
            }
          >
            <SelectTrigger id="est-rol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aprendiz">Aprendiz</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(form.rol === "instructor" || form.rol === "aprendiz") && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="est-usuario">
                Usuario {form.rol === "instructor" ? "instructor" : "aprendiz"}
              </Label>
              <Input
                id="est-usuario"
                value={form.usuario || ""}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                placeholder={
                  form.rol === "instructor"
                    ? "usuario.instructor"
                    : "usuario.aprendiz"
                }
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="est-clave">
                Contrasena {form.rol === "instructor" ? "instructor" : "aprendiz"}
              </Label>
              <Input
                id="est-clave"
                type="password"
                value={form.clave || ""}
                onChange={(e) => setForm({ ...form, clave: e.target.value })}
                placeholder="Minimo 4 caracteres"
                required
              />
            </div>
          </div>
        )}
        {form.rol === "aprendiz" && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Elevacion vocero</p>
              <p className="text-xs text-muted-foreground">
                Habilita gestion de fechas para aseo del salon.
              </p>
            </div>
            <Switch
              checked={Boolean(form.es_vocero)}
              onCheckedChange={(checked) =>
                setForm({ ...form, es_vocero: checked })
              }
            />
          </div>
        )}
        {form.rol === "instructor" && (
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Elevacion gestor de ficha</p>
              <p className="text-xs text-muted-foreground">
                Permite exportar asistencia mensual consolidada.
              </p>
            </div>
            <Switch
              checked={Boolean(form.es_gestor_ficha)}
              onCheckedChange={(checked) =>
                setForm({ ...form, es_gestor_ficha: checked })
              }
            />
          </div>
        )}
      </EntityFormDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar estudiante</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. El estudiante sera eliminado permanentemente.
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
