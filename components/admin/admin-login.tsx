"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminLoginProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AdminLogin({
  open,
  onClose,
  onSuccess,
}: AdminLoginProps) {
  const { login } = useAuth()
  const [identifier, setIdentifier] = useState("")
  const [clave, setClave] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("")
  const [recoverySending, setRecoverySending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setIdentifier("")
      setClave("")
      setError(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(identifier, clave)

    if (ok) {
      setIdentifier("")
      setClave("")
      setError(false)
      onSuccess()
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setClave("")
      inputRef.current?.focus()
    }
  }

  const handleRecovery = async () => {
    const username = recoveryIdentifier.trim() || identifier.trim()
    if (!username) {
      setError(true)
      return
    }
    setRecoverySending(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      setRecoveryOpen(false)
      setRecoveryIdentifier("")
    } finally {
      setRecoverySending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-card">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-card-foreground">
            Acceso al Sistema
          </DialogTitle>
          <DialogDescription>
            Ingresa con correo, documento o usuario y tu contrasena.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="login-id">Correo / Documento / Usuario</Label>
            <Input
              ref={inputRef}
              id="login-id"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value.trim())
                setError(false)
              }}
              placeholder="correo@dominio.com o documento"
              className={cn(shake && "animate-shake", error && "border-destructive")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ins-pass">Contrasena</Label>
            <Input
              id="ins-pass"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Contrasena"
              className={cn(shake && "animate-shake", error && "border-destructive")}
            />
            {error && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                Credencial incorrecta, intenta de nuevo
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!identifier || clave.length < 4}
            >
              Ingresar
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={() => setRecoveryOpen(true)}
          >
            Olvide mi contrasena
          </Button>

        </form>

        {recoveryOpen && (
          <div className="mt-2 rounded-md border p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Se enviara un enlace de recuperacion al correo asociado.
            </p>
            <Input
              value={recoveryIdentifier}
              onChange={(e) => setRecoveryIdentifier(e.target.value)}
              placeholder="correo/documento/usuario"
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRecoveryOpen(false)
                  setRecoveryIdentifier("")
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => void handleRecovery()}
                disabled={recoverySending}
              >
                {recoverySending ? "Enviando..." : "Enviar enlace"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
