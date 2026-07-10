"use client"

import { useAuth } from "@/components/auth/auth-context"
import { getTeamColor } from "@/components/ui/team-logo"
import { useEffect } from "react"

export function TeamThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    const root = document.documentElement
    if (user?.team) {
      const color = getTeamColor(user.team)
      root.style.setProperty("--accent", color)
      root.style.setProperty("--accent-hover", `${color}cc`)
    } else {
      root.style.removeProperty("--accent")
      root.style.removeProperty("--accent-hover")
    }
  }, [user?.team])

  return <>{children}</>
}
