import type { PortfolioData, UserRole } from "@/lib/types"
import { getPortfolioState } from "@/lib/server/portfolio-db"

export async function getLatestPortfolioData(): Promise<PortfolioData | null> {
  const snapshot = await getPortfolioState({ initializeIfMissing: true })
  if (!snapshot) return null
  return snapshot.data
}

export type LegacyCredential = {
  username: string
  password: string
  role: UserRole
  displayName: string
  linkedEstudianteId: string | null
}

export async function findLegacyCredential(
  username: string,
  role?: UserRole
): Promise<LegacyCredential | null> {
  const portfolio = await getLatestPortfolioData()
  if (!portfolio) return null
  const wanted = username.trim().toLowerCase()
  if (!wanted) return null

  for (const ficha of portfolio.fichas) {
    for (const estudiante of ficha.estudiantes) {
      if (!estudiante.usuario || !estudiante.clave) continue
      if (estudiante.usuario.trim().toLowerCase() !== wanted) continue
      if (role && estudiante.rol !== role) continue
      return {
        username: estudiante.usuario.trim(),
        password: estudiante.clave,
        role: estudiante.rol,
        displayName: estudiante.nombre || estudiante.usuario.trim(),
        linkedEstudianteId: estudiante.id || null,
      }
    }
  }
  return null
}
