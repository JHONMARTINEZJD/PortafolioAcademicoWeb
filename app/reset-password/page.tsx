"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function ResetPasswordContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => params.get("token") || "", [params])

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle")
  const [message, setMessage] = useState("")

  const submit = async () => {
    if (!token) {
      setStatus("error")
      setMessage("Token no valido.")
      return
    }
    if (newPassword.length < 8) {
      setStatus("error")
      setMessage("La contrasena debe tener al menos 8 caracteres.")
      return
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setStatus("error")
      setMessage("La contrasena debe incluir letras y numeros.")
      return
    }
    if (newPassword !== confirmPassword) {
      setStatus("error")
      setMessage("Las contrasenas no coinciden.")
      return
    }

    setStatus("loading")
    setMessage("")
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setStatus("error")
        setMessage(
          body?.error === "invalid_or_expired_token"
            ? "El enlace es invalido o ya vencio."
            : "No se pudo restablecer la contrasena."
        )
        return
      }
      setStatus("ok")
      setMessage("Contrasena actualizada. Ahora puedes iniciar sesion.")
    } catch {
      setStatus("error")
      setMessage("Error de red al actualizar la contrasena.")
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Restablecer contrasena</CardTitle>
          <CardDescription>
            Ingresa una nueva contrasena para tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Nueva contrasena</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contrasena</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contrasena"
            />
          </div>
          {message && (
            <p
              className={`text-sm ${status === "ok" ? "text-green-600" : "text-destructive"}`}
            >
              {message}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
              Volver
            </Button>
            <Button className="flex-1" onClick={() => void submit()} disabled={status === "loading"}>
              {status === "loading" ? "Guardando..." : "Actualizar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Restablecer contrasena</CardTitle>
              <CardDescription>Cargando formulario...</CardDescription>
            </CardHeader>
          </Card>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
