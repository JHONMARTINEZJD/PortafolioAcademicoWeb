"use client"

import { useEffect, useMemo, useState } from "react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Upload, FileText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Categoria, Competencia, TipoEvidencia } from "@/lib/types"

interface SubirEvidenciaPersonalProps {
  open: boolean
  onClose: () => void
  categorias: Categoria[]
  competencias: Competencia[]
  mode?: "crear" | "editar"
  initialData?: {
    titulo: string
    descripcion: string
    tipo: TipoEvidencia
    url: string
    categoriaId: string
    fecha: string
    competencia_id: string
    resultado_aprendizaje: string
  } | null
  onSubir: (datos: {
    titulo: string
    descripcion: string
    tipo: TipoEvidencia
    url: string
    categoriaId: string
    fecha: string
    competencia_id: string
    resultado_aprendizaje: string
  }) => void
  onEliminar?: () => void
}

const tiposEvidencia: { value: TipoEvidencia; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "imagen", label: "Imagen" },
  { value: "presentacion", label: "Presentación" },
]

export function SubirEvidenciaPersonal({
  open,
  onClose,
  categorias,
  competencias,
  mode = "crear",
  initialData = null,
  onSubir,
  onEliminar,
}: SubirEvidenciaPersonalProps) {
  const emptyForm = {
    titulo: "",
    descripcion: "",
    tipo: "pdf" as TipoEvidencia,
    url: "",
    categoriaId: "",
    fecha: new Date().toISOString().split("T")[0],
    competencia_id: "",
    resultado_aprendizaje: "",
  }

  const [form, setForm] = useState({
    ...emptyForm,
  })
  const [uploadMode, setUploadMode] = useState<"url" | "archivo">("url")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "editar" && initialData) {
      setForm(initialData)
      setUploadMode("url")
      setSelectedFile(null)
      return
    }
    setForm({ ...emptyForm })
    setUploadMode("url")
    setSelectedFile(null)
  }, [open, mode, initialData])

  const categoriaSeleccionada = useMemo(
    () => categorias.find((cat) => cat.id === form.categoriaId),
    [categorias, form.categoriaId]
  )

  const competenciaSeleccionada = useMemo(
    () =>
      competencias.find((comp) => comp.id === categoriaSeleccionada?.competencia_id),
    [competencias, categoriaSeleccionada]
  )

  const raDisponibles = competenciaSeleccionada?.resultados_aprendizaje || []

  useEffect(() => {
    if (!categoriaSeleccionada) {
      setForm((prev) => ({
        ...prev,
        competencia_id: "",
        resultado_aprendizaje: "",
      }))
      return
    }
    if (categoriaSeleccionada.competencia_id !== form.competencia_id) {
      setForm((prev) => ({
        ...prev,
        competencia_id: categoriaSeleccionada.competencia_id || "",
        resultado_aprendizaje: "",
      }))
    }
  }, [categoriaSeleccionada, form.competencia_id])

  const handleSubmit = async () => {
    if (
      !form.titulo.trim() ||
      !form.categoriaId ||
      !form.competencia_id ||
      !form.resultado_aprendizaje
    ) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    const categoria = categorias.find((cat) => cat.id === form.categoriaId)
    if (!categoria?.competencia_id) {
      toast.error("La categoria seleccionada no tiene competencia asociada")
      return
    }
    if (categoria.competencia_id !== form.competencia_id) {
      toast.error("Categoria y competencia no son consistentes")
      return
    }

    let resolvedUrl = form.url.trim()
    if (uploadMode === "archivo") {
      if (!selectedFile) {
        toast.error("Selecciona un archivo para subir")
        return
      }
      setIsUploading(true)
      try {
        const body = new FormData()
        body.set("file", selectedFile)
        const response = await fetch("/api/evidences/upload", {
          method: "POST",
          body,
        })
        if (!response.ok) {
          toast.error("No se pudo subir el archivo")
          return
        }
        const result = await response.json()
        if (!result?.url || typeof result.url !== "string") {
          toast.error("Respuesta de subida invalida")
          return
        }
        resolvedUrl = result.url
      } catch {
        toast.error("Error al subir el archivo")
        return
      } finally {
        setIsUploading(false)
      }
    } else if (!resolvedUrl) {
      toast.error("Completa el enlace de la evidencia")
      return
    }

    onSubir({ ...form, url: resolvedUrl })
    setForm({ ...emptyForm })
    setUploadMode("url")
    setSelectedFile(null)
    onClose()
    toast.success(
      mode === "editar"
        ? "Evidencia personal actualizada"
        : "Evidencia subida correctamente"
    )
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            {mode === "editar" ? "Editar Evidencia Personal" : "Subir Evidencia Personal"}
          </SheetTitle>
          <SheetDescription>
            Agrega tus propias evidencias al portafolio y asocialas a una competencia y RA.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Nombre de la evidencia"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              placeholder="Describe brevemente esta evidencia"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria">Categoría *</Label>
            <Select
              value={form.categoriaId}
              onValueChange={(val) => setForm({ ...form, categoriaId: val })}
            >
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="competencia">Competencia asociada</Label>
            <Input
              id="competencia"
              value={
                competenciaSeleccionada
                  ? `${competenciaSeleccionada.codigo} - ${competenciaSeleccionada.nombre}`
                  : ""
              }
              placeholder="Se define al elegir categoria"
              readOnly
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ra">Resultado de Aprendizaje *</Label>
            <Select
              value={form.resultado_aprendizaje}
              onValueChange={(val) =>
                setForm({ ...form, resultado_aprendizaje: val })
              }
              disabled={!competenciaSeleccionada}
            >
              <SelectTrigger id="ra">
                <SelectValue placeholder="Selecciona un RA" />
              </SelectTrigger>
              <SelectContent>
                {raDisponibles.map((ra) => (
                  <SelectItem
                    key={ra.id}
                    value={`${ra.codigo} - ${ra.descripcion}`}
                  >
                    {ra.codigo} - {ra.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tipo">Tipo de Archivo *</Label>
            <Select value={form.tipo} onValueChange={(val) => setForm({ ...form, tipo: val as TipoEvidencia })}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposEvidencia.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={uploadMode === "url" ? "default" : "outline"}
              onClick={() => setUploadMode("url")}
            >
              Enlace URL
            </Button>
            <Button
              type="button"
              variant={uploadMode === "archivo" ? "default" : "outline"}
              onClick={() => setUploadMode("archivo")}
            >
              Subir archivo
            </Button>
          </div>

          {uploadMode === "url" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">URL o enlace *</Label>
              <Input
                id="url"
                placeholder="https://ejemplo.com/evidencia"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="archivo">Archivo *</Label>
              <Input
                id="archivo"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.webm,.ppt,.pptx"
              />
              <p className="text-xs text-muted-foreground">
                Maximo 15MB. Formatos: PDF, imagen, video o presentacion.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>

          <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  💡 Consejos para subir evidencias
                </p>
                <ul className="space-y-1 text-xs">
                  <li>• Usa enlace URL o subida de archivo local</li>
                  <li>• Incluye una descripción clara</li>
                  <li>• Elige la categoría apropiada</li>
                  <li>• Asegúrate de que el archivo sea válido</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {mode === "editar" && onEliminar && (
              <Button
                variant="destructive"
                onClick={onEliminar}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="flex-1 gap-1.5" disabled={isUploading}>
              <Upload className="h-4 w-4" />
              {isUploading
                ? "Subiendo..."
                : mode === "editar"
                  ? "Guardar"
                  : "Subir"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
