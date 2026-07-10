"use client"

import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth/auth-context"
import { TeamLogo } from "@/components/ui/team-logo"
import { ALL_DRIVERS } from "@/lib/drivers"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AtSign, Bell, EyeOff, Flag, Key, Trash2, User } from "lucide-react"

type Tab = "f1" | "account" | "notifications" | "privacy"

const TABS: { key: Tab; label: string }[] = [
  { key: "f1", label: "Команда и пилот" },
  { key: "account", label: "Аккаунт" },
  { key: "notifications", label: "Уведомления" },
  { key: "privacy", label: "Приватность" },
]

const TEAMS = [
  "Red Bull", "Ferrari", "McLaren", "Mercedes", "Aston Martin",
  "Alpine", "Williams", "Racing Bulls", "Haas", "Audi", "Cadillac",
]

const NOTIF_FIELDS = [
  { key: "notif_comments", label: "Комментарии к постам" },
  { key: "notif_upvotes", label: "Апвоуты ваших постов" },
  { key: "notif_mentions", label: "Упоминания (@ник)" },
  { key: "notif_fantasy", label: "Результаты фэнтези" },
] as const

const PRIVACY_FIELDS = [
  { key: "hide_team", label: "Скрыть команду в профиле" },
  { key: "hide_driver", label: "Скрыть пилота в профиле" },
  { key: "hide_leaderboard", label: "Не показывать меня в лидерборде" },
] as const

type Prefs = Record<string, number>

export default function SettingsPage() {
  const { user, logout, updateTeam, updateDriver } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("f1")
  const [prefs, setPrefs] = useState<Prefs>({})

  useEffect(() => {
    fetch("/api/auth/preferences").then((r) => r.json()).then((d) => { if (d.preferences) setPrefs(d.preferences) }).catch(() => {})
  }, [])

  const savePref = async (key: string, val: number) => {
    setPrefs((p) => ({ ...p, [key]: val }))
    await fetch("/api/auth/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: val }) }).catch(() => {})
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">Войдите, чтобы открыть настройки</div>
      </div>
    )
  }

  const selectedTeam = user.team || null
  const teamDrivers = selectedTeam ? ALL_DRIVERS.filter((d) => d.active && d.team === selectedTeam) : []
  const otherDrivers = ALL_DRIVERS.filter((d) => d.active && (!selectedTeam || d.team !== selectedTeam))

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[720px] px-4">
          <h1 className="mb-5 text-xl font-bold">Настройки</h1>

          <div className="paddock-control mb-5 flex w-fit flex-wrap gap-1 rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  tab === t.key ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "f1" && (
            <div className="space-y-4">
              <Card>
                <CardTitle icon={Flag}>Команда</CardTitle>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {TEAMS.map((t) => {
                    const active = user.team === t
                    return (
                      <button
                        key={t}
                        onClick={() => updateTeam(active ? null : t)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors",
                          active ? "bg-[--accent]/10 ring-1 ring-[--accent]" : "opacity-70 hover:bg-[--bg-elevated] hover:opacity-100"
                        )}
                      >
                        <TeamLogo team={t} size={26} />
                        <span className="max-w-full truncate text-[9px] text-[--text-muted]">{t}</span>
                      </button>
                    )
                  })}
                </div>
              </Card>

              <Card>
                <CardTitle icon={User}>Любимый пилот</CardTitle>
                {selectedTeam && teamDrivers.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[--text-muted]">Пилоты {selectedTeam}</div>
                    <div className="flex flex-wrap gap-2">
                      {teamDrivers.map((d) => <DriverChip key={d.code} d={d} active={user.driver === d.code} onClick={() => updateDriver(user.driver === d.code ? null : d.code)} />)}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[--text-muted]">{selectedTeam ? "Остальные пилоты 2026" : "Все пилоты 2026"}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {otherDrivers.map((d) => <DriverChip key={d.code} d={d} active={user.driver === d.code} small onClick={() => updateDriver(user.driver === d.code ? null : d.code)} />)}
                  </div>
                </div>
                {user.driver && (
                  <button onClick={() => updateDriver(null)} className="mt-3 text-[11px] text-[--text-muted] transition-colors hover:text-[--text-primary]">Сбросить пилота</button>
                )}
              </Card>
            </div>
          )}

          {tab === "account" && <AccountTab email={user.email} onLoggedOut={() => { logout(); router.push("/") }} />}

          {tab === "notifications" && (
            <Card>
              <CardTitle icon={Bell}>Уведомления</CardTitle>
              <div className="divide-y divide-[--border-default]">
                {NOTIF_FIELDS.map((n) => <Toggle key={n.key} label={n.label} checked={!!prefs[n.key]} onChange={(v) => savePref(n.key, v ? 1 : 0)} />)}
              </div>
            </Card>
          )}

          {tab === "privacy" && (
            <Card>
              <CardTitle icon={EyeOff}>Приватность</CardTitle>
              <div className="divide-y divide-[--border-default]">
                {PRIVACY_FIELDS.map((n) => <Toggle key={n.key} label={n.label} checked={!!prefs[n.key]} onChange={(v) => savePref(n.key, v ? 1 : 0)} />)}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[--text-muted]">Изменения сохраняются сразу. Скрытые команда и пилот не видны другим пользователям, но остаются у вас.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

function AccountTab({ email, onLoggedOut }: { email: string; onLoggedOut: () => void }) {
  const [newEmail, setNewEmail] = useState("")
  const [emailPass, setEmailPass] = useState("")
  const [curPass, setCurPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [delPass, setDelPass] = useState("")
  const [busy, setBusy] = useState<"" | "email" | "password" | "delete">("")

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Ошибка запроса")
    return data
  }

  const changeEmail = async () => {
    if (!newEmail.trim() || !emailPass) return toast.error("Заполните email и пароль")
    setBusy("email")
    try {
      await post("/api/auth/email", { email: newEmail.trim(), password: emailPass })
      setNewEmail(""); setEmailPass("")
      toast.success("Email изменён")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") } finally { setBusy("") }
  }

  const changePassword = async () => {
    if (newPass !== confirmPass) return toast.error("Пароли не совпадают")
    setBusy("password")
    try {
      await post("/api/auth/password", { currentPassword: curPass, newPassword: newPass })
      setCurPass(""); setNewPass(""); setConfirmPass("")
      toast.success("Пароль изменён")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") } finally { setBusy("") }
  }

  const deleteAccount = async () => {
    if (!delPass) return toast.error("Введите пароль для подтверждения")
    if (!confirm("Удалить аккаунт? Доступ будет закрыт, личные данные удалены. Это необратимо.")) return
    setBusy("delete")
    try {
      await post("/api/auth/delete", { password: delPass })
      toast.success("Аккаунт удалён")
      onLoggedOut()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); setBusy("") }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={AtSign}>Email</CardTitle>
        <p className="mb-3 text-xs text-[--text-muted]">Текущий: <span className="font-medium text-[--text-secondary]">{email}</span></p>
        <div className="space-y-2">
          <Input value={newEmail} onChange={setNewEmail} type="email" placeholder="Новый email" autoComplete="email" />
          <Input value={emailPass} onChange={setEmailPass} type="password" placeholder="Текущий пароль" autoComplete="current-password" />
          <Button size="sm" onClick={changeEmail} disabled={busy === "email"}>{busy === "email" ? "…" : "Сменить email"}</Button>
        </div>
      </Card>

      <Card>
        <CardTitle icon={Key}>Пароль</CardTitle>
        <div className="space-y-2">
          <Input value={curPass} onChange={setCurPass} type="password" placeholder="Текущий пароль" autoComplete="current-password" />
          <Input value={newPass} onChange={setNewPass} type="password" placeholder="Новый пароль" autoComplete="new-password" />
          <Input value={confirmPass} onChange={setConfirmPass} type="password" placeholder="Повторите новый пароль" autoComplete="new-password" />
          <Button size="sm" onClick={changePassword} disabled={busy === "password"}>{busy === "password" ? "…" : "Сменить пароль"}</Button>
        </div>
      </Card>

      <section className="rounded-2xl border border-[--destructive]/30 bg-[--destructive]/5 p-4">
        <CardTitle icon={Trash2} danger>Опасная зона</CardTitle>
        <p className="mb-3 text-xs leading-5 text-[--text-muted]">Удаление аккаунта необратимо: доступ закрывается, профиль и личные данные удаляются. Посты останутся без привязки к вам.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1"><Input value={delPass} onChange={setDelPass} type="password" placeholder="Пароль для подтверждения" autoComplete="current-password" /></div>
          <Button size="sm" onClick={deleteAccount} disabled={busy === "delete"} className="text-white hover:brightness-110" style={{ backgroundColor: "var(--color-destructive)" }}>
            <Trash2 className="h-3.5 w-3.5" />{busy === "delete" ? "Удаление…" : "Удалить аккаунт"}
          </Button>
        </div>
      </section>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4">{children}</section>
}

function CardTitle({ icon: Icon, children, danger }: { icon: typeof Flag; children: React.ReactNode; danger?: boolean }) {
  return (
    <h3 className={cn("mb-3 flex items-center gap-2 text-sm font-semibold", danger ? "text-[--destructive]" : "text-[--text-primary]")}>
      <Icon className={cn("h-4 w-4", danger ? "text-[--destructive]" : "text-[--accent]")} />{children}
    </h3>
  )
}

function Input({ value, onChange, type = "text", placeholder, autoComplete }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className="h-9 w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--border-hover] focus:outline-none focus:ring-2 focus:ring-[--accent]/20"
    />
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
      <span className="text-[13px] text-[--text-primary]">{label}</span>
      <Switch checked={checked} onChange={onChange} aria-label={label} />
    </div>
  )
}

function DriverChip({ d, active, onClick, small }: { d: { code: string; name: string; team?: string }; active: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors",
        small ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
        active ? "bg-[--accent]/10 text-[--accent] ring-1 ring-[--accent]/30" : "bg-[--bg-elevated] text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]"
      )}
    >
      <span className="font-mono font-bold">{d.code}</span>
      <span>{d.name}</span>
      {d.team && <TeamLogo team={d.team} size={small ? 11 : 13} />}
    </button>
  )
}
