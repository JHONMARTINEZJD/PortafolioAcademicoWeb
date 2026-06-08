"use client"

import { useState, useEffect } from "react"
import type { Evidencia } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Video,
  Image as ImageIcon,
  Presentation,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

const tipoConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  pdf: {
    icon: FileText,
    label: "PDF",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  video: {
    icon: Video,
    label: "Video",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  imagen: {
    icon: ImageIcon,
    label: "Imagen",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  presentacion: {
    icon: Presentation,
    label: "Presentacion",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
}

function useFormattedDate(fecha: string, options?: Intl.DateTimeFormatOptions) {
  const [formatted, setFormatted] = useState("")
  useEffect(() => {
    setFormatted(
      new Date(fecha).toLocaleDateString("es-CO", options ?? { year: "numeric", month: "short", day: "numeric" })
    )
  }, [fecha, options])
  return formatted
}

interface EvidenceCardProps {
  evidencia: Evidencia
  onClick: () => void
}

export function EvidenceCard({ evidencia, onClick }: EvidenceCardProps) {
  const config = tipoConfig[evidencia.tipo] || tipoConfig.pdf
  const Icon = config.icon

  const fechaFormateada = useFormattedDate(evidencia.fecha)

  return (
    <Card
      className="group cursor-pointer border-border bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`Ver evidencia: ${evidencia.titulo}`}
    >
      <CardContent className="p-5">
        {/* Type badge and action */}
        <div className="mb-3 flex items-start justify-between">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
              config.bgColor,
              config.color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Title & description */}
        <h3 className="mb-1.5 text-sm font-semibold leading-snug text-card-foreground group-hover:text-primary transition-colors">
          {evidencia.titulo}
        </h3>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {evidencia.descripcion}
        </p>

        {/* Result badge */}
        <Badge
          variant="secondary"
          className="mb-3 text-xs font-normal bg-secondary text-secondary-foreground"
        >
          {evidencia.resultado_aprendizaje}
        </Badge>
        {evidencia.es_material_apoyo && (
          <Badge variant="outline" className="mb-3 ml-2 text-xs">
            Material de apoyo
          </Badge>
        )}

        {/* Meta info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {evidencia.autor.split(" ").slice(0, 2).join(" ")}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {fechaFormateada}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
