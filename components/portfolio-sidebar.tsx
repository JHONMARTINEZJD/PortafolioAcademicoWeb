"use client"

import { cn } from "@/lib/utils"
import type { Categoria, Competencia, ConfiguracionPortafolio } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import {
  FileText,
  Users,
  Calculator,
  Briefcase,
  Rocket,
  BookOpen,
  Globe,
  Landmark,
  ShieldCheck,
  Heart,
  GraduationCap,
  ChevronLeft,
  LayoutDashboard,
  Lock,
  Settings,
  LogOut,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

const iconMap: Record<string, React.ElementType> = {
  "file-text": FileText,
  users: Users,
  calculator: Calculator,
  briefcase: Briefcase,
  rocket: Rocket,
  "book-open": BookOpen,
  globe: Globe,
  landmark: Landmark,
  "shield-check": ShieldCheck,
  heart: Heart,
}

interface PortfolioSidebarProps {
  categorias: Categoria[]
  competencias?: Competencia[]
  categoriaActiva: string | null
  onSelectCategoria: (id: string | null) => void
  open: boolean
  onClose: () => void
  onOpenLogin: () => void
  onOpenAdmin: () => void
  onSubirEvidencia?: () => void
  onOpenCambiarCredenciales?: () => void
  isAdminView?: boolean
  configuracion?: ConfiguracionPortafolio | null
  canSubirEvidencia?: boolean
}

export function PortfolioSidebar({
  categorias,
  competencias = [],
  categoriaActiva,
  onSelectCategoria,
  open,
  onClose,
  onOpenLogin,
  onOpenAdmin,
  onSubirEvidencia,
  onOpenCambiarCredenciales,
  isAdminView,
  configuracion = null,
  canSubirEvidencia = true,
}: PortfolioSidebarProps) {
  const {
    isAdmin,
    isAprendiz,
    nombre,
    canAccessManagement,
    logout,
  } = useAuth()
  const anioActual = new Date().getFullYear()
  const mostrarCategoriasAdmin = !isAdmin || categoriaActiva !== null
  const adminEnVistaGeneral = isAdmin && !isAdminView && categoriaActiva === null
  const raPorCompetencia = new Map(
    competencias.map((comp) => [comp.id, comp.resultados_aprendizaje.length])
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-dvh w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight text-sidebar-foreground">
                {configuracion?.institucion || "SENA"}
              </h2>
              <p className="text-xs text-sidebar-foreground/60">
                Ficha {configuracion?.ficha || "-"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
            aria-label="Cerrar menu"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav aria-label="Categorias academicas">
            {/* Dashboard link */}
            <button
              onClick={() => onSelectCategoria(null)}
              className={cn(
                "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                categoriaActiva === null && !isAdminView
                  ? "bg-sidebar-accent text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>{isAdmin ? "Dashboard Admin" : "Vista General"}</span>
            </button>

            {/* Admin panel link (visible when logged in) */}
            {canAccessManagement && (
              <button
                onClick={onOpenAdmin}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isAdminView
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>{isAdmin ? "Panel Administrativo" : "Panel de Gestion"}</span>
                <Badge className="ml-auto h-5 bg-accent text-accent-foreground text-[10px] px-1.5">
                  {isAdmin ? "Admin" : "Instructor"}
                </Badge>
              </button>
            )}

            {/* Subir Evidencia Personal button */}
            {categorias.length > 0 && isAprendiz && canSubirEvidencia && (
              <button
                onClick={() => {
                  onSubirEvidencia?.()
                  onClose()
                }}
                className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Subir Evidencia</span>
              </button>
            )}

            {mostrarCategoriasAdmin ? (
              <>
                <div className="my-3 border-t border-sidebar-border" />
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {isAdmin ? "Exploracion por categorias" : "Categorias"}
                </p>
                {categorias.map((cat) => {
                  const Icon = iconMap[cat.icono] || FileText
                  const isActive = categoriaActiva === cat.id && !isAdminView

                  return (
                    <button
                      key={cat.id}
                      onClick={() => onSelectCategoria(cat.id)}
                      className={cn(
                        "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-left">{cat.nombre}</span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ml-auto h-5 min-w-[20px] justify-center px-1.5 text-xs",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "bg-sidebar-accent text-sidebar-foreground/60"
                        )}
                      >
                        {cat.competencia_id
                          ? raPorCompetencia.get(cat.competencia_id) || 0
                          : 0}
                      </Badge>
                    </button>
                  )
                })}
              </>
            ) : null}

            {adminEnVistaGeneral && (
              <div className="mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/20 px-3 py-2 text-xs text-sidebar-foreground/70">
                La vista admin prioriza indicadores y gestion. Usa el panel administrativo para operaciones estructurales.
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-5 py-4">
          {canAccessManagement || isAprendiz ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium text-sidebar-foreground/80">
                  {isAdmin
                    ? "Modo Administrador"
                    : isAprendiz
                      ? `Aprendiz: ${nombre || "Sesion activa"}`
                      : "Modo Instructor"}
                </span>
              </div>
              {!isAdmin && (
                <button
                  onClick={() => onOpenCambiarCredenciales?.()}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Cambiar credenciales
                </button>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Cerrar sesion
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-sidebar-foreground/40">
                  {configuracion?.programa || "Programa sin configurar"}
                </p>
                <p className="text-xs text-sidebar-foreground/30 mt-1">
                  {(configuracion?.institucion || "SENA") + " " + anioActual}
                </p>
              </div>
              <button
                onClick={onOpenLogin}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/30 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/60"
                aria-label="Acceso al sistema"
                title="Acceso al sistema"
              >
                <Lock className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
