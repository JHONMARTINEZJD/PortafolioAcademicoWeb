"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

interface CambiarCredencialesDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: {
    usuarioActual: string
    claveActual: string
    nuevoUsuario: string
    nuevaClave: string
  }) => boolean
}

const emptyForm = {
  usuarioActual: "",
  claveActual: "",
  nuevoUsuario: "",
  nuevaClave: "",
  confirmarNuevaClave: "",
}

export function CambiarCredencialesDialog({
  open,
  onClose,
  onSubmit,
}: CambiarCredencialesDialogProps) {
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (open) setForm(emptyForm)
  }, [open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.usuarioActual.trim() ||
      !form.claveActual.trim() ||
      !form.nuevoUsuario.trim() ||
      !form.nuevaClave.trim()
    ) {
      toast.error("Completa todos los campos")
      return
    }
    if (form.nuevaClave.length < 4) {
      toast.error("La nueva contrasena debe tener al menos 4 caracteres")
      return
    }
    if (form.nuevaClave !== form.confirmarNuevaClave) {
      toast.error("La confirmacion de contrasena no coincide")
      return
    }

    const ok = onSubmit({
      usuarioActual: form.usuarioActual.trim(),
      claveActual: form.claveActual,
      nuevoUsuario: form.nuevoUsuario.trim(),
      nuevaClave: form.nuevaClave,
    })

    if (!ok) {
      toast.error("Credenciales actuales invalidas")
      return
    }

    toast.success("Credenciales actualizadas")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Credenciales</DialogTitle>
          <DialogDescription>
            Actualiza tu usuario y contrasena de acceso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cred-user-current">Usuario actual</Label>
            <Input
              id="cred-user-current"
              value={form.usuarioActual}
              onChange={(e) =>
                setForm({ ...form, usuarioActual: e.target.value })
              }
              placeholder="usuario.actual"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cred-pass-current">Contrasena actual</Label>
            <Input
              id="cred-pass-current"
              type="password"
              value={form.claveActual}
              onChange={(e) => setForm({ ...form, claveActual: e.target.value })}
              placeholder="Contrasena actual"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cred-user-new">Nuevo usuario</Label>
            <Input
              id="cred-user-new"
              value={form.nuevoUsuario}
              onChange={(e) => setForm({ ...form, nuevoUsuario: e.target.value })}
              placeholder="nuevo.usuario"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cred-pass-new">Nueva contrasena</Label>
            <Input
              id="cred-pass-new"
              type="password"
              value={form.nuevaClave}
              onChange={(e) => setForm({ ...form, nuevaClave: e.target.value })}
              placeholder="Nueva contrasena"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cred-pass-new-confirm">Confirmar nueva contrasena</Label>
            <Input
              id="cred-pass-new-confirm"
              type="password"
              value={form.confirmarNuevaClave}
              onChange={(e) =>
                setForm({ ...form, confirmarNuevaClave: e.target.value })
              }
              placeholder="Repite la nueva contrasena"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

