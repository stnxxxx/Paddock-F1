"use client"

import { api, type ApiFantasyLeague } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-context"
import { Copy, Plus, Trash2, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function FantasyLeagues() {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<ApiFantasyLeague[]>([])
  const [createName, setCreateName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<string | null>(null)

  const load = () => api.getFantasyLeagues().then((d) => setLeagues(d.leagues)).catch(() => {})
  useEffect(() => { if (user) load() }, [user])

  const create = async () => {
    if (!createName.trim() || busy) return
    setBusy(true)
    try { await api.createFantasyLeague(createName.trim()); setCreateName(""); toast.success("Лига создана"); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") }
    finally { setBusy(false) }
  }
  const del = async (lg: ApiFantasyLeague) => {
    if (!confirm(`Удалить лигу «${lg.name}»? Это действие необратимо.`)) return
    setBusy(true)
    try { await api.deleteFantasyLeague(lg.id); toast.success("Лига удалена"); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") }
    finally { setBusy(false) }
  }
  const join = async () => {
    if (!joinCode.trim() || busy) return
    setBusy(true)
    try { await api.joinFantasyLeague(joinCode.trim()); setJoinCode(""); toast.success("Вы вступили в лигу"); load() }
    catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") }
    finally { setBusy(false) }
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[--text-primary]"><Users className="h-4 w-4" /> Лиги</h3>
        <p className="text-[12px] text-[--text-muted]">Войдите, чтобы создавать лиги и соревноваться с друзьями.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[--text-primary]"><Users className="h-4 w-4" /> Мини-лиги</h3>

      <div className="mb-3 space-y-2">
        <div className="flex gap-1.5">
          <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Новая лига" maxLength={40}
            className="h-8 min-w-0 flex-1 rounded-md border border-[--border-default] bg-[--bg-elevated] px-2.5 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none" />
          <button onClick={create} disabled={busy} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}><Plus className="h-3.5 w-3.5" />Создать</button>
        </div>
        <div className="flex gap-1.5">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Код лиги" maxLength={6}
            className="h-8 min-w-0 flex-1 rounded-md border border-[--border-default] bg-[--bg-elevated] px-2.5 font-mono text-xs uppercase text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none" />
          <button onClick={join} disabled={busy} className="h-8 shrink-0 rounded-md border border-[--border-default] px-3 text-xs font-semibold text-[--text-primary] hover:bg-[--bg-hover] disabled:opacity-50">Вступить</button>
        </div>
      </div>

      {leagues.length === 0 ? (
        <p className="text-[12px] text-[--text-muted]">Вы пока не в лигах. Создайте свою или вступите по коду.</p>
      ) : (
        <div className="space-y-2">
          {leagues.map((lg) => (
            <div key={lg.id} className="rounded-lg border border-[--border-default] bg-[--bg-elevated]">
              <div className="flex items-center gap-2 px-3 py-2">
                <button onClick={() => setOpen(open === lg.id ? null : lg.id)} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-[--text-primary]" title={lg.name}>{lg.name}</button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(lg.code); toast.success(`Код ${lg.code} скопирован`) }}
                  className="flex shrink-0 items-center gap-1 rounded bg-[--bg-active] px-1.5 py-0.5 font-mono text-[10px] text-[--text-secondary] hover:text-[--text-primary]"
                  title="Скопировать код"
                ><Copy className="h-3 w-3" />{lg.code}</button>
                {lg.isOwner && (
                  <button
                    onClick={() => del(lg)}
                    disabled={busy}
                    className="flex shrink-0 items-center justify-center rounded p-0.5 text-[--text-muted] hover:bg-[--bg-active] hover:text-[--destructive] disabled:opacity-50"
                    title="Удалить лигу"
                  ><Trash2 className="h-3.5 w-3.5" /></button>
                )}
                <span className="shrink-0 text-[11px] text-[--text-muted]">{lg.members} уч.</span>
              </div>
              {open === lg.id && lg.standings && (
                <div className="space-y-1 border-t border-[--border-default] px-3 py-2">
                  {lg.standings.map((s, i) => (
                    <div key={s.username} className="flex items-center gap-2 text-[12px]">
                      <span className="w-4 text-right font-mono text-[--text-muted]">{i + 1}</span>
                      <span className="truncate text-[--text-secondary]">{s.squad_name || s.display_name || s.username}</span>
                      <span className="truncate text-[10px] text-[--text-muted]">@{s.username}</span>
                      <span className="ml-auto font-mono font-bold text-[--gold]">{s.points}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
