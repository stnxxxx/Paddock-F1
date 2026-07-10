"use client"

import { AuthModal } from "@/components/auth/auth-modal"
import { useAuth } from "@/components/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TeamLogo } from "@/components/ui/team-logo"
import { api } from "@/lib/api"
import {
  BarChart3,
  Bell,
  Bookmark,
  Home,
  LogOut,
  MessageCircle,
  Play,
  Radio,
  Settings,
  Shield,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface Props {
  open: boolean
  onClose: () => void
}

const NAV = [
  { href: "/", icon: Home, label: "Лента", exact: true },
  { href: "/live", icon: Radio, label: "Live", live: true },
  { href: "/communities", icon: Users, label: "Паблики" },
  { href: "/watch", icon: Play, label: "Смотреть" },
  { href: "/fantasy", icon: Zap, label: "Фэнтези" },
  { href: "/leaderboard", icon: Trophy, label: "Лидерборд" },
  { href: "/stats", icon: BarChart3, label: "Статистика" },
] as const

export function MobileMenu({ open, onClose }: Props) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const [authOpen, setAuthOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  // Lock background scroll + close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !user) return
    api.getNotifications().then((d) => setUnread(d.unread || 0)).catch(() => {})
  }, [open, user])

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      active
        ? "bg-[--bg-elevated] font-semibold text-[--text-primary]"
        : "font-medium text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
    }`

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Меню навигации"
        className={`safe-top safe-bottom glass-popup fixed inset-y-0 left-0 z-[71] flex w-[300px] max-w-[85vw] flex-col border-r border-[--glass-border] shadow-2xl transition-transform duration-200 ease-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[--border-default] px-4 py-3.5">
          <Link href="/" onClick={onClose} className="font-display text-[17px] font-black tracking-[0.06em] text-[--text-primary]">
            PADDOCK
          </Link>
          <button onClick={onClose} className="rounded-md p-1.5 text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]" aria-label="Закрыть меню">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5">
          {/* User card */}
          {user ? (
            <Link
              href={`/user/${user.username}`}
              onClick={onClose}
              className="mb-2 flex items-center gap-3 rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 transition-colors hover:border-[--border-hover]"
            >
              <Avatar className="h-10 w-10">
                {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : (
                  <AvatarFallback className="bg-[--accent] text-xs font-bold text-white">
                    {user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {user.team && <TeamLogo team={user.team} size={14} />}
                  <span className="truncate text-sm font-semibold text-[--text-primary]">{user.display_name || user.username}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[--text-secondary]">
                  <Zap className="h-3 w-3 text-[--gold]" />
                  {user.karma.toLocaleString()} кармы
                </div>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => { onClose(); setAuthOpen(true) }}
              className="mb-2 h-11 w-full rounded-xl bg-[--accent] text-sm font-bold text-white transition-colors hover:bg-[--accent-hover]"
            >
              Войти / Регистрация
            </button>
          )}

          <nav className="flex flex-col gap-0.5">
            {NAV.map((link) => {
              const Icon = link.icon
              const active = isActive(link.href, "exact" in link ? link.exact : false)
              return (
                <Link key={link.href} href={link.href} onClick={onClose} className={linkClass(active)}>
                  <Icon className={`h-4.5 w-4.5 ${"live" in link && link.live ? "text-[--accent]" : ""}`} />
                  {link.label}
                  {"live" in link && link.live && (
                    <span className="relative ml-auto flex h-2 w-2">
                      <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-[--live]/50" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[--live]" />
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {user && (
            <>
              <div className="my-2.5 border-t border-[--border-default]" />
              <nav className="flex flex-col gap-0.5">
                <Link href={`/user/${user.username}`} onClick={onClose} className={linkClass(isActive(`/user/${user.username}`))}>
                  <User className="h-4.5 w-4.5" />Профиль
                </Link>
                <Link href="/messages" onClick={onClose} className={linkClass(isActive("/messages"))}>
                  <MessageCircle className="h-4.5 w-4.5" />Сообщения
                </Link>
                <Link href="/bookmarks" onClick={onClose} className={linkClass(isActive("/bookmarks"))}>
                  <Bookmark className="h-4.5 w-4.5" />Закладки
                </Link>
                <Link href="/notifications" onClick={onClose} className={linkClass(isActive("/notifications"))}>
                  <Bell className="h-4.5 w-4.5" />Уведомления
                  {unread > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[--accent] px-1.5 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
                <Link href="/settings" onClick={onClose} className={linkClass(isActive("/settings"))}>
                  <Settings className="h-4.5 w-4.5" />Настройки
                </Link>
                {user.role === "moderator" && (
                  <Link href="/mod" onClick={onClose} className={`${linkClass(isActive("/mod"))} text-[--accent]`}>
                    <Shield className="h-4.5 w-4.5" />Модерация
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link href="/admin" onClick={onClose} className={`${linkClass(isActive("/admin"))} text-[--accent]`}>
                    <Shield className="h-4.5 w-4.5" />Админ-панель
                  </Link>
                )}
                <button
                  onClick={() => { onClose(); logout() }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
                >
                  <LogOut className="h-4.5 w-4.5" />Выйти
                </button>
              </nav>
            </>
          )}
        </div>
      </aside>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
