"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { ConfiguracionPortafolio } from "@/lib/types"

interface AgregarFichaDialogProps {
  open: boolean
  onClose: () => void
  onAgregar: (config: ConfiguracionPortafolio) => void
  mode?: "crear" | "editar"
  initialConfig?: ConfiguracionPortafolio | null
}

const emptyForm: ConfiguracionPortafolio = {
  institucion: "SENA",
  programa: "",
  ficha: "",
  centro_formacion: "",
  jornada: "",
  instructor_lider: "",
}

export function AgregarFichaDialog({
  open,
  onClose,
  onAgregar,
  mode = "crear",
  initialConfig = null,
}: AgregarFichaDialogProps) {
  const [form, setForm] = useState<ConfiguracionPortafolio>(emptyForm)

  useEffect(() => {
    if (!open) return
    if (mode === "editar" && initialConfig) {
      setForm(initialConfig)
      return
    }
    setForm(emptyForm)
  }, [open, mode, initialConfig])

  const handleSubmit = () => {
    if (!form.programa.trim() || !form.ficha.trim()) {
      toast.error("Programa y número de ficha son requeridos")
      return
    }

    onAgregar(form)
    if (mode === "crear") {
      setForm(emptyForm)
    }
    onClose()
    toast.success(mode === "editar" ? "Ficha actualizada correctamente" : "Ficha creada correctamente")
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "editar" ? "Editar Ficha" : "Crear Nueva Ficha"}</DialogTitle>
          <DialogDescription>
            {mode === "editar"
              ? "Actualiza los datos del portafolio de ficha"
              : "Completa los datos para crear un nuevo portafolio de ficha"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="programa">Programa *</Label>
            <Input
              id="programa"
              placeholder="Ej: Contabilidad"
              value={form.programa}
              onChange={(e) => setForm({ ...form, programa: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ficha">Número de Ficha *</Label>
            <Input
              id="ficha"
              placeholder="Ej: 3370571"
              value={form.ficha}
              onChange={(e) => setForm({ ...form, ficha: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="institucion">Institución</Label>
            <Input
              id="institucion"
              placeholder="SENA"
              value={form.institucion}
              onChange={(e) => setForm({ ...form, institucion: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="centro">Centro de Formación</Label>
            <Input
              id="centro"
              placeholder="Centro de Comercio"
              value={form.centro_formacion}
              onChange={(e) =>
                setForm({ ...form, centro_formacion: e.target.value })
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="jornada">Jornada</Label>
            <Input
              id="jornada"
              placeholder="Diurna"
              value={form.jornada}
              onChange={(e) => setForm({ ...form, jornada: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="instructor">Instructor Líder</Label>
            <Input
              id="instructor"
              placeholder="Nombre del instructor"
              value={form.instructor_lider}
              onChange={(e) =>
                setForm({ ...form, instructor_lider: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {mode === "editar" ? "Guardar Cambios" : "Crear Ficha"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
