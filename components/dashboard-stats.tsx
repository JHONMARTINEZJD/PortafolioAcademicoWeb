"use client"

import type { Categoria } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  Video,
  Image as ImageIcon,
  Presentation,
  FolderOpen,
} from "lucide-react"

interface DashboardStatsProps {
  categorias: Categoria[]
}

export function DashboardStats({ categorias }: DashboardStatsProps) {
  const totalEvidencias = categorias.reduce(
    (acc, cat) => acc + cat.evidencias.length,
    0
  )

  const allEvidencias = categorias.flatMap((cat) => cat.evidencias)

  const conteo = {
    pdf: allEvidencias.filter((e) => e.tipo === "pdf").length,
    video: allEvidencias.filter((e) => e.tipo === "video").length,
    imagen: allEvidencias.filter((e) => e.tipo === "imagen").length,
    presentacion: allEvidencias.filter((e) => e.tipo === "presentacion").length,
  }

  const stats = [
    {
      label: "Total Evidencias",
      value: totalEvidencias,
      icon: FolderOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Documentos PDF",
      value: conteo.pdf,
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Videos",
      value: conteo.video,
      icon: Video,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Imagenes",
      value: conteo.imagen,
      icon: ImageIcon,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Presentaciones",
      value: conteo.presentacion,
      icon: Presentation,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label} className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
              >
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
