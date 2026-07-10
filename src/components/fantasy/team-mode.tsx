"use client"

import { api, type ApiFantasyAsset, type ApiFantasyTeam } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-context"
import { useCountdown } from "@/lib/f1/use-live-ticker"
import { Modal } from "@/components/ui/modal"
import { AssetCard, EmptySlot } from "./asset-card"
import { FantasyLeagues } from "./leagues"
import { cn } from "@/lib/utils"
import { Lock, Timer, Trophy, Wallet, Star } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

export function TeamMode() {
  const { user } = useAuth()
  const [data, setData] = useState<ApiFantasyTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [drivers, setDrivers] = useState<string[]>([])
  const [constructors, setConstructors] = useState<string[]>([])
  const [captain, setCaptain] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [picker, setPicker] = useState<null | "driver" | "constructor">(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    api.getFantasyTeam().then((d) => {
      setData(d)
      const src = d.lineup ?? d.carryPicks
      setDrivers(src?.drivers ?? [])
      setConstructors(src?.constructors ?? [])
      setCaptain((src && "captain" in src ? src.captain : null) ?? null)
      setName(d.squad?.name ?? "")
    }).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const byId = useMemo(() => new Map((data?.assets ?? []).map((a) => [a.id, a])), [data])
  const rules = data?.rules
  const locked = !!data?.round?.locked
  const resolved = data?.lineup?.points != null

  const picked = useMemo(() => [...drivers, ...constructors], [drivers, constructors])
  const cost = useMemo(() => picked.reduce((s, id) => s + (byId.get(id)?.price ?? 0), 0), [picked, byId])
  const budget = rules?.budget ?? 100
  const budgetLeft = Math.round((budget - cost) * 10) / 10
  const complete = rules ? drivers.length === rules.drivers && constructors.length === rules.constructors : false

  const countdown = useCountdown(data?.round && !locked ? Date.parse(data.round.deadline) : null)

  const add = (asset: ApiFantasyAsset) => {
    if (asset.kind === "driver") {
      if (drivers.length >= (rules?.drivers ?? 5)) return
      setDrivers((d) => [...d, asset.id])
      setCaptain((c) => c ?? asset.id)
    } else {
      if (constructors.length >= (rules?.constructors ?? 2)) return
      setConstructors((c) => [...c, asset.id])
    }
    setPicker(null)
  }

  const remove = (id: string, kind: "driver" | "constructor") => {
    if (kind === "driver") setDrivers((d) => d.filter((x) => x !== id))
    else setConstructors((c) => c.filter((x) => x !== id))
    if (captain === id) setCaptain(null)
  }

  const save = async () => {
    if (!user) { toast.error("Войдите, чтобы собрать команду"); return }
    if (!complete) { toast.error(`Нужно ${rules?.drivers} пилотов и ${rules?.constructors} конструктора`); return }
    if (budgetLeft < 0) { toast.error("Превышен бюджет"); return }
    const cap = (captain && drivers.includes(captain)) ? captain : drivers[0]
    if (!cap) return
    setBusy(true)
    try {
      const res = await api.saveFantasyTeam({ drivers, constructors, captain: cap, name: name.trim() || undefined })
      toast.success(res.lineup.penalty > 0 ? `Состав сохранён · −${res.lineup.penalty} за трансферы` : "Состав сохранён")
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось сохранить") }
    finally { setBusy(false) }
  }

  if (loading) return <p className="py-10 text-center text-sm text-[--text-muted]">Загрузка…</p>

  const overBudget = budgetLeft < 0
  const driverSlots = rules?.drivers ?? 5
  const constructorSlots = rules?.constructors ?? 2

  return (
    <div className="flex flex-col gap-5">
      {/* Round + deadline */}
      {data?.round ? (
        <div className="flex items-center justify-between rounded-xl border border-[--border-default] bg-[--bg-surface] px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">Команда · этап {data.round.round}</div>
            <div className="text-base font-bold text-[--text-primary]">{data.round.name}</div>
            <div className="text-[11px] text-[--text-muted]">{data.round.circuit}{data.round.country ? `, ${data.round.country}` : ""}</div>
          </div>
          <div className="text-right">
            {locked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[--bg-elevated] px-2 py-1 text-[11px] font-semibold text-[--text-muted]"><Lock className="h-3 w-3" /> Заблокирован</span>
            ) : countdown ? (
              <>
                <div className="flex items-center justify-end gap-1 text-[10px] uppercase text-[--text-muted]"><Timer className="h-3 w-3" /> до закрытия</div>
                <div className="font-mono text-sm font-bold tabular-nums text-[--text-primary]">{countdown}</div>
              </>
            ) : null}
            {data.squad && <div className="mt-1 text-[11px] text-[--text-muted]">Очки: <span className="font-bold text-[--gold]">{data.squad.totalPoints}</span></div>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-6 text-center text-sm text-[--text-muted]">
          Сейчас нет открытого этапа. Состав можно будет собрать перед следующей гонкой.
        </div>
      )}

      {/* Budget bar */}
      <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="flex items-center gap-1.5 font-medium text-[--text-secondary]"><Wallet className="h-4 w-4" /> Бюджет</span>
          <span className="font-mono font-semibold tabular-nums">
            <span style={{ color: overBudget ? "var(--color-destructive)" : "var(--color-text-primary)" }}>${cost.toFixed(1)}M</span>
            <span className="text-[--text-muted]"> / ${budget.toFixed(0)}M</span>
            <span className={cn("ml-2", overBudget ? "text-[--destructive]" : "text-emerald-400")}>
              ({overBudget ? "" : "+"}{budgetLeft.toFixed(1)}M)
            </span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[--bg-active]">
          <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(100, (cost / budget) * 100)}%`, backgroundColor: overBudget ? "var(--color-destructive)" : "var(--accent)" }} />
        </div>
        {data?.lineup && !resolved && (
          <div className="mt-2 text-[11px] text-[--text-muted]">
            Трансферы в этом этапе: <b className="text-[--text-secondary]">{data.lineup.transfers}</b> (бесплатно {rules?.freeTransfers}{data.lineup.penalty > 0 ? ` · штраф −${data.lineup.penalty}` : ""})
          </div>
        )}
      </div>

      {/* Squad — drivers */}
      <div>
        <SectionLabel>Пилоты <span className="text-[--text-muted]">{drivers.length}/{driverSlots}</span></SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {drivers.map((id) => {
            const a = byId.get(id)
            if (!a) return null
            return <AssetCard key={id} asset={a} captain={captain === id} onCaptain={locked ? undefined : () => setCaptain(id)} onRemove={locked ? undefined : () => remove(id, "driver")} />
          })}
          {!locked && Array.from({ length: Math.max(0, driverSlots - drivers.length) }).map((_, i) => (
            <EmptySlot key={`d${i}`} label="Добавить пилота" onClick={() => setPicker("driver")} />
          ))}
        </div>
      </div>

      {/* Squad — constructors */}
      <div>
        <SectionLabel>Конструкторы <span className="text-[--text-muted]">{constructors.length}/{constructorSlots}</span></SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {constructors.map((id) => {
            const a = byId.get(id)
            if (!a) return null
            return <AssetCard key={id} asset={a} onRemove={locked ? undefined : () => remove(id, "constructor")} />
          })}
          {!locked && Array.from({ length: Math.max(0, constructorSlots - constructors.length) }).map((_, i) => (
            <EmptySlot key={`c${i}`} label="Добавить конструктора" onClick={() => setPicker("constructor")} />
          ))}
        </div>
      </div>

      {/* Save bar */}
      {!locked && (
        <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-[--border-default] bg-[--bg-surface]/95 p-3 backdrop-blur sm:flex-row sm:items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название команды"
            maxLength={40}
            className="h-9 flex-1 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--border-hover] focus:outline-none"
          />
          <div className="flex items-center gap-2 text-[11px] text-[--text-muted]">
            <Star className="h-3.5 w-3.5" /> Капитан: {captain ? <b className="text-[--text-secondary]">{byId.get(captain)?.ref ?? byId.get(captain)?.name}</b> : "не выбран"} (×{rules?.captainMultiplier})
          </div>
          <button
            onClick={save}
            disabled={busy || !complete || overBudget}
            className="h-9 rounded-lg px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {busy ? "…" : data?.squad ? "Сохранить состав" : "Создать команду"}
          </button>
        </div>
      )}

      {/* Resolved points breakdown */}
      {resolved && data?.lineup?.breakdown && (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[--text-primary]">Очки за этап</h3>
            <span className="font-mono text-lg font-black text-[--gold]">{data.lineup.points}</span>
          </div>
          <div className="space-y-1">
            {Object.entries(data.lineup.breakdown).filter(([k]) => k !== "__penalty").map(([id, pts]) => {
              const a = byId.get(id)
              return (
                <div key={id} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a?.color ?? "#666" }} />
                  <span className="text-[--text-secondary]">{a?.name ?? id}</span>
                  {captain === id && <span className="rounded bg-[--bg-active] px-1 text-[9px] font-bold text-[--text-muted]">КАП ×{rules?.captainMultiplier}</span>}
                  <span className="ml-auto font-mono font-semibold text-[--text-primary]">{pts}</span>
                </div>
              )
            })}
            {data.lineup.breakdown.__penalty != null && (
              <div className="flex items-center gap-2 text-[12px] text-[--destructive]">
                <span className="ml-auto font-mono font-semibold">{data.lineup.breakdown.__penalty} (трансферы)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard + leagues */}
      <div className="grid gap-5 md:grid-cols-2">
        <Leaderboard data={data} />
        <FantasyLeagues />
      </div>

      {/* Market picker */}
      <Modal open={picker !== null} onClose={() => setPicker(null)} size="lg" title={picker === "driver" ? "Выбор пилота" : "Выбор конструктора"} description={`Доступно: $${budgetLeft.toFixed(1)}M`}>
        <Market
          kind={picker}
          assets={data?.assets ?? []}
          picked={picked}
          budgetLeft={budgetLeft}
          onAdd={add}
        />
      </Modal>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-[--text-secondary]">{children}</h2>
}

function Market({ kind, assets, picked, budgetLeft, onAdd }: {
  kind: "driver" | "constructor" | null
  assets: ApiFantasyAsset[]
  picked: string[]
  budgetLeft: number
  onAdd: (a: ApiFantasyAsset) => void
}) {
  const list = assets
    .filter((a) => a.kind === kind && !picked.includes(a.id))
    .sort((a, b) => b.price - a.price)
  return (
    <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
      {list.map((a) => {
        const tooExpensive = a.price > budgetLeft + 1e-6
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2">
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image} alt={a.name} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ backgroundColor: a.color ?? "#555" }} />
            ) : (
              <span className="h-9 w-9 shrink-0 rounded-full" style={{ backgroundColor: a.color ?? "#555" }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-[--text-primary]">{a.name}</div>
              <div className="text-[11px] text-[--text-muted]">{a.team || "Конструктор"} · {a.points} очк.</div>
            </div>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-[--text-secondary]">${a.price.toFixed(1)}M</span>
            <button
              onClick={() => onAdd(a)}
              disabled={tooExpensive}
              className="h-8 rounded-lg px-3 text-xs font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {tooExpensive ? "Дорого" : "Добавить"}
            </button>
          </div>
        )
      })}
      {list.length === 0 && <p className="py-6 text-center text-sm text-[--text-muted]">Нет доступных вариантов</p>}
    </div>
  )
}

function Leaderboard({ data }: { data: ApiFantasyTeam | null }) {
  const rows = data?.leaderboard ?? []
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[--text-primary]"><Trophy className="h-4 w-4 text-[--gold]" /> Общий зачёт</h3>
      {rows.length === 0 ? (
        <p className="text-[12px] text-[--text-muted]">Очки появятся после первого завершённого этапа.</p>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={r.id} className="flex items-center gap-2.5 text-[13px]">
              <span className="w-5 text-right font-mono text-[--text-muted]">{i + 1}</span>
              <span className="truncate font-medium text-[--text-primary]">{r.name || r.display_name || r.username}</span>
              <span className="truncate text-[11px] text-[--text-muted]">@{r.username}</span>
              <span className="ml-auto font-mono font-bold text-[--gold]">{r.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
