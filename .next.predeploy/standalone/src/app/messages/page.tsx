/* eslint-disable @next/next/no-img-element */
"use client"

import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiConversation, ApiDmMessage, ApiDmPeer } from "@/lib/api"
import { UserAvatar } from "@/components/ui/user-avatar"
import { getTeamColor } from "@/components/ui/team-logo"
import { compressImageForUpload } from "@/lib/client-image"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Image as ImageIcon, MessageCircle, Send, X } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

function dmTime(s: string) {
  const t = Date.parse(s.includes("T") ? s : s.replace(" ", "T") + "Z")
  return new Date(Number.isFinite(t) ? t : Date.now()).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
}

function MessagesInner() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const peerId = searchParams.get("u")

  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [peer, setPeer] = useState<ApiDmPeer | null>(null)
  const [messages, setMessages] = useState<ApiDmMessage[]>([])
  const [canMessage, setCanMessage] = useState(true)
  const [text, setText] = useState("")
  const [image, setImage] = useState("")
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  const loadConversations = useCallback(() => {
    api.getConversations().then((d) => setConversations(d.conversations || [])).catch(() => {})
  }, [])

  const loadThread = useCallback((id: string) => {
    api.getThread(id).then((d) => { setPeer(d.peer); setMessages(d.messages || []); setCanMessage(d.canMessage) }).catch(() => toast.error("Не удалось открыть диалог"))
  }, [])

  useEffect(() => {
    if (!user) return
    loadConversations()
    const i = window.setInterval(loadConversations, 12000)
    return () => window.clearInterval(i)
  }, [user, loadConversations])

  useEffect(() => {
    if (!peerId) { setPeer(null); setMessages([]); return }
    loadThread(peerId)
    const i = window.setInterval(() => loadThread(peerId), 6000)
    return () => window.clearInterval(i)
  }, [peerId, loadThread])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [messages.length])

  const uploadImage = async (file: File) => {
    try {
      const compressed = await compressImageForUpload(file)
      const form = new FormData()
      form.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить")
      setImage(data.url)
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка загрузки") }
  }

  const send = async () => {
    if (!peerId || (!text.trim() && !image) || sending) return
    setSending(true)
    try {
      const d = await api.sendDm(peerId, { content: text.trim() || undefined, image: image || undefined })
      setMessages((prev) => [...prev, d.message])
      setText(""); setImage("")
      loadConversations()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить")
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center text-sm text-[--text-muted]">Войдите, чтобы открыть личные сообщения.</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-0 py-0 sm:px-4 sm:py-5">
        <div className="grid h-[calc(100dvh-3.5rem-3.5rem)] grid-cols-1 overflow-hidden rounded-none border-[--border-default] bg-[--bg-surface] md:h-[calc(100vh-6rem)] sm:grid-cols-[300px_1fr] sm:rounded-2xl sm:border">
          {/* Conversations */}
          <div className={`flex flex-col border-r border-[--border-default] ${peerId ? "hidden sm:flex" : "flex"}`}>
            <div className="border-b border-[--border-default] px-4 py-3 text-sm font-bold text-[--text-primary]">Сообщения</div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-4 text-xs leading-relaxed text-[--text-muted]">Пока нет диалогов. Напишите тому, на кого взаимно подписаны — кнопка «Написать» в профиле.</p>
              ) : conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/messages?u=${c.id}`)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[--bg-hover] ${peerId === c.id ? "bg-[--bg-elevated]" : ""}`}
                >
                  <UserAvatar username={c.username} src={c.avatar} color={c.team ? getTeamColor(c.team) : undefined} className="h-9 w-9 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[13px] font-semibold text-[--text-primary]">{c.display_name || c.username}</span>
                      {c.unread > 0 && <span className="shrink-0 rounded-full px-1.5 text-[10px] font-bold text-white" style={{ backgroundColor: "var(--accent)" }}>{c.unread}</span>}
                    </div>
                    <p className="truncate text-[11px] text-[--text-muted]">{c.last_sender === user.id ? "Вы: " : ""}{c.last_image && !c.last_content ? "📷 фото" : c.last_content}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className={`flex-col ${peerId ? "flex" : "hidden sm:flex"}`}>
            {peer ? (
              <>
                <div className="flex items-center gap-2 border-b border-[--border-default] px-3 py-2.5">
                  <button onClick={() => router.push("/messages")} className="rounded-md p-1 text-[--text-muted] hover:text-[--text-primary] sm:hidden"><ArrowLeft className="h-5 w-5" /></button>
                  <Link href={`/user/${peer.username}`} className="flex min-w-0 items-center gap-2">
                    <UserAvatar username={peer.username} src={peer.avatar} color={peer.team ? getTeamColor(peer.team) : undefined} className="h-8 w-8 shrink-0" />
                    <span className="truncate text-sm font-semibold" style={peer.team ? { color: getTeamColor(peer.team) } : { color: "var(--color-text-primary)" }}>{peer.display_name || peer.username}</span>
                  </Link>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.map((m) => {
                    const mine = m.sender_id === user.id
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] ${mine ? "text-white" : "text-[--text-primary]"}`} style={mine ? { backgroundColor: "var(--accent)" } : { backgroundColor: "var(--color-bg-elevated)" }}>
                          {m.image && <img src={m.image} alt="" className="mb-1 max-h-60 rounded-lg" />}
                          {m.content && <p className="whitespace-pre-wrap break-words leading-5">{m.content}</p>}
                          <div className={`mt-0.5 text-[9px] ${mine ? "text-white/70" : "text-[--text-muted]"}`}>{dmTime(m.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && <p className="py-8 text-center text-xs text-[--text-muted]">Нет сообщений. Напишите первым.</p>}
                </div>

                {canMessage ? (
                  <div className="border-t border-[--border-default] p-3">
                    {image && (
                      <div className="relative mb-2 w-fit">
                        <img src={image} alt="" className="max-h-32 rounded-lg border border-[--border-default]" />
                        <button onClick={() => setImage("")} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white" aria-label="Убрать"><X className="h-3 w-3" /></button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => imageRef.current?.click()} className="rounded-md p-2 text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]" title="Прикрепить изображение"><ImageIcon className="h-4 w-4" /></button>
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send() } }}
                        placeholder="Сообщение…"
                        className="min-w-0 flex-1 rounded-full border border-[--border-default] bg-[--bg-elevated] px-4 py-2 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--border-hover] focus:outline-none"
                      />
                      <button onClick={send} disabled={sending || (!text.trim() && !image)} style={{ backgroundColor: "var(--accent)" }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-[filter] hover:brightness-110 disabled:opacity-50" title="Отправить"><Send className="h-4 w-4" /></button>
                    </div>
                    <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f) }} />
                  </div>
                ) : (
                  <div className="border-t border-[--border-default] p-3 text-center text-xs text-[--text-muted]">Писать можно только при взаимной подписке.</div>
                )}
              </>
            ) : (
              <div className="hidden flex-1 items-center justify-center text-sm text-[--text-muted] sm:flex">
                <MessageCircle className="mr-2 h-5 w-5" /> Выберите диалог
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  )
}
