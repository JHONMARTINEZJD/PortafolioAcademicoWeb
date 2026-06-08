"use client"

import { useMemo, useState } from "react"
import type { AseoConfig, Estudiante } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"

interface AseoSalonPanelProps {
  enabled: boolean
  aseo: AseoConfig
  aprendices: Estudiante[]
  isVocero: boolean
  onProgramarMes: (mes: string, fechas: string[]) => void
}

export function AseoSalonPanel({
  enabled,
  aseo,
  aprendices,
  isVocero,
  onProgramarMes,
}: AseoSalonPanelProps) {
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  const [mes, setMes] = useState(mesActual)
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState<Date[]>([])
  const [yearMes, monthMes] = mes.split("-").map(Number)

  const estudiantesById = useMemo(
    () => new Map(aprendices.map((a) => [a.id, a.nombre])),
    [aprendices]
  )

  const calendarioMes = aseo.meses.find((m) => m.mes === mes)
  const asignacionesPorFecha = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const asig of calendarioMes?.asignaciones || []) {
      const nombre = estudiantesById.get(asig.estudiante_id) || "Aprendiz"
      if (!grouped.has(asig.fecha)) grouped.set(asig.fecha, [])
      grouped.get(asig.fecha)!.push(nombre)
    }
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [calendarioMes?.asignaciones, estudiantesById])

  const dateToYmd = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  const programar = () => {
    const fechas = Array.from(
      new Set(
        fechasSeleccionadas
          .map((f) => dateToYmd(f))
          .filter(Boolean)
          .sort()
      )
    )
    if (!mes || fechas.length === 0) {
      toast.error("Define mes y selecciona al menos una fecha de formacion")
      return
    }
    onProgramarMes(mes, fechas)
    toast.success("Turnos de aseo generados")
  }

  if (!enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aseo del Salon</CardTitle>
          <CardDescription>Este modulo esta deshabilitado por administracion.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aseo del Salon</CardTitle>
        <CardDescription>
          Orden aleatorio con dos aprendices por dia, sin repetir hasta que todos hayan pasado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isVocero && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fechas de formacion</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    {fechasSeleccionadas.length > 0
                      ? `${fechasSeleccionadas.length} fecha(s) seleccionadas`
                      : "Seleccionar fechas en calendario"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={fechasSeleccionadas}
                    onSelect={(dates) => setFechasSeleccionadas((dates as Date[]) || [])}
                    disabled={(date) =>
                      date.getFullYear() !== yearMes || date.getMonth() + 1 !== monthMes
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2">
              <Button onClick={programar}>Generar turnos del mes</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Calendario de aseo ({mes})</p>
            <Badge variant="outline">{asignacionesPorFecha.length || 0} dias</Badge>
          </div>
          {asignacionesPorFecha.length ? (
            <div className="grid gap-2">
              {asignacionesPorFecha.map(([fecha, nombres]) => (
                <div
                  key={fecha}
                  className="rounded-md border px-3 py-2"
                >
                  <p className="text-sm font-medium">{fecha}</p>
                  <p className="text-sm text-muted-foreground">
                    {nombres.join(" y ")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aun no hay turnos generados para este mes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
