"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { AgregarFichaDialog } from "@/components/agregar-ficha-dialog"
import { Plus, FileText, Pencil, Trash2 } from "lucide-react"
import type { ConfiguracionPortafolio, Ficha } from "@/lib/types"

interface FichaSelectorProps {
  fichas: Ficha[]
  fichaActiva: string | null
  onChangeFicha: (fichaId: string) => void
  onAgregarFicha?: () => void
  onEditarFicha?: (fichaId: string, config: Partial<ConfiguracionPortafolio>) => void
  onEliminarFicha?: (fichaId: string) => void
  canAddFicha?: boolean
}

export function FichaSelector({
  fichas,
  fichaActiva,
  onChangeFicha,
  onAgregarFicha,
  onEditarFicha,
  onEliminarFicha,
  canAddFicha = false,
}: FichaSelectorProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [orden, setOrden] = useState<"ficha_asc" | "ficha_desc" | "programa_asc">(
    "ficha_asc"
  )

  const fichaSeleccionada = useMemo(
    () => fichas.find((f) => f.id === fichaActiva) || fichas[0] || null,
    [fichas, fichaActiva]
  )
  const fichasVisibles = useMemo(() => {
    const normalized = [...fichas].sort((a, b) => {
      const fichaA = (a.configuracion.ficha || "").trim()
      const fichaB = (b.configuracion.ficha || "").trim()
      const numA = Number(fichaA)
      const numB = Number(fichaB)
      const safeNumA = Number.isFinite(numA) ? numA : Number.MAX_SAFE_INTEGER
      const safeNumB = Number.isFinite(numB) ? numB : Number.MAX_SAFE_INTEGER
      if (orden === "ficha_asc") {
        if (safeNumA !== safeNumB) return safeNumA - safeNumB
        return fichaA.localeCompare(fichaB, "es")
      }
      if (orden === "ficha_desc") {
        if (safeNumA !== safeNumB) return safeNumB - safeNumA
        return fichaB.localeCompare(fichaA, "es")
      }
      const programaA = (a.configuracion.programa || "").trim()
      const programaB = (b.configuracion.programa || "").trim()
      return (
        programaA.localeCompare(programaB, "es") ||
        fichaA.localeCompare(fichaB, "es")
      )
    })

    const q = search.trim().toLowerCase()
    if (!q) return normalized
    return normalized.filter((f) => {
      const text = `${f.configuracion.ficha || ""} ${f.configuracion.programa || ""} ${
        f.configuracion.jornada || ""
      }`.toLowerCase()
      return text.includes(q)
    })
  }, [fichas, orden, search])

  if (!fichas || fichas.length === 0) return null

  const handleEditarFicha = (config: ConfiguracionPortafolio) => {
    if (!fichaSeleccionada || !onEditarFicha) return
    onEditarFicha(fichaSeleccionada.id, config)
    setEditOpen(false)
  }

  const handleEliminarFicha = () => {
    if (!fichaSeleccionada || !onEliminarFicha) return
    onEliminarFicha(fichaSeleccionada.id)
    setDeleteOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Select value={fichaActiva || ""} onValueChange={onChangeFicha}>
          <SelectTrigger className="h-9 w-48 border-border bg-card text-sm">
            <SelectValue placeholder="Selecciona una ficha" />
          </SelectTrigger>
          <SelectContent className="w-[min(92vw,30rem)]">
            <div className="space-y-2 border-b px-2 py-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ficha o programa"
                className="h-8"
              />
              <Select value={orden} onValueChange={(v) => setOrden(v as typeof orden)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ficha_asc">Orden: ficha asc</SelectItem>
                  <SelectItem value="ficha_desc">Orden: ficha desc</SelectItem>
                  <SelectItem value="programa_asc">Orden: programa A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {fichasVisibles.map((ficha) => (
              <SelectItem key={ficha.id} value={ficha.id}>
                <span className="block max-w-[24rem] truncate">
                  Ficha {ficha.configuracion.ficha} - {ficha.configuracion.programa}
                </span>
              </SelectItem>
            ))}
            {fichasVisibles.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Sin fichas para ese filtro
              </div>
            )}
          </SelectContent>
        </Select>

        {canAddFicha && onAgregarFicha && (
          <Button
            onClick={onAgregarFicha}
            size="sm"
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva ficha</span>
          </Button>
        )}

        {canAddFicha && fichaSeleccionada && onEditarFicha && (
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => setEditOpen(true)}
            aria-label="Editar ficha activa"
            title="Editar ficha activa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {canAddFicha && fichaSeleccionada && onEliminarFicha && (
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            aria-label="Eliminar ficha activa"
            title="Eliminar ficha activa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AgregarFichaDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onAgregar={handleEditarFicha}
        mode="editar"
        initialConfig={fichaSeleccionada?.configuracion || null}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar ficha</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la ficha seleccionada con todos sus estudiantes,
              categorias, competencias y evidencias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminarFicha}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
