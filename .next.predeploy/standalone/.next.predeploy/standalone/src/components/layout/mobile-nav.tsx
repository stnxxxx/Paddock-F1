"use client"

import { Home, Menu, Radio, Users, Zap } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-context"
import { useNav } from "@/components/layout/nav-context"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

const LINKS = [
  { href: "/", icon: Home, label: "Лента", exact: true },
  { href: "/live", icon: Radio, label: "Live" },
  { href: "/communities", icon: Users, label: "Паблики" },
  { href: "/fantasy", icon: Zap, label: "Фэнтези" },
] as const

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { openMenu } = useNav()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) {
      const timeout = window.setTimeout(() => setUnread(0), 0)
      return () => window.clearTimeout(timeout)
    }
    const fetchUnread = () => {
      api.getNotifications().then((d) => setUnread(d.unread || 0)).catch(() => {})
    }
    fetchUnread()
    const interval = window.setInterval(fetchUnread, 30000)
    return () => window.clearInterval(interval)
  }, [user])

  const itemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full relative transition-colors ${
      active ? "text-[--accent]" : "text-[--text-muted] hover:text-[--text-secondary]"
    }`

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-surface border-t border-[--glass-border] safe-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {LINKS.map((link) => {
          const exact = "exact" in link && link.exact
          const active = exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + "/")
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href} className={itemClass(active)}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          )
        })}

        <button type="button" onClick={openMenu} className={itemClass(false)} aria-label="Открыть меню">
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Ещё</span>
          {unread > 0 && (
            <span className="absolute top-2 right-[18%] w-4 h-4 rounded-full bg-[--accent] text-[9px] font-bold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
