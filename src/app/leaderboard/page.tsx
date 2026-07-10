"use client"

import { Header } from "@/components/layout/header"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiLeaderboard } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Medal, Trophy } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

type Scope = "season" | "round" | "karma"

const TABS: { key: Scope; label: string }[] = [
  { key: "season", label: "Сезон" },
  { key: "round", label: "Этап" },
  { key: "karma", label: "Карма" },
]

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [scope, setScope] = useState<Scope>("season")
  const [data, setData] = useState<ApiLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getLeaderboard(scope).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [scope])

  const unit = scope === "karma" ? "кармы" : "очк."
  const subtitle = scope === "season" ? `Сезон ${data?.meta.season || ""}`
    : scope === "round" ? (data?.meta.roundName || "Последний этап")
    : "Очки сообщества за всё время"

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[680px] px-4">
          <div className="mb-1 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-[--gold]" /> Лидерборд</h1>
            <Link href="/fantasy" className="text-xs font-medium text-[--text-muted] hover:text-[--text-primary] transition-colors">Фэнтези →</Link>
          </div>
          <p className="mb-4 text-xs text-[--text-muted]">{subtitle}</p>

          <div className="paddock-control mb-4 flex w-fit items-center gap-1 rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setScope(t.key)}
                aria-pressed={scope === t.key}
                className={cn("rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors", scope === t.key ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* your rank */}
          {data?.me && (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-[--accent]/40 bg-[--accent]/5 px-4 py-2.5 text-[13px]">
              <span className="font-mono text-base font-black text-[--accent]">#{data.me.rank}</span>
              <span className="font-semibold text-[--text-primary]">Твоё место</span>
              <span className="ml-auto font-mono font-bold tabular-nums text-[--text-primary]">{data.me.points} <span className="text-[11px] font-normal text-[--text-muted]">{unit}</span></span>
            </div>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-[--text-muted]">Загрузка…</p>
          ) : !data || data.users.length === 0 ? (
            <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-8 text-center text-sm text-[--text-muted]">
              {scope === "karma" ? "Пока пусто." : "Очки появятся после первого закрытого этапа фэнтези."}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
              {data.users.map((u, i) => {
                const isMe = user?.id === u.id
                const medal = i === 0 ? "var(--color-gold)" : i === 1 ? "#c0c0cc" : i === 2 ? "#cd7f32" : null
                return (
                  <Link
                    key={u.id}
                    href={`/user/${u.username}`}
                    className={cn("grid grid-cols-[2.5rem_1fr_5rem] items-center gap-2 border-b border-[--border-default] px-4 py-2.5 text-[13px] transition-colors last:border-0 hover:bg-[--bg-elevated]", isMe && "bg-[--accent]/8")}
                    style={isMe ? { boxShadow: "inset 3px 0 0 var(--color-accent)" } : undefined}
                  >
                    <span className="font-bold text-[--text-muted]">
                      {medal ? <Medal className="inline h-4 w-4" style={{ color: medal }} /> : i + 1}
                    </span>
                    <div className="flex min-w-0 items-center gap-2">
                      {u.team && <TeamLogo team={u.team} size={14} />}
                      <span className="truncate font-medium" style={u.team ? { color: getTeamColor(u.team) } : undefined}>{u.username}</span>
                      {isMe && <span className="rounded bg-[--accent]/20 px-1.5 text-[9px] font-bold text-[--accent]">вы</span>}
                    </div>
                    <span className="text-right font-mono font-bold tabular-nums text-[--text-primary]">{u.points}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
