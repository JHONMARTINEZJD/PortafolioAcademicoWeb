"use client"

import { useEffect, useMemo, useState } from "react"
import type { AsistenciaRegistro, Estudiante } from "@/lib/types"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"

interface AsistenciaManagerProps {
  instructores: Estudiante[]
  aprendices: Estudiante[]
  asistencias: AsistenciaRegistro[]
  enabled: boolean
  currentInstructorId?: string | null
  isAdmin?: boolean
  canExportConsolidado?: boolean
  fichaCodigo?: string
  onGuardar: (instructorId: string, fecha: string, presentes: string[]) => void
  onEliminar: (asistenciaId: string) => void
}

export function AsistenciaManager({
  instructores,
  aprendices,
  asistencias,
  enabled,
  currentInstructorId = null,
  isAdmin = false,
  canExportConsolidado = false,
  fichaCodigo = "",
  onGuardar,
  onEliminar,
}: AsistenciaManagerProps) {
  const [instructorId, setInstructorId] = useState<string>(
    currentInstructorId || instructores[0]?.id || ""
  )
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0])
  const [presentes, setPresentes] = useState<string[]>([])
  const registroActual = useMemo(
    () => asistencias.find((a) => a.instructor_id === instructorId && a.fecha === fecha),
    [asistencias, instructorId, fecha]
  )
  const [mesExport, setMesExport] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    setPresentes([])
  }, [fecha, instructorId])

  const togglePresente = (id: string) => {
    setPresentes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const guardar = () => {
    if (!instructorId || !fecha) return
    if (!enabled) {
      toast.error("Asistencia global deshabilitada")
      return
    }
    onGuardar(instructorId, fecha, presentes)
    toast.success("Asistencia guardada")
  }

  const exportarMes = () => {
    if (!mesExport) return
    if (!(isAdmin || canExportConsolidado)) {
      toast.error("Solo un instructor gestor de ficha puede exportar consolidado mensual")
      return
    }

    const registrosMes = asistencias.filter((a) => a.fecha.startsWith(mesExport))
    if (registrosMes.length === 0) {
      toast.error("No hay registros de asistencia para ese mes")
      return
    }

    const fechas = Array.from(new Set(registrosMes.map((a) => a.fecha))).sort()
    const headers = ["Nombre", "Correo", "Documento", "Telefono", ...fechas]
    const rows = aprendices
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((ap) => {
        const porFecha = fechas.map((fechaActual) => {
          const vino = registrosMes.some(
            (r) => r.fecha === fechaActual && r.presentes.includes(ap.id)
          )
          return vino ? "Asistio" : "No asistio"
        })
        return [ap.nombre, ap.correo, ap.documento, ap.telefono, ...porFecha]
      })

    const escapeCsv = (value: string) => {
      const text = value ?? ""
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell || "")).join(","))
      .join("\n")

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `asistencia-${fichaCodigo || "ficha"}-${mesExport}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Exportacion mensual generada")
  }

  return (
    <div className="flex flex-col gap-4 min-h-0 flex-1">
      <div>
        <h3 className="text-lg font-semibold">Asistencia</h3>
        <p className="text-sm text-muted-foreground">
          Registra asistencia por fecha segun cronograma del instructor.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex flex-col gap-2">
          <Label>Instructor</Label>
          <Select
            value={instructorId}
            onValueChange={setInstructorId}
            disabled={!isAdmin && !!currentInstructorId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona instructor" />
            </SelectTrigger>
            <SelectContent>
              {instructores.map((ins) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={guardar} className="w-full" disabled={!enabled}>
            Guardar
          </Button>
        </div>
      </div>
      {(isAdmin || canExportConsolidado) && (
        <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2 sm:w-56">
            <Label>Exportar mes</Label>
            <Input
              type="month"
              value={mesExport}
              onChange={(e) => setMesExport(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportarMes}>
            Exportar consolidado CSV
          </Button>
        </div>
      )}

      {!enabled ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          El modulo de asistencia esta deshabilitado globalmente.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 min-h-0 flex-1">
          <ScrollArea className="border rounded-lg p-3">
            <p className="mb-3 text-sm font-medium">Lista de aprendices</p>
            <div className="space-y-2">
              {aprendices.map((ap) => (
                <label key={ap.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={presentes.includes(ap.id)}
                    onChange={() => togglePresente(ap.id)}
                  />
                  <span>{ap.nombre}</span>
                </label>
              ))}
            </div>
          </ScrollArea>

          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Resumen del dia</p>
            <div className="text-sm text-muted-foreground">
              Fecha: <span className="text-foreground">{fecha}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Presentes registrados:{" "}
              <span className="text-foreground">
                {registroActual?.presentes.length || 0} / {aprendices.length}
              </span>
            </div>
            {registroActual && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onEliminar(registroActual.id)}
              >
                Eliminar registro de esta fecha
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
