"use client"

import { Menu, Search, X, ShieldCheck, LogOut } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FichaSelector } from "@/components/ficha-selector"
import type { ConfiguracionPortafolio, Ficha } from "@/lib/types"

interface PortfolioHeaderProps {
  onToggleSidebar: () => void
  busqueda: string
  onBusqueda: (q: string) => void
  titulo: string
  fichas?: Ficha[]
  fichaActiva?: string | null
  onChangeFicha?: (fichaId: string) => void
  onAgregarFicha?: () => void
  onEditarFicha?: (fichaId: string, config: Partial<ConfiguracionPortafolio>) => void
  onEliminarFicha?: (fichaId: string) => void
}

export function PortfolioHeader({
  onToggleSidebar,
  busqueda,
  onBusqueda,
  titulo,
  fichas = [],
  fichaActiva = null,
  onChangeFicha = () => {},
  onAgregarFicha,
  onEditarFicha,
  onEliminarFicha,
}: PortfolioHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { isAdmin, isInstructor, canAccessManagement, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      {/* Ficha selector row */}
      {fichas.length > 0 && (
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5 md:px-6">
          <FichaSelector
            fichas={fichas}
            fichaActiva={fichaActiva}
            onChangeFicha={onChangeFicha}
            onAgregarFicha={onAgregarFicha}
            onEditarFicha={onEditarFicha}
            onEliminarFicha={onEliminarFicha}
            canAddFicha={isAdmin}
          />
        </div>
      )}

      {/* Main header */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">{titulo}</h1>
          {canAccessManagement && (
            <Badge className="bg-accent text-accent-foreground gap-1 text-xs">
              <ShieldCheck className="h-3 w-3" />
              {isAdmin ? "Admin" : isInstructor ? "Instructor" : "Gestion"}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar evidencias..."
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            className="h-9 w-64 rounded-lg border border-input bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Admin logout button */}
        {canAccessManagement && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex gap-1.5 text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        )}

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          aria-label={searchOpen ? "Cerrar busqueda" : "Abrir busqueda"}
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="absolute left-0 top-full w-full border-b border-border bg-background p-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar evidencias..."
              value={busqueda}
              onChange={(e) => onBusqueda(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>
      )}
      </div>
    </header>
  )
}
