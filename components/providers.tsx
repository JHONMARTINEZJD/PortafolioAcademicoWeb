"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { Analytics } from "@vercel/analytics/next"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Analytics />
    </AuthProvider>
  )
}
