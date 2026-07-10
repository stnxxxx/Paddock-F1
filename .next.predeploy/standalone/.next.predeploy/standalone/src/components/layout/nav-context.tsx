"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { MobileMenu } from "./mobile-menu"

interface NavState {
  menuOpen: boolean
  openMenu: () => void
  closeMenu: () => void
}

const NavContext = createContext<NavState | null>(null)

/**
 * Owns the shared mobile/tablet navigation drawer state so it can be opened from
 * both the header hamburger and the bottom nav, while the drawer itself is
 * rendered exactly once.
 */
export function NavProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const openMenu = useCallback(() => setMenuOpen(true), [])
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Close the drawer whenever the route changes.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <NavContext.Provider value={{ menuOpen, openMenu, closeMenu }}>
      {children}
      <MobileMenu open={menuOpen} onClose={closeMenu} />
    </NavContext.Provider>
  )
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error("useNav must be used inside NavProvider")
  return ctx
}
