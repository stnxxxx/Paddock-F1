"use client"

import { useEffect, useState } from "react"
import { readConsent, saveConsent, type Consent, OPEN_CONSENT_EVENT } from "@/lib/consent"
import { Switch } from "@/components/ui/switch"
import { Cookie } from "lucide-react"

const ACCENT = { backgroundColor: "var(--color-accent)", color: "var(--color-primary-foreground)" }
const ELEVATED = { backgroundColor: "var(--color-bg-elevated)", borderColor: "var(--color-border-default)" }

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [customize, setCustomize] = useState(false)
  const [prefs, setPrefs] = useState<Consent>({ analytics: true, preferences: true, behavior: true })

  useEffect(() => {
    if (!readConsent()) setOpen(true)
    const reopen = () => {
      const c = readConsent()
      if (c) setPrefs(c)
      setCustomize(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_CONSENT_EVENT, reopen)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen)
  }, [])

  if (!open) return null

  const decide = (c: Consent) => { saveConsent(c); setOpen(false); setCustomize(false) }

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4">
      <div className="glass-popup mx-auto max-w-3xl rounded-2xl border border-[--glass-border] p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--color-accent)" }} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-[--text-primary]">Мы используем cookie</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[--text-secondary]">
              Необходимые cookie нужны для входа и работы сайта. С вашего согласия мы также собираем аналитику,
              запоминаем предпочтения и анализируем поведение, чтобы улучшать PADDOCK. Выбор можно настроить.
            </p>

            {customize && (
              <div className="mt-3 space-y-2">
                <Row label="Необходимые" desc="Вход, сессия, безопасность. Всегда включены." checked disabled />
                <Row label="Аналитика" desc="Просмотры страниц, сессии, источники переходов, устройство." checked={prefs.analytics} onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))} />
                <Row label="Предпочтения" desc="Запоминать выбранную вкладку ленты и настройки интерфейса." checked={prefs.preferences} onChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))} />
                <Row label="Поведение" desc="Клики и глубина прокрутки — чтобы улучшать UX." checked={prefs.behavior} onChange={(v) => setPrefs((p) => ({ ...p, behavior: v }))} />
              </div>
            )}

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {!customize && (
                <button onClick={() => setCustomize(true)} className="h-9 rounded-lg border border-[--border-default] px-3.5 text-[13px] font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]" style={{ borderColor: "var(--color-border-default)" }}>
                  Настроить
                </button>
              )}
              <button onClick={() => decide({ analytics: false, preferences: false, behavior: false })} className="h-9 rounded-lg border px-3.5 text-[13px] font-medium text-[--text-secondary] transition-colors hover:text-[--text-primary]" style={{ borderColor: "var(--color-border-default)" }}>
                Только необходимые
              </button>
              {customize ? (
                <button onClick={() => decide(prefs)} style={ACCENT} className="ml-auto h-9 rounded-lg px-4 text-[13px] font-bold text-white transition-[filter] hover:brightness-110">
                  Сохранить выбор
                </button>
              ) : (
                <button onClick={() => decide({ analytics: true, preferences: true, behavior: true })} style={ACCENT} className="ml-auto h-9 rounded-lg px-4 text-[13px] font-bold text-white transition-[filter] hover:brightness-110">
                  Принять все
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, desc, checked, onChange, disabled }: { label: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${disabled ? "opacity-60" : ""}`} style={ELEVATED}>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-[--text-primary]">{label}</span>
        <span className="block text-[11px] text-[--text-muted]">{desc}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onChange={(v) => onChange?.(v)} aria-label={label} />
    </div>
  )
}
