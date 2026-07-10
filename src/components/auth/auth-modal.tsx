"use client"

import { useState } from "react"
import { useAuth } from "./auth-context"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"

interface Props {
  open: boolean
  onClose: () => void
}

type View = "login" | "register" | "forgot"

const inputClass =
  "w-full h-9 rounded-lg bg-[--bg-elevated] border border-[--border-default] px-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] transition-[color,border-color] focus:outline-none focus:border-[--border-hover] focus:ring-2 focus:ring-[--accent]/20"

const msg = (e: unknown) => (e instanceof Error ? e.message : "Что-то пошло не так")

const TITLE: Record<View, string> = {
  login: "Вход в PADDOCK",
  register: "Регистрация",
  forgot: "Восстановление пароля",
}

export function AuthModal({ open, onClose }: Props) {
  const { login, loginWithCode, register, requestCode, resetPassword } = useAuth()

  const [view, setView] = useState<View>("login")
  const [byCode, setByCode] = useState(false) // login: password vs email-code
  const [codeSent, setCodeSent] = useState(false) // a code step is active

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")

  const [error, setError] = useState("")
  const [info, setInfo] = useState("")
  const [devCode, setDevCode] = useState("")
  const [busy, setBusy] = useState(false)

  const switchView = (v: View) => {
    setView(v); setByCode(false); setCodeSent(false)
    setError(""); setInfo(""); setCode(""); setDevCode("")
  }

  const sendCode = async (purpose: "register" | "login" | "reset") => {
    if (!email.trim()) { setError("Укажите email"); return }
    if (view === "register" && password.length < 6) { setError("Пароль: минимум 6 символов"); return }
    setError(""); setInfo(""); setBusy(true)
    try {
      const r = await requestCode(email.trim(), purpose)
      setCodeSent(true)
      setDevCode(r.dev_code || "")
      setInfo(`Код отправлен на ${email.trim()}`)
    } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }

  const run = async (fn: () => Promise<void>) => {
    setError(""); setBusy(true)
    try { await fn() } catch (e) { setError(msg(e)) } finally { setBusy(false) }
  }

  const doRegister = () => run(async () => { await register(username.trim(), email.trim(), password, code.trim()); onClose() })
  const doLoginCode = () => run(async () => { await loginWithCode(email.trim(), code.trim()); onClose() })
  const doLoginPassword = () => run(async () => { await login(email.trim(), password); onClose() })
  const doReset = () => run(async () => {
    await resetPassword(email.trim(), code.trim(), password)
    setCodeSent(false); setCode(""); setPassword("")
    setView("login"); setByCode(false)
    setInfo("Пароль изменён — войдите с новым паролем")
  })

  const feedback = (
    <>
      {info && !error && <p className="text-xs text-[--text-secondary]">{info}</p>}
      {devCode && <p className="text-[11px] text-[--text-muted]">Dev-режим: код <span className="font-mono font-semibold text-[--text-secondary]">{devCode}</span> (почта не настроена)</p>}
      {error && <p className="text-xs text-[--destructive]">{error}</p>}
    </>
  )

  const codeField = (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="Код из письма (6 цифр)"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className={`${inputClass} text-center font-mono tracking-[0.4em]`}
    />
  )

  const resend = (purpose: "register" | "login" | "reset") => (
    <button type="button" onClick={() => sendCode(purpose)} disabled={busy} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">
      Отправить код повторно
    </button>
  )

  return (
    <Modal open={open} onClose={onClose} title={TITLE[view]}>
      <div className="space-y-3.5">
        {view === "register" && (
          codeSent ? (
            <form onSubmit={(e) => { e.preventDefault(); doRegister() }} className="space-y-3.5">
              {codeField}
              {feedback}
              <Button type="submit" disabled={busy || code.length < 6} className="h-9 w-full">{busy ? "..." : "Создать аккаунт"}</Button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setCodeSent(false); setCode("") }} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">← Изменить данные</button>
                {resend("register")}
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); sendCode("register") }} className="space-y-3.5">
              <input type="text" placeholder="Имя пользователя" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} required />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} minLength={6} required />
              <p className="text-[10px] text-[--text-muted]">Имя: 3–24 символа. Пароль: минимум 6. На email придёт код подтверждения.</p>
              {feedback}
              <Button type="submit" disabled={busy} className="h-9 w-full">{busy ? "..." : "Получить код"}</Button>
            </form>
          )
        )}

        {view === "login" && (
          byCode ? (
            codeSent ? (
              <form onSubmit={(e) => { e.preventDefault(); doLoginCode() }} className="space-y-3.5">
                {codeField}
                {feedback}
                <Button type="submit" disabled={busy || code.length < 6} className="h-9 w-full">{busy ? "..." : "Войти"}</Button>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => { setCodeSent(false); setCode("") }} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">← Назад</button>
                  {resend("login")}
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); sendCode("login") }} className="space-y-3.5">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
                {feedback}
                <Button type="submit" disabled={busy} className="h-9 w-full">{busy ? "..." : "Получить код"}</Button>
                <button type="button" onClick={() => { setByCode(false); setError("") }} className="block w-full text-center text-[11px] text-[--text-muted] hover:text-[--text-primary]">Войти по паролю</button>
              </form>
            )
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); doLoginPassword() }} className="space-y-3.5">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
              {feedback}
              <Button type="submit" disabled={busy} className="h-9 w-full">{busy ? "..." : "Войти"}</Button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setByCode(true); setError(""); setInfo("") }} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">Войти по коду</button>
                <button type="button" onClick={() => switchView("forgot")} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">Забыли пароль?</button>
              </div>
            </form>
          )
        )}

        {view === "forgot" && (
          codeSent ? (
            <form onSubmit={(e) => { e.preventDefault(); doReset() }} className="space-y-3.5">
              {codeField}
              <input type="password" placeholder="Новый пароль" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} minLength={6} required />
              {feedback}
              <Button type="submit" disabled={busy || code.length < 6} className="h-9 w-full">{busy ? "..." : "Сменить пароль"}</Button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setCodeSent(false); setCode("") }} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">← Назад</button>
                {resend("reset")}
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); sendCode("reset") }} className="space-y-3.5">
              <input type="email" placeholder="Email аккаунта" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              <p className="text-[10px] text-[--text-muted]">Если аккаунт существует, на email придёт код для сброса пароля.</p>
              {feedback}
              <Button type="submit" disabled={busy} className="h-9 w-full">{busy ? "..." : "Получить код"}</Button>
            </form>
          )
        )}

        <p className="mt-1 text-center text-xs text-[--text-muted]">
          {view === "register" ? "Уже есть аккаунт? " : "Нет аккаунта? "}
          <button onClick={() => switchView(view === "register" ? "login" : "register")} className="font-medium text-[--accent] hover:underline">
            {view === "register" ? "Войти" : "Регистрация"}
          </button>
          {view === "forgot" && (
            <> · <button onClick={() => switchView("login")} className="font-medium text-[--accent] hover:underline">К входу</button></>
          )}
        </p>
      </div>
    </Modal>
  )
}
