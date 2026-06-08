"use client"

import { useState, useRef, useEffect } from "react"
import type { ConfiguracionPortafolio } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  KeyRound,
  Building2,
} from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface ConfiguracionManagerProps {
  configuracion: ConfiguracionPortafolio
  onUpdate: (config: Partial<ConfiguracionPortafolio>) => void
  onExport: () => string
  onImport: (json: string) => boolean
  onReset: () => void
  onToggleAseo?: (enabled: boolean) => void
  onToggleAsistencia?: (enabled: boolean) => void
  onClearAseoMonth?: (mes: string) => void
  onManualBackup?: () => Promise<boolean> | boolean
  onTestPostgres?: () => Promise<boolean> | boolean
  syncInfo?: {
    lastBackupAt: string | null
    lastSyncAt: string | null
    lastPullAt: string | null
    lastError: string | null
  }
}

export function ConfiguracionManager({
  configuracion,
  onUpdate,
  onExport,
  onImport,
  onReset,
  onToggleAseo,
  onToggleAsistencia,
  onClearAseoMonth,
  onManualBackup,
  onTestPostgres,
  syncInfo,
}: ConfiguracionManagerProps) {
  const { changePin } = useAuth()
  const [config, setConfig] = useState(configuracion)
  const [pinForm, setPinForm] = useState({
    oldPin: "",
    newPin: "",
    confirmPin: "",
  })
  const [resetOpen, setResetOpen] = useState(false)
  const [mesAseo, setMesAseo] = useState(new Date().toISOString().slice(0, 7))
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setConfig(configuracion)
  }, [configuracion])

  const handleSaveConfig = () => {
    onUpdate(config)
    toast.success("Configuracion guardada")
  }

  const handleChangePin = async () => {
    if (pinForm.newPin.length < 8) {
      toast.error("La nueva contrasena debe tener al menos 8 caracteres")
      return
    }
    if (!/[A-Za-z]/.test(pinForm.newPin) || !/\d/.test(pinForm.newPin)) {
      toast.error("La nueva contrasena debe incluir letras y numeros")
      return
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error("Las contrasenas no coinciden")
      return
    }
    if (await changePin(pinForm.oldPin, pinForm.newPin)) {
      toast.success("Contrasena actualizada correctamente")
      setPinForm({ oldPin: "", newPin: "", confirmPin: "" })
    } else {
      toast.error("Contrasena actual incorrecta")
    }
  }

  const handleExport = () => {
    const json = onExport()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `portafolio-sena-${configuracion.ficha}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Datos exportados correctamente")
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const json = event.target?.result as string
      if (onImport(json)) {
        toast.success("Datos importados correctamente")
      } else {
        toast.error("El archivo no tiene el formato correcto")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleReset = () => {
    onReset()
    toast.success("Datos restaurados a valores iniciales")
    setResetOpen(false)
    // Reload config from seed
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <ScrollArea className="flex-1 border border-border rounded-lg overflow-hidden -mx-4 md:-mx-6">
      <div className="flex flex-col gap-6 px-4 py-6 md:px-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Configuracion General
          </h3>
          <p className="text-sm text-muted-foreground">
            Ajusta los datos institucionales, seguridad y gestion de datos.
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-card-foreground">
              Estado Operativo de la Ficha
            </CardTitle>
            <CardDescription>
              Resumen rapido de modulos y reglas activas para control administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Asistencia</p>
              <p className="text-sm font-semibold">
                {config.asistencia_habilitada ? "Activa" : "Inactiva"}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Alertas</p>
              <p className="text-sm font-semibold">
                {config.alertas_habilitadas ? "Activas" : "Inactivas"}
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">SLA revision</p>
              <p className="text-sm font-semibold">
                {config.sla_revision_dias ?? 3} dias
              </p>
            </div>
            <div className="rounded-lg border px-3 py-2">
              <p className="text-xs text-muted-foreground">Minimo por RA</p>
              <p className="text-sm font-semibold">
                {config.minimo_evidencias_por_ra ?? 1}
              </p>
            </div>
          </CardContent>
        </Card>

      {/* Datos Institucionales */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-card-foreground">
              Datos Institucionales
            </CardTitle>
          </div>
          <CardDescription>
            Informacion del programa y centro de formacion.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-inst">Institucion</Label>
              <Input
                id="cfg-inst"
                value={config.institucion}
                onChange={(e) =>
                  setConfig({ ...config, institucion: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-prog">Programa</Label>
              <Input
                id="cfg-prog"
                value={config.programa}
                onChange={(e) =>
                  setConfig({ ...config, programa: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-ficha">Numero de Ficha</Label>
              <Input
                id="cfg-ficha"
                value={config.ficha}
                onChange={(e) =>
                  setConfig({ ...config, ficha: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-centro">Centro de Formacion</Label>
              <Input
                id="cfg-centro"
                value={config.centro_formacion}
                onChange={(e) =>
                  setConfig({ ...config, centro_formacion: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-jornada">Jornada</Label>
              <Input
                id="cfg-jornada"
                value={config.jornada}
                onChange={(e) =>
                  setConfig({ ...config, jornada: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-instr">Instructor Lider</Label>
              <Input
                id="cfg-instr"
                value={config.instructor_lider}
                onChange={(e) =>
                  setConfig({ ...config, instructor_lider: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-corte">Fecha corte evidencias</Label>
              <Input
                id="cfg-corte"
                type="date"
                value={config.fecha_corte_evidencias || ""}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    fecha_corte_evidencias: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-sla">SLA revision (dias)</Label>
              <Input
                id="cfg-sla"
                type="number"
                min={1}
                max={60}
                value={config.sla_revision_dias ?? 3}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    sla_revision_dias: Math.min(60, Math.max(1, Number(e.target.value) || 3)),
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-min-ra">Minimo evidencias por RA</Label>
              <Input
                id="cfg-min-ra"
                type="number"
                min={0}
                max={20}
                value={config.minimo_evidencias_por_ra ?? 1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    minimo_evidencias_por_ra: Math.min(20, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveConfig} size="sm" className="gap-1.5">
              <Save className="h-4 w-4" />
              Guardar cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cambiar Contrasena */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <CardTitle className="text-base text-card-foreground">
              Seguridad
            </CardTitle>
          </div>
          <CardDescription>
            Cambia la contrasena de acceso al panel de administracion.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin-old">Contrasena actual</Label>
              <Input
                id="pin-old"
                type="password"
                value={pinForm.oldPin}
                onChange={(e) =>
                  setPinForm({
                    ...pinForm,
                    oldPin: e.target.value,
                  })
                }
                placeholder="Contrasena actual"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin-new">Nueva contrasena</Label>
              <Input
                id="pin-new"
                type="password"
                value={pinForm.newPin}
                onChange={(e) =>
                  setPinForm({
                    ...pinForm,
                    newPin: e.target.value,
                  })
                }
                placeholder="Minimo 8 caracteres"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin-confirm">Confirmar contrasena</Label>
              <Input
                id="pin-confirm"
                type="password"
                value={pinForm.confirmPin}
                onChange={(e) =>
                  setPinForm({
                    ...pinForm,
                    confirmPin: e.target.value,
                  })
                }
                placeholder="Confirma la nueva contrasena"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleChangePin}
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={
                !pinForm.oldPin || !pinForm.newPin || !pinForm.confirmPin
              }
            >
              <KeyRound className="h-4 w-4" />
              Cambiar contrasena
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gestion de Datos */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-card-foreground">
            Conexion PostgreSQL (Hibrido)
          </CardTitle>
          <CardDescription>
            La sincronizacion usa la variable de entorno DATABASE_URL del servidor.
            Si la BD esta vacia, el esquema se crea automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await onTestPostgres?.()
                if (ok) {
                  toast.success("Conexion PostgreSQL valida")
                } else {
                  toast.error("No se pudo conectar a PostgreSQL")
                }
              }}
            >
              Probar conexion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gestion de Datos */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-card-foreground">
            Modulos Globales
          </CardTitle>
          <CardDescription>
            Activa o desactiva funcionalidades para la ficha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Asistencia</p>
                <p className="text-xs text-muted-foreground">
                  Visible para instructores cuando este habilitada.
                </p>
              </div>
              <Switch
                checked={Boolean(config.asistencia_habilitada)}
                onCheckedChange={(checked) => {
                  setConfig({ ...config, asistencia_habilitada: checked })
                  onToggleAsistencia?.(checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Aseo del salon</p>
                <p className="text-xs text-muted-foreground">
                  Visible para aprendices; editable solo por vocero.
                </p>
              </div>
              <Switch
                checked={Boolean(config.aseo_habilitado)}
                onCheckedChange={(checked) => {
                  setConfig({ ...config, aseo_habilitado: checked })
                  onToggleAseo?.(checked)
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Cronograma</p>
                <p className="text-xs text-muted-foreground">
                  Muestra eventos y agenda academica en dashboard.
                </p>
              </div>
              <Switch
                checked={Boolean(config.cronograma_habilitado)}
                onCheckedChange={(checked) => {
                  setConfig({ ...config, cronograma_habilitado: checked })
                  onUpdate({ cronograma_habilitado: checked })
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Alertas</p>
                <p className="text-xs text-muted-foreground">
                  Habilita notificaciones internas por rol.
                </p>
              </div>
              <Switch
                checked={Boolean(config.alertas_habilitadas)}
                onCheckedChange={(checked) => {
                  setConfig({ ...config, alertas_habilitadas: checked })
                  onUpdate({ alertas_habilitadas: checked })
                }}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Observador</p>
                <p className="text-xs text-muted-foreground">
                  Activa indicadores de riesgo y seguimiento.
                </p>
              </div>
              <Switch
                checked={Boolean(config.observador_habilitado)}
                onCheckedChange={(checked) => {
                  setConfig({ ...config, observador_habilitado: checked })
                  onUpdate({ observador_habilitado: checked })
                }}
              />
            </div>
            <div className="rounded-lg border px-3 py-3">
              <p className="text-sm font-medium">Reiniciar aseo mensual</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Borra la programacion del mes para que el vocero la genere de nuevo.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  type="month"
                  value={mesAseo}
                  onChange={(e) => setMesAseo(e.target.value)}
                  className="sm:w-56"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!mesAseo) return
                    onClearAseoMonth?.(mesAseo)
                    toast.success("Programacion de aseo eliminada para el mes seleccionado")
                  }}
                >
                  Limpiar mes
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestion de Datos */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-card-foreground">
            Gestion de Datos
          </CardTitle>
          <CardDescription>
            Exporta, importa o restaura los datos del portafolio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
              Exportar JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                const ok = await onManualBackup?.()
                if (ok) {
                  toast.success("Respaldo/sincronizacion ejecutada")
                } else {
                  toast.error("No se pudo ejecutar el respaldo")
                }
              }}
            >
              <Download className="h-4 w-4" />
              Respaldar ahora
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Importar JSON
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />

            <Separator orientation="vertical" className="h-8" />

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setResetOpen(true)}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar datos iniciales
            </Button>
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>
              Ultimo push a BD: {syncInfo?.lastBackupAt ? new Date(syncInfo.lastBackupAt).toLocaleString("es-CO") : "Sin datos"}
            </p>
            <p>
              Ultima sincronizacion servidor: {syncInfo?.lastSyncAt ? new Date(syncInfo.lastSyncAt).toLocaleString("es-CO") : "Sin datos"}
            </p>
            <p>
              Ultima lectura remota: {syncInfo?.lastPullAt ? new Date(syncInfo.lastPullAt).toLocaleString("es-CO") : "Sin datos"}
            </p>
            {syncInfo?.lastError && <p className="text-destructive">Error sync: {syncInfo.lastError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar datos iniciales</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminara TODOS los cambios realizados y restaurara el portafolio a sus datos originales. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ScrollArea>
  )
}
