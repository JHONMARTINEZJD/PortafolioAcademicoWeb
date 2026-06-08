"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { UserRole } from "@/lib/types"

type PublicRole = UserRole | "publico"

interface AuthSession {
  role: PublicRole
  userId: string | null
  nombre: string | null
  username: string | null
}

interface AuthContextValue {
  role: PublicRole
  userId: string | null
  nombre: string | null
  username: string | null
  isAuthenticated: boolean
  isPublic: boolean
  isAdmin: boolean
  isInstructor: boolean
  isAprendiz: boolean
  canAccessManagement: boolean
  login: (identifier: string, password: string) => Promise<boolean>
  loginInstructor: (payload: {
    userId: string
    nombre: string
    usuario: string
    usuarioIngresado: string
    clave: string
    claveIngresada: string
  }) => Promise<boolean>
  loginAprendiz: (payload: {
    userId: string
    nombre: string
    usuario: string
    usuarioIngresado: string
    clave: string
    claveIngresada: string
  }) => Promise<boolean>
  logout: () => Promise<void>
  changePin: (oldPassword: string, newPassword: string) => Promise<boolean>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const PUBLIC_SESSION: AuthSession = {
  role: "publico",
  userId: null,
  nombre: null,
  username: null,
}

function parseRole(value: unknown): PublicRole {
  return value === "admin" || value === "instructor" || value === "aprendiz"
    ? value
    : "publico"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>(PUBLIC_SESSION)

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })
      if (!response.ok) {
        setSession(PUBLIC_SESSION)
        return
      }
      const body = await response.json()
      const user = body?.user
      setSession({
        role: parseRole(user?.role),
        userId: typeof user?.userId === "string" ? user.userId : null,
        nombre: typeof user?.nombre === "string" ? user.nombre : null,
        username: typeof user?.username === "string" ? user.username : null,
      })
    } catch {
      setSession(PUBLIC_SESSION)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const loginWithRole = useCallback(
    async (identifier: string, clave: string, role?: UserRole) => {
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identifier, clave, role }),
        })
        if (!response.ok) return false
        await refreshSession()
        return true
      } catch {
        return false
      }
    },
    [refreshSession]
  )

  const login = useCallback(
    async (identifier: string, password: string) => {
      return loginWithRole(identifier, password)
    },
    [loginWithRole]
  )

  const loginInstructor = useCallback(
    async (payload: {
      userId: string
      nombre: string
      usuario: string
      usuarioIngresado: string
      clave: string
      claveIngresada: string
    }) => {
      return loginWithRole(payload.usuarioIngresado, payload.claveIngresada, "instructor")
    },
    [loginWithRole]
  )

  const loginAprendiz = useCallback(
    async (payload: {
      userId: string
      nombre: string
      usuario: string
      usuarioIngresado: string
      clave: string
      claveIngresada: string
    }) => {
      return loginWithRole(payload.usuarioIngresado, payload.claveIngresada, "aprendiz")
    },
    [loginWithRole]
  )

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Ignore network errors and fallback to local state.
    }
    setSession(PUBLIC_SESSION)
  }, [])

  const changePin = useCallback(
    async (oldPassword: string, newPassword: string) => {
      try {
        const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            oldPassword,
            newPassword,
          }),
        })
        return response.ok
      } catch {
        return false
      }
    },
    []
  )

  return (
    <AuthContext.Provider
      value={{
        role: session.role,
        userId: session.userId,
        nombre: session.nombre,
        username: session.username,
        isAuthenticated: session.role !== "publico",
        isPublic: session.role === "publico",
        isAdmin: session.role === "admin",
        isInstructor: session.role === "instructor",
        isAprendiz: session.role === "aprendiz",
        canAccessManagement:
          session.role === "admin" || session.role === "instructor",
        login,
        loginInstructor,
        loginAprendiz,
        logout,
        changePin,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
