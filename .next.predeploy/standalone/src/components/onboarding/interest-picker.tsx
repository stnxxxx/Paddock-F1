"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-context"
import { api } from "@/lib/api"
import { Modal } from "@/components/ui/modal"
import Link from "next/link"
import { toast } from "sonner"

const TOPICS = ["Новость", "Техника", "Слухи", "Аналитика", "Стратегия", "Квалификация", "Трансферы", "Мемы", "История", "Болид"]

export function InterestPicker() {
  const { user, refreshUser } = useAuth()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  if (!user) return null
  const open = !user.onboarded && !done

  const toggle = (t: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  // Skip: close instantly, persist in the background (best-effort).
  const dismiss = () => {
    if (busy) return
    setDone(true)
    api.completeOnboarding({ tags: [] }).then(() => { void refreshUser?.() }).catch(() => {})
  }

  // Save chosen topics, then close once the server accepts (independent of refreshUser).
  const finish = async () => {
    setBusy(true)
    try {
      await api.completeOnboarding({ tags: [...selected] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить")
      setBusy(false)
      return
    }
    setDone(true)
    void refreshUser?.()
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      dismissible={!busy}
      size="md"
      title="Настроим ленту «Для вас»"
      description="Выберите интересные темы — будем показывать больше такого."
      footer={
        <>
          <button
            onClick={dismiss}
            disabled={busy}
            className="h-9 rounded-lg px-4 text-sm font-medium text-[--text-muted] transition-colors hover:text-[--text-primary]"
          >
            Пропустить
          </button>
          <button
            onClick={finish}
            disabled={busy}
            className="h-9 rounded-lg bg-[--accent] px-5 text-sm font-bold text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-50"
          >
            {busy ? "..." : "Готово"}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => {
          const on = selected.has(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={on}
              style={on ? { backgroundColor: "var(--color-accent)", borderColor: "var(--color-accent)", color: "var(--color-primary-foreground)" } : undefined}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                on ? "" : "border-[--border-default] text-[--text-secondary] hover:border-[--border-hover] hover:text-[--text-primary]"
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>
      {!user.team && (
        <p className="mt-4 text-[11px] text-[--text-muted]">
          Любимую команду и пилота можно выбрать в <Link href="/settings" className="text-[--accent] hover:underline">настройках</Link> — лента их учтёт.
        </p>
      )}
    </Modal>
  )
}
