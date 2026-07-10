"use client"

import { useAuth } from "@/components/auth/auth-context"
import { UserAvatar } from "@/components/ui/user-avatar"
import { getTeamColor } from "@/components/ui/team-logo"
import { MessageCircle, Send } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface LiveChatMessage {
  id: string
  session_key: number | null
  content: string
  created_at: string
  username: string
  display_name?: string | null
  avatar?: string | null
  team: string | null
  driver: string | null
}

interface LiveChatProps {
  sessionKey?: number | null
  room?: "global" | "session"
  title?: string
  subtitle?: string
  className?: string
  messagesClassName?: string
}

function formatChatTime(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

export function LiveChat({
  sessionKey,
  room = "global",
  title = "Live чат",
  subtitle,
  className = "",
  messagesClassName = "",
}: LiveChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const isSessionRoom = room === "session" && typeof sessionKey === "number"

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set("room", isSessionRoom ? "session" : "global")
      if (isSessionRoom) params.set("sessionKey", String(sessionKey))

      const res = await fetch(`/api/live-chat?${params}`, { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Чат недоступен")

      setMessages(data.messages || [])
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить чат")
    } finally {
      setLoading(false)
    }
  }, [isSessionRoom, sessionKey])

  useEffect(() => {
    void loadMessages()
    const interval = window.setInterval(loadMessages, 5000)
    return () => window.clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  const sendMessage = async () => {
    const content = text.trim()
    if (!content || sending) return

    setSending(true)
    try {
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          room: isSessionRoom ? "session" : "global",
          sessionKey: isSessionRoom ? sessionKey : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Не удалось отправить сообщение")

      setMessages((prev) => [...prev.slice(-79), data.message])
      setText("")
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`flex flex-col rounded-xl border border-[--border-default] bg-[--bg-surface] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-[--border-default] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-[--accent]" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {subtitle && <p className="truncate text-[10px] text-[--text-muted]">{subtitle}</p>}
          </div>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-[--text-muted]">
          {messages.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`min-h-[220px] flex-1 overflow-y-auto p-3 ${messagesClassName || "max-h-[300px]"}`}
      >
        {loading ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-[--text-muted]">
            Загружаем чат...
          </div>
        ) : messages.length > 0 ? (
          <div className="flex flex-col gap-2">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md bg-[--bg-elevated] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <UserAvatar
                      username={message.username}
                      src={message.avatar}
                      color={message.team ? getTeamColor(message.team) : undefined}
                      className="h-5 w-5 shrink-0"
                      fallbackClassName="text-[8px]"
                    />
                    <span className="truncate text-xs font-semibold" style={message.team ? { color: getTeamColor(message.team) } : { color: "var(--color-text-primary)" }}>{message.display_name || message.username}</span>
                    {message.driver && <span className="text-[10px] text-[--text-muted]">{message.driver}</span>}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-[--text-muted]">
                    {formatChatTime(message.created_at)}
                  </span>
                </div>
                <p className="mt-1 break-words text-xs leading-5 text-[--text-secondary]">{message.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-center text-sm text-[--text-muted]">
            Чат пуст. Будь первым на пит-уолле.
          </div>
        )}
      </div>

      {error && <div className="border-t border-[--border-default] px-3 py-2 text-xs text-red-300">{error}</div>}

      <div className="border-t border-[--border-default] p-3">
        {user ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendMessage()
              }}
              maxLength={400}
              placeholder="Сообщение в live..."
              className="min-w-0 flex-1 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--border-hover]"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[--accent] text-white transition-colors hover:bg-[--accent-hover] disabled:cursor-not-allowed disabled:opacity-50"
              title="Отправить"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-md bg-[--bg-elevated] px-3 py-2 text-xs text-[--text-muted]">
            Войдите, чтобы писать в live-чат.
          </div>
        )}
      </div>
    </div>
  )
}
