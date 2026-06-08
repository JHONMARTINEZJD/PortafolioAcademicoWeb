"use client"

import { useState, useEffect } from "react"
import type { Evidencia } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

function useFormattedDate(fecha: string | undefined, options?: Intl.DateTimeFormatOptions) {
  const [formatted, setFormatted] = useState("")
  useEffect(() => {
    if (!fecha) return
    setFormatted(
      new Date(fecha).toLocaleDateString("es-CO", options ?? { year: "numeric", month: "long", day: "numeric" })
    )
  }, [fecha, options])
  return formatted
}

const tipoConfig: Record<string, { icon: React.ElementType; label: string }> = {
  pdf: { icon: FileText, label: "PDF" },
  video: { icon: Video, label: "Video" },
  imagen: { icon: ImageIcon, label: "Imagen" },
  presentacion: { icon: Presentation, label: "Presentacion" },
}

interface EvidenceViewerProps {
  evidencia: Evidencia | null
  open: boolean
  onClose: () => void
  canManagePersonal?: boolean
  onEditPersonal?: () => void
  onDeletePersonal?: () => void
}

function toEmbeddableUrl(url: string, tipo: Evidencia["tipo"]): string {
  if (!url) return url

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, "")

    if (tipo === "video") {
      if (host === "youtube.com" || host === "m.youtube.com") {
        const videoId = parsed.searchParams.get("v")
        if (videoId) return `https://www.youtube.com/embed/${videoId}`
      }
      if (host === "youtu.be") {
        const videoId = parsed.pathname.replace("/", "")
        if (videoId) return `https://www.youtube.com/embed/${videoId}`
      }
      if (host === "vimeo.com") {
        const videoId = parsed.pathname.replace("/", "")
        if (videoId) return `https://player.vimeo.com/video/${videoId}`
      }
    }

    if (tipo === "pdf" || tipo === "presentacion") {
      if (host === "drive.google.com") {
        if (parsed.pathname.includes("/file/d/")) {
          const parts = parsed.pathname.split("/")
          const fileId = parts[parts.indexOf("d") + 1]
          if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
        }
      }
    }
  } catch {
    return url
  }

  return url
}

function canEmbedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return [
      "youtube.com",
      "youtu.be",
      "vimeo.com",
      "player.vimeo.com",
      "drive.google.com",
    ].includes(host)
  } catch {
    return false
  }
}

function EvidenceContent({ evidencia }: { evidencia: Evidencia }) {
  const embeddableUrl = toEmbeddableUrl(evidencia.url, evidencia.tipo)
  const embeddable = canEmbedUrl(embeddableUrl)

  const Fallback = (
    <div className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Este enlace no permite vista embebida en el navegador.
      </p>
      <Button asChild size="sm">
        <a href={evidencia.url} target="_blank" rel="noopener noreferrer">
          Abrir archivo original
        </a>
      </Button>
    </div>
  )

  switch (evidencia.tipo) {
    case "pdf":
      if (!embeddable) return Fallback
      return (
        <div className="w-full overflow-hidden rounded-lg border border-border bg-muted">
          <iframe
            src={embeddableUrl}
            className="h-[55vh] w-full"
            title={evidencia.titulo}
          />
        </div>
      )
    case "video":
      if (!embeddable) return Fallback
      return (
        <div className="w-full overflow-hidden rounded-lg border border-border bg-muted">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={embeddableUrl}
              className="absolute inset-0 h-full w-full"
              title={evidencia.titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )
    case "imagen":
      return (
        <div className="flex w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={evidencia.url}
            alt={evidencia.titulo}
            className="max-h-[55vh] w-auto rounded-md object-contain"
          />
        </div>
      )
    case "presentacion":
      if (!embeddable) return Fallback
      return (
        <div className="w-full overflow-hidden rounded-lg border border-border bg-muted">
          <iframe
            src={embeddableUrl}
            className="h-[55vh] w-full"
            title={evidencia.titulo}
            allowFullScreen
          />
        </div>
      )
    default:
      return (
        <div className="flex h-48 w-full items-center justify-center rounded-lg border border-border bg-muted">
          <p className="text-sm text-muted-foreground">
            Tipo de archivo no soportado
          </p>
        </div>
      )
  }
}

export function EvidenceViewer({
  evidencia,
  open,
  onClose,
  canManagePersonal = false,
  onEditPersonal,
  onDeletePersonal,
}: EvidenceViewerProps) {
  if (!evidencia) return null

  const config = tipoConfig[evidencia.tipo] || tipoConfig.pdf
  const Icon = config.icon

  const fechaFormateada = new Date(evidencia.fecha).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-card p-0 gap-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {config.label}
                </span>
              </div>
              <DialogTitle className="text-lg font-semibold text-card-foreground">
                {evidencia.titulo}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {evidencia.descripcion}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4">
          <EvidenceContent evidencia={evidencia} />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
          <Badge variant="outline" className="text-xs">
            Estado: {evidencia.estado || "enviada"}
          </Badge>
          <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
            {evidencia.resultado_aprendizaje}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {evidencia.autor}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {fechaFormateada}
          </span>
          <a
            href={evidencia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Abrir original
          </a>
          {canManagePersonal && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onEditPersonal}
                className="h-8"
              >
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDeletePersonal}
                className="h-8"
              >
                Eliminar
              </Button>
            </>
          )}
          {evidencia.retroalimentacion && (
            <p className="w-full text-xs text-muted-foreground">
              Retroalimentacion: {evidencia.retroalimentacion}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
