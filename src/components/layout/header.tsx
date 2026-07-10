"use client"

import { AuthModal } from "@/components/auth/auth-modal"
import { HeaderTicker } from "@/components/layout/header-ticker"
import { HeaderCreate } from "@/components/layout/header-create"
import { useNav } from "@/components/layout/nav-context"
import { useAuth } from "@/components/auth/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { api } from "@/lib/api"
import {
  Bell,
  Bookmark,
  ChevronDown,
  LogOut,
  MessageCircle,
  Menu,
  Search,
  Settings,
  Shield,
  User,
  X,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

interface Props {
  onNewPost?: () => void
  onSearch?: (q: string) => void
  searchValue?: string
  /** Render the live ticker as the header's second row (home page). */
  showTicker?: boolean
}

const NAV_LINKS = [
  { href: "/live", label: "Live", live: true },
  { href: "/communities", label: "Паблики" },
  { href: "/watch", label: "Смотреть" },
  { href: "/fantasy", label: "Фэнтези" },
  { href: "/leaderboard", label: "Лидерборд" },
  { href: "/stats", label: "Статистика" },
]

export function Header({ onNewPost, onSearch, searchValue, showTicker = false }: Props) {
  const { user, logout, loading } = useAuth()
  const { openMenu } = useNav()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchValue || "")
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [dmUnread, setDmUnread] = useState(0)

  useEffect(() => {
    setLocalSearch(searchValue || "")
  }, [searchValue])

  useEffect(() => {
    if (!user) {
      const timeout = window.setTimeout(() => { setUnreadNotifs(0); setDmUnread(0) }, 0)
      return () => window.clearTimeout(timeout)
    }

    const poll = () => {
      api.getNotifications().then((d) => setUnreadNotifs(d.unread || 0)).catch(() => {})
      api.getDmUnread().then((d) => setDmUnread(d.unread || 0)).catch(() => {})
    }
    poll()
    const interval = window.setInterval(poll, 30000)
    return () => window.clearInterval(interval)
  }, [user])

  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value)
    onSearch?.(value)
  }, [onSearch])

  const submitSearch = useCallback(() => {
    const q = localSearch.trim()
    if (!q) return
    onSearch?.(q)
    router.push(`/?q=${encodeURIComponent(q)}`)
  }, [localSearch, onSearch, router])

  const handleSearchSubmit = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") submitSearch()
  }, [submitSearch])

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[--border-default] bg-[--bg-root]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-5">
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={openMenu}
              className="-ml-1 rounded-md p-1.5 text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary] lg:hidden"
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex shrink-0 items-center lg:mr-3">
              <span className="font-display text-[18px] font-black tracking-[0.06em] text-[--text-primary] select-none">
                PADDOCK
              </span>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
                      link.live
                        ? "font-semibold text-[--accent] hover:bg-[--accent]/10"
                        : active
                          ? "bg-[--bg-elevated] font-semibold text-[--text-primary]"
                          : "font-medium text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
                    }`}
                  >
                    {link.live && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-[--live]/50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[--live]" />
                      </span>
                    )}
                    {link.label}
                  </Link>
                )
              })}
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    pathname.startsWith("/admin") ? "bg-[--accent-soft] text-[--accent]" : "text-[--accent] hover:bg-[--accent-soft]"
                  }`}
                >
                  Админ
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden w-56 items-center lg:flex lg:w-80">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--text-muted]" />
              <input
                placeholder="Поиск постов…"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchSubmit}
                className="h-9 w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] pl-9 pr-3 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] transition-[color,border-color] focus:outline-none focus:border-[--border-hover] focus:ring-2 focus:ring-[--accent]/20"
              />
            </div>

            <button
              onClick={() => setMobileSearch(true)}
              className="rounded-md p-1.5 text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary] lg:hidden"
              title="Поиск"
            >
              <Search className="h-4 w-4" />
            </button>

            {user ? (
              <>
                <Link href="/bookmarks" className="hidden items-center rounded-md border border-transparent p-1.5 text-[--text-secondary] transition-colors hover:border-[--border-default] hover:bg-[--bg-hover] hover:text-[--gold] sm:flex" title="Закладки">
                  <Bookmark className="h-4 w-4" />
                </Link>
                <Link href="/messages" className="relative rounded-md border border-transparent p-1.5 text-[--text-secondary] transition-colors hover:border-[--border-default] hover:bg-[--bg-hover] hover:text-[--text-primary]" title="Сообщения">
                  <MessageCircle className="h-4 w-4" />
                  {dmUnread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white ring-2 ring-[--bg-root]" style={{ backgroundColor: "var(--accent)" }}>
                      {dmUnread > 9 ? "9+" : dmUnread}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" className="relative hidden rounded-md border border-transparent p-1.5 text-[--text-secondary] transition-colors hover:border-[--border-default] hover:bg-[--bg-hover] hover:text-[--text-primary] sm:inline-flex" title="Уведомления">
                  <Bell className="h-4 w-4" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[--accent] px-1 text-[9px] font-bold text-white ring-2 ring-[--bg-root]">
                      {unreadNotifs > 9 ? "9+" : unreadNotifs}
                    </span>
                  )}
                </Link>
                <HeaderCreate onNewPost={onNewPost} />

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-[--border-default] hover:bg-[--bg-hover]"
                  >
                    <Avatar className="h-6 w-6">
                      {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : (
                        <AvatarFallback className="bg-[--accent] text-[9px] font-bold text-white">
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="hidden items-center gap-1.5 md:flex">
                      {user.team && <TeamLogo team={user.team} size={14} />}
                      <span
                        className="max-w-[110px] truncate text-[13px] font-semibold"
                        style={user.team ? { color: getTeamColor(user.team) } : { color: "var(--color-text-primary)" }}
                      >
                        {user.display_name || user.username}
                      </span>
                      <ChevronDown className="h-3 w-3 text-[--text-muted]" />
                    </div>
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="glass-popup absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg shadow-2xl">
                        <div className="border-b border-[--border-default] p-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8">
                              {user.avatar ? <AvatarImage src={user.avatar} alt={user.username} /> : (
                                <AvatarFallback className="bg-[--accent] text-[10px] font-bold text-white">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="text-sm font-semibold">{user.display_name || user.username}</div>
                              {user.display_name && <div className="text-[11px] text-[--text-muted]">@{user.username}</div>}
                              <div className="mt-0.5 flex items-center gap-1">
                                <Zap className="h-3 w-3 text-[--gold]" />
                                <span className="text-[11px] text-[--text-secondary]">{user.karma.toLocaleString()}</span>
                                {user.driver && <span className="ml-1 text-[10px] text-[--text-muted]">· {user.driver}</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-1">
                          <Link href={`/user/${user.username}`} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[--text-primary] transition-colors hover:bg-[--bg-hover]" onClick={() => setMenuOpen(false)}>
                            <User className="h-3.5 w-3.5" />Профиль
                          </Link>
                          <Link href="/settings" className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[--text-primary] transition-colors hover:bg-[--bg-hover]" onClick={() => setMenuOpen(false)}>
                            <Settings className="h-3.5 w-3.5" />Настройки
                          </Link>
                          {user.role === "moderator" && (
                            <Link href="/mod" className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[--accent] transition-colors hover:bg-[--bg-hover]" onClick={() => setMenuOpen(false)}>
                              <Shield className="h-3.5 w-3.5" />Модерация
                            </Link>
                          )}
                          {user.role === "admin" && (
                            <>
                              <Link href="/admin" className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[--accent] transition-colors hover:bg-[--bg-hover]" onClick={() => setMenuOpen(false)}>
                                <Shield className="h-3.5 w-3.5" />Админ-панель
                              </Link>
                              <Link href="/admin/comments" className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-[--text-primary] transition-colors hover:bg-[--bg-hover]" onClick={() => setMenuOpen(false)}>
                                <MessageCircle className="h-3.5 w-3.5" />Комментарии
                              </Link>
                            </>
                          )}
                          <button
                            onClick={() => {
                              logout()
                              setMenuOpen(false)
                            }}
                            className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/5"
                          >
                            <LogOut className="h-3.5 w-3.5" />Выйти
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                disabled={loading}
                className="h-9 rounded-lg bg-[--accent] px-4 text-xs font-bold text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-50"
              >
                {loading ? "..." : "Войти"}
              </button>
            )}
          </div>
        </div>

        {mobileSearch && (
          <div className="absolute inset-x-0 top-0 z-[60] flex h-12 items-center gap-2 bg-[--bg-root] px-5 lg:hidden">
            <Search className="h-4 w-4 shrink-0 text-[--text-muted]" />
            <input
              autoFocus
              placeholder="Поиск постов…"
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { submitSearch(); setMobileSearch(false) } }}
              className="h-8 flex-1 rounded-full border border-[--border-default] bg-[--bg-elevated] px-4 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none"
            />
            <button onClick={() => setMobileSearch(false)} className="rounded-md p-1.5 text-[--text-muted] hover:text-[--text-primary]" title="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {showTicker && <HeaderTicker />}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
