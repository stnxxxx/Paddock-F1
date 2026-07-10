"use client"

import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useAuth } from "@/components/auth/auth-context"
import { ChevronRight, Flag, MapPin, Medal, Plus, ShieldCheck, Timer, Trophy, UserPlus, Users, Zap } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { api, ApiStandings, ApiCommunity, ApiSuggestedUser } from "@/lib/api"
import { useCountdown } from "@/lib/f1/use-live-ticker"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useEffect, useState } from "react"

function Standings({ standings, favDriver, favTeam }: { standings: ApiStandings | null; favDriver?: string | null; favTeam?: string | null }) {
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers")

  const data = tab === "drivers" ? standings?.drivers : standings?.constructors
  const max = data?.length ? data[0].pts : 1

  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-[--gold]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">
            Сезон {standings?.season || "2026"}
          </span>
        </div>
        <div className="flex bg-[--bg-elevated] rounded-md p-0.5 gap-0.5">
          {(["drivers", "constructors"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                tab === t
                  ? "text-[--text-primary] bg-[--bg-active]"
                  : "text-[--text-muted] hover:text-[--text-secondary]"
              }`}
            >
              {t === "drivers" ? "Пилоты" : "Команды"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-h-[280px] overflow-y-auto pr-1">
        {!data ? (
          <div className="text-[11px] text-[--text-muted] text-center py-6">Загрузка...</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "drivers" ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === "drivers" ? -8 : 8 }}
              transition={{ duration: 0.18 }}
              className="space-y-0.5"
            >
              {data.map((row, i) => {
                const pct = Math.max(4, Math.round((row.pts / max) * 100))
                const isFav = tab === "drivers" ? !!favDriver && row.driver === favDriver : !!favTeam && row.team === favTeam
                return (
                  <div
                    key={tab + "-" + row.pos}
                    className={cn("flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors group", isFav ? "bg-[--accent]/10" : "hover:bg-[--bg-hover]")}
                    style={isFav ? { boxShadow: "inset 2px 0 0 var(--color-accent)" } : undefined}
                  >
                    <span className="text-[10px] font-mono font-bold text-[--text-muted] w-3.5 text-right tabular-nums">{row.pos}</span>
                    <TeamLogo team={row.team} size={18} className="opacity-80 group-hover:opacity-100" />
                    {row.driver ? (
                      <>
                        <span className="text-[12px] font-mono font-bold w-8" style={{ color: row.color }}>{row.driver}</span>
                        <span className="text-[10px] text-[--text-muted] truncate flex-1">{row.surname || row.team}</span>
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-[--text-primary] flex-1 truncate">{row.team}</span>
                    )}
                    <span className="text-[11px] font-mono font-bold text-[--text-primary] tabular-nums">{row.pts}</span>
                    <div className="w-10 h-1 rounded-full bg-[--bg-elevated] shrink-0 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: row.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: Math.min(i, 10) * 0.03 }}
                      />
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {standings && (
        <div className="mt-2.5 pt-2 border-t border-[--border-default] flex items-center justify-between">
          <span className="text-[10px] text-[--text-muted]">{standings.totalRaces} этапов · этап {standings.round || "?"}</span>
          <Link href="/stats" className="text-[10px] text-[--text-muted] hover:text-[--text-primary] transition-colors">Все →</Link>
        </div>
      )}
    </div>
  )
}

const PODIUM = ["var(--color-gold)", "#c0c0cc", "#cd7f32"]

export function Sidebar() {
  const { user } = useAuth()
  const [standings, setStandings] = useState<ApiStandings | null>(null)
  const [communities, setCommunities] = useState<ApiCommunity[]>([])
  const [suggestedUsers, setSuggestedUsers] = useState<ApiSuggestedUser[]>([])

  useEffect(() => {
    api.getStandings().then(setStandings).catch(() => {})
    api.getRecommendedCommunities().then((d) => setCommunities(d.communities || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) { setSuggestedUsers([]); return }
    api.getRecommendedUsers().then((d) => setSuggestedUsers(d.users || [])).catch(() => {})
  }, [user])

  const followSuggested = async (id: string) => {
    setSuggestedUsers((prev) => prev.filter((u) => u.id !== id))
    try { await api.toggleFollow(id) } catch {}
  }

  const nextRace = standings?.nextRace
  const lastRace = standings?.lastRace
  const countdownTarget = nextRace ? Date.parse(`${nextRace.date}T12:00:00Z`) : null
  const countdown = useCountdown(countdownTarget)
  const favDriver = user?.driver || null
  const favTeam = user?.team || null

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 gap-3 py-5 sticky top-[calc(2.75rem+3rem)] self-start max-h-[calc(100vh-2.75rem-3rem)] overflow-y-auto">
      {nextRace && (
        <Link
          href={`/race/${standings?.season || "2026"}/${nextRace.round}`}
          className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface] hover:border-[--border-hover] transition-colors"
        >
          <div className="border-b border-[--border-default] px-3.5 pt-3 pb-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[--text-muted] mb-2">
              <span>Следующая гонка</span>
              <span className="font-mono lowercase text-[--text-placeholder]">этап {nextRace.round}</span>
            </div>
            {countdown ? (
              <div className="flex items-center gap-1.5 text-[--text-primary]">
                <Timer className="h-4 w-4 text-[--accent]" />
                <span className="font-mono text-xl font-black tabular-nums">{countdown}</span>
              </div>
            ) : (
              <div className="text-sm font-bold text-[--text-muted]">{new Date(nextRace.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
            )}
          </div>
          <div className="px-3.5 pb-3">
            <div className="text-sm font-semibold text-[--text-primary]">{nextRace.name}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[--text-muted]">
              <MapPin className="w-2.5 h-2.5" />{nextRace.circuit}, {nextRace.country}
            </div>
          </div>
        </Link>
      )}

      {lastRace && lastRace.results.length > 0 && (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]"><Flag className="h-3 w-3 text-[--gold]" /> Последняя гонка</span>
            <Link href={`/race/${standings?.season || "2026"}/${lastRace.round}`} className="text-[10px] text-[--text-muted] hover:text-[--text-primary] transition-colors">все →</Link>
          </div>
          <div className="mb-2 text-xs font-semibold text-[--text-primary]">{lastRace.raceName}</div>
          {/* podium */}
          <div className="mb-2 grid grid-cols-3 gap-1.5">
            {lastRace.results.slice(0, 3).map((r, i) => {
              const isFav = !!favDriver && r.driverCode === favDriver
              return (
                <div key={r.driverCode} className={cn("flex flex-col items-center rounded-md border bg-[--bg-elevated] py-2", isFav ? "border-[--accent]/50" : "border-[--border-default]")}>
                  <Medal className="h-4 w-4" style={{ color: PODIUM[i] }} />
                  <span className="mt-0.5 font-mono text-sm font-black" style={{ color: r.constructorName ? undefined : "var(--color-text-primary)" }}>{r.driverCode}</span>
                  <span className="text-[9px] text-[--text-muted]">{r.time || r.status}</span>
                </div>
              )
            })}
          </div>
          {/* p4-p8 */}
          <div className="space-y-0.5">
            {lastRace.results.slice(3, 8).map((r) => {
              const isFav = !!favDriver && r.driverCode === favDriver
              return (
                <div key={r.driverCode} className={cn("flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px]", isFav && "bg-[--accent]/10")}>
                  <span className="font-mono font-bold text-[--text-muted] w-3 tabular-nums">{r.position}</span>
                  <span className="font-mono font-semibold text-[--text-primary] w-7">{r.driverCode}</span>
                  <span className="text-[--text-muted] truncate">{r.time || r.status}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Standings standings={standings} favDriver={favDriver} favTeam={favTeam} />

      {user && suggestedUsers.length > 0 && (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <UserPlus className="w-3.5 h-3.5 text-[--accent]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">Кого читать</span>
          </div>
          <div className="space-y-1">
            {suggestedUsers.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md px-1 py-1">
                <Link href={`/user/${s.username}`} className="flex min-w-0 flex-1 items-center gap-2">
                  <UserAvatar username={s.username} src={s.avatar} color={s.team ? getTeamColor(s.team) : undefined} className="h-7 w-7 shrink-0" fallbackClassName="text-[9px]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold text-[--text-primary]">{s.display_name || s.username}</span>
                    <span className="block text-[10px] text-[--text-muted]">{s.karma.toLocaleString()} кармы</span>
                  </span>
                </Link>
                <button
                  onClick={() => followSuggested(s.id)}
                  className="shrink-0 rounded-md bg-[--accent] px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-[--accent-hover]"
                >
                  Читать
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[--accent]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">Паблики для вас</span>
          </div>
          <Link href="/communities" className="text-[10px] text-[--text-muted] hover:text-[--text-primary] transition-colors">все</Link>
        </div>
        <div className="space-y-1">
          {communities.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              href={`/p/${c.slug}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary] transition-colors"
            >
              <UserAvatar username={c.name} src={c.avatar} color={c.color} className="h-6 w-6 shrink-0" fallbackClassName="text-[9px]" />
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-[10px] text-[--text-muted] tabular-nums">{c.subscriber_count ?? 0}</span>
              <ChevronRight className="w-3 h-3 text-[--text-muted]" />
            </Link>
          ))}
          {communities.length === 0 && (
            <p className="px-2 py-1 text-[11px] text-[--text-muted]">Пока нет пабликов</p>
          )}
        </div>
        <Link
          href="/communities"
          className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-[--border-default] py-1.5 text-[11px] font-medium text-[--text-secondary] hover:border-[--accent]/40 hover:text-[--text-primary] transition-colors"
        >
          <Plus className="w-3 h-3" /> Создать паблик
        </Link>
      </div>

      <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[--gold]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">Правила паддока</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[--text-secondary] leading-relaxed">
          <li>Обсуждаем гонки и команды без личных атак.</li>
          <li>Спойлеры после сессий помечаем тегом.</li>
          <li>Слухи отделяем от подтвержденных источников.</li>
        </ul>
      </div>

      <a
        href="/fantasy"
        className="block rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 hover:border-[--border-hover] hover:bg-[--bg-elevated] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[--gold]" />
          <span className="text-[13px] font-semibold">Фэнтези</span>
        </div>
        <p className="text-[11px] text-[--text-muted] mt-0.5">Делай прогнозы на уикенд и соревнуйся в таблице сообщества.</p>
      </a>

      <p className="text-[10px] text-[--text-muted] text-center">PADDOCK © 2026</p>
    </aside>
  )
}
