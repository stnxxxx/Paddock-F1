"use client"

import { useAuth } from "@/components/auth/auth-context"
import { api, type ApiFantasy, type ApiFantasyDriver, type FantasyQKey } from "@/lib/api"
import { Modal } from "@/components/ui/modal"
import { useCountdown } from "@/lib/f1/use-live-ticker"
import { cn } from "@/lib/utils"
import { Check, Flag, Lock, Target, Timer, Trophy, X, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const Q_META: Record<FantasyQKey, { label: string; icon: typeof Trophy; weight: string }> = {
  winner: { label: "Победитель гонки", icon: Trophy, weight: "25" },
  podium: { label: "Подиум (топ-3)", icon: Flag, weight: "10×3 +15" },
  pole: { label: "Поул-позиция", icon: Timer, weight: "15" },
  fastest_lap: { label: "Быстрый круг", icon: Zap, weight: "10" },
  dnf: { label: "Первый сход", icon: X, weight: "15" },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-wide text-[--text-secondary]">{children}</h2>
}

type PickerTarget = { q: FantasyQKey; index?: number } | null

export function PredictionMode() {
  const { user } = useAuth()
  const [data, setData] = useState<ApiFantasy | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<PickerTarget>(null)

  const load = () => api.getFantasy().then((d) => {
    setData(d)
    setAnswers(d.current?.myAnswers || {})
  }).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const current = data?.current
  const drivers = data?.drivers || []
  const countdown = useCountdown(current && !current.locked ? Date.parse(current.deadline) : null)

  const setSingle = (q: FantasyQKey, v: string) => {
    setAnswers((a) => ({ ...a, [q]: v }))
    setPicker(null)
  }
  const setPodium = (i: number, v: string) => {
    setAnswers((a) => {
      const arr = Array.isArray(a.podium) ? [...a.podium] : ["", "", ""]
      arr[i] = v
      return { ...a, podium: arr }
    })
    setPicker(null)
  }

  const submit = async () => {
    if (!current || busy) return
    if (!user) { toast.error("Войдите, чтобы делать прогнозы"); return }
    setBusy(true)
    try {
      await api.submitFantasy(current.id, answers)
      toast.success("Прогноз сохранён")
      load()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось сохранить") }
    finally { setBusy(false) }
  }

  if (loading) return <p className="py-10 text-center text-sm text-[--text-muted]">Загрузка…</p>

  return (
    <div className="flex flex-col gap-5">
      {/* Round + deadline */}
      {current ? (
        <div className="flex items-center justify-between rounded-xl border border-[--border-default] bg-[--bg-surface] px-4 py-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[--text-muted]">Прогноз · этап {current.round}</div>
            <div className="text-base font-bold text-[--text-primary]">{current.name}</div>
            <div className="text-[11px] text-[--text-muted]">{current.circuit}{current.country ? `, ${current.country}` : ""}</div>
          </div>
          <div className="text-right">
            {current.locked ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[--bg-elevated] px-2 py-1 text-[11px] font-semibold text-[--text-muted]"><Lock className="h-3 w-3" /> Приём закрыт</span>
            ) : countdown ? (
              <>
                <div className="flex items-center justify-end gap-1 text-[10px] uppercase text-[--text-muted]"><Timer className="h-3 w-3" /> до закрытия</div>
                <div className="font-mono text-sm font-bold tabular-nums text-[--text-primary]">{countdown}</div>
              </>
            ) : null}
            <div className="mt-1 text-[11px] text-[--text-muted]">{current.entryCount} участников</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-6 text-center text-sm text-[--text-muted]">
          Сейчас нет открытого этапа. Прогноз появится перед следующей гонкой.
        </div>
      )}

      {/* Questions */}
      {current && (
        <div>
          <SectionLabel><span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Твой прогноз</span></SectionLabel>
          <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface] divide-y divide-[--border-default]">
            {current.questions.map((q) => {
              const M = Q_META[q]
              const Icon = M.icon
              return (
                <div key={q} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--color-accent-soft)" }}>
                      <Icon className="h-4 w-4 text-[--accent]" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[--text-primary]">{M.label}</div>
                      <div className="text-[10px] text-[--text-muted]">+{M.weight} очк.</div>
                    </div>
                  </div>
                  {q === "podium" ? (
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => {
                        const val = Array.isArray(answers.podium) ? answers.podium[i] : ""
                        const d = drivers.find((d) => d.code === val)
                        return (
                          <button
                            key={i}
                            onClick={() => !current.locked && setPicker({ q, index: i })}
                            disabled={current.locked}
                            className={cn(
                              "h-8 min-w-[4.75rem] rounded-lg border px-2 text-[13px] font-bold font-mono transition-colors",
                              d ? "border-[--border-default] bg-[--bg-elevated]" : "border-dashed border-[--border-default] bg-[--bg-surface] text-[--text-muted]",
                              !current.locked && "hover:border-[--accent] cursor-pointer"
                            )}
                            style={d ? { color: d.color, borderColor: d.color + "40" } : undefined}
                          >
                            {d ? d.code : `P${i + 1}`}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    (() => {
                      const val = typeof answers[q] === "string" ? answers[q] as string : ""
                      const d = drivers.find((d) => d.code === val)
                      return (
                        <button
                          onClick={() => !current.locked && setPicker({ q })}
                          disabled={current.locked}
                          className={cn(
                            "h-8 min-w-[4.75rem] rounded-lg border px-2 text-[13px] font-bold font-mono transition-colors",
                            d ? "border-[--border-default] bg-[--bg-elevated]" : "border-dashed border-[--border-default] bg-[--bg-surface] text-[--text-muted]",
                            !current.locked && "hover:border-[--accent] cursor-pointer"
                          )}
                          style={d ? { color: d.color, borderColor: d.color + "40" } : undefined}
                        >
                          {d ? d.code : "—"}
                        </button>
                      )
                    })()
                  )}
                </div>
              )
            })}
          </div>

          {!current.locked && (
            <div className="sticky bottom-3 z-10 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[--border-default] bg-[--bg-surface]/95 p-3 backdrop-blur">
              <span className="text-[11px] text-[--text-muted]">Можно менять до старта квалификации</span>
              <button onClick={submit} disabled={busy} className="h-9 rounded-lg px-5 text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {busy ? "…" : current.myAnswers ? "Обновить прогноз" : "Сохранить прогноз"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Driver picker modal */}
      <Modal
        open={picker !== null}
        onClose={() => setPicker(null)}
        size="lg"
        title="Выбор пилота"
        description={picker?.q ? Q_META[picker.q].label : undefined}
      >
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
          {drivers.map((d) => {
            const isPicked = picker?.q === "podium" && picker?.index != null
              ? (Array.isArray(answers.podium) && answers.podium[picker.index] === d.code)
              : answers[picker?.q ?? ""] === d.code
            return (
              <button
                key={d.code}
                onClick={() => {
                  if (picker?.q === "podium" && picker?.index != null) {
                    setPodium(picker.index, d.code)
                  } else if (picker?.q) {
                    setSingle(picker.q, d.code)
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
                  isPicked
                    ? "border-[--accent] bg-[--bg-accent-soft]"
                    : "border-[--border-default] bg-[--bg-elevated] hover:border-[--border-hover]"
                )}
              >
                {d.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image} alt={d.name} className="h-9 w-9 shrink-0 rounded-full object-cover" style={{ backgroundColor: d.color }} />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: d.color }}>
                    {d.code}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[--text-primary]">{d.name}</div>
                  <div className="text-[11px] text-[--text-muted]">{d.team}</div>
                </div>
                {isPicked && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[--accent]">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </Modal>

      {/* Recent results */}
      {data && data.recent.length > 0 && (
        <div>
          <SectionLabel>Прошедшие этапы</SectionLabel>
          <div className="flex flex-col gap-2.5">
            {data.recent.map((r) => (
              <div key={r.id} className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-[--text-primary]">{r.name}</div>
                  <div className="text-right">
                    <span className="font-mono text-lg font-black text-[--gold]">{r.myPoints ?? 0}</span>
                    <span className="ml-1 text-[11px] text-[--text-muted]">очк.</span>
                  </div>
                </div>
                {r.myBreakdown ? (
                  <div className="space-y-1">
                    {r.questions.map((q) => {
                      const b = r.myBreakdown?.[q]
                      if (!b) return null
                      const ok = b.points > 0
                      return (
                        <div key={q} className="flex items-center gap-2 text-[11px]">
                          {ok ? <Check className="h-3 w-3 text-emerald-400" /> : <X className="h-3 w-3 text-[--text-muted]" />}
                          <span className="text-[--text-muted]">{Q_META[q].label}:</span>
                          <span className="font-mono font-semibold text-[--text-secondary]">{Array.isArray(b.answer) ? (b.answer as string[]).join("·") : (b.answer as string) || "—"}</span>
                          <span className="text-[--text-placeholder]">→</span>
                          <span className="font-mono text-[--text-muted]">{Array.isArray(b.correct) ? (b.correct as string[]).join("·") : (b.correct as string) || "—"}</span>
                          <span className={cn("ml-auto font-mono font-bold", ok ? "text-emerald-400" : "text-[--text-muted]")}>+{b.points}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[--text-muted]">Ты не делал прогноз · топ {r.topScore} очк. · {r.entryCount} участников</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}