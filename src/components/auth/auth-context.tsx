"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { api, ApiUser } from "@/lib/api"

interface AuthState {
  user: ApiUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithCode: (email: string, code: string) => Promise<void>
  register: (username: string, email: string, password: string, code: string) => Promise<void>
  requestCode: (email: string, purpose: "register" | "login" | "reset") => Promise<{ dev_code?: string }>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateTeam: (team: string | null) => Promise<void>
  updateDriver: (driver: string | null) => Promise<void>
  updateFlairs: (flairIds: string[]) => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const d = await api.login(email, password)
    setUser(d.user)
  }, [])

  const loginWithCode = useCallback(async (email: string, code: string) => {
    const d = await api.loginWithCode(email, code)
    setUser(d.user)
  }, [])

  const register = useCallback(async (username: string, email: string, password: string, code: string) => {
    const d = await api.register(username, email, password, code)
    setUser(d.user)
  }, [])

  const requestCode = useCallback(async (email: string, purpose: "register" | "login" | "reset") => {
    return api.requestCode(email, purpose)
  }, [])

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    await api.resetPassword(email, code, password)
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const d = await api.me()
      setUser(d.user)
    } catch {
      setUser(null)
    }
  }, [])

  const updateTeam = useCallback(async (team: string | null) => {
    const d = await api.updateTeam(team)
    setUser(d.user)
  }, [])

  const updateDriver = useCallback(async (driver: string | null) => {
    const d = await api.updateDriver(driver)
    setUser(d.user)
  }, [])

  const updateFlairs = useCallback(async (flairIds: string[]) => {
    const d = await api.updateFlairs(flairIds)
    setUser(d.user)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithCode, register, requestCode, resetPassword, logout, refreshUser, updateTeam, updateDriver, updateFlairs }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside AuthProvider")
  return ctx
}
