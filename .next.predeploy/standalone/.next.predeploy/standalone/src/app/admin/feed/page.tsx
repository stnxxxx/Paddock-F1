"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"

const FIELDS: { key: string; label: string }[] = [
  { key: "fresh", label: "Свежесть" },
  { key: "engage", label: "Вовлечённость" },
  { key: "follow", label: "Подписки" },
  { key: "team", label: "Команда" },
  { key: "driver", label: "Пилот" },
  { key: "topic", label: "Темы (за тег)" },
  { key: "author", label: "Карма автора" },
  { key: "penaltyDownvotedAuthor", label: "Штраф: даунвоут" },
  { key: "penaltySeen", label: "Штраф: просмотрено" },
  { key: "discoveryShare", label: "Доля открытий (0–1)" },
  { key: "maxPerAuthorPerPage", label: "Макс. постов автора" },
]

export default function AdminFeedWeights() {
  const { user } = useAuth()
  const router = useRouter()
  const [weights, setWeights] = useState<Record<string, number> | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/")
  }, [user, router])

  useEffect(() => {
    if (user?.role === "admin") api.getFeedWeights().then((d) => setWeights(d.weights)).catch(() => {})
  }, [user])

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">Загрузка...</div>
      </div>
    )
  }

  const save = async () => {
    if (!weights) return
    setBusy(true)
    try {
      const d = await api.saveFeedWeights(weights)
      setWeights(d.weights)
      toast.success("Веса сохранены")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <h1 className="mb-1 text-lg font-bold text-[--text-primary]">Веса ленты «Для вас»</h1>
        <p className="mb-5 text-[13px] text-[--text-secondary]">Меняются без передеплоя и влияют на ранжирование сразу.</p>
        {!weights ? (
          <p className="text-sm text-[--text-muted]">Загрузка…</p>
        ) : (
          <div className="space-y-2.5">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[--text-secondary]">{f.label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={weights[f.key] ?? 0}
                  onChange={(e) => setWeights({ ...weights, [f.key]: parseFloat(e.target.value) || 0 })}
                  className="h-9 w-28 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] focus:border-[--border-hover] focus:outline-none"
                />
              </label>
            ))}
            <button
              onClick={save}
              disabled={busy}
              className="mt-3 h-10 w-full rounded-lg bg-[--accent] text-sm font-bold text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-50"
            >
              {busy ? "..." : "Сохранить"}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
