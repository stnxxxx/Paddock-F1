"use client"

import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth/auth-context"
import { api } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, MessageCircle, ArrowBigUp, AtSign, Trophy, Check, X, type LucideIcon } from "lucide-react"
import { timeAgo } from "@/lib/time"

const NOTIF_META: Record<string, { Icon: LucideIcon; tone: string }> = {
  comment: { Icon: MessageCircle, tone: "var(--color-blue)" },
  upvote: { Icon: ArrowBigUp, tone: "var(--color-upvote)" },
  mention: { Icon: AtSign, tone: "var(--color-purple)" },
  fantasy: { Icon: Trophy, tone: "var(--color-gold)" },
  submission_approved: { Icon: Check, tone: "#34d399" },
  submission_rejected: { Icon: X, tone: "var(--color-destructive)" },
}

const NOTIF_TEXT: Record<string, string> = {
  comment: "прокомментировал(а) ваш пост",
  upvote: "оценил(а) ваш пост",
  mention: "упомянул(а) вас",
  fantasy: "подвёл(а) итоги фэнтези — проверьте результат",
  submission_approved: "одобрил(а) вашу предложку — пост на стене",
  submission_rejected: "отклонил(а) вашу предложку",
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const d = await api.getNotifications()
      setNotifs(d.notifications || [])
    } catch { /* */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (user) load(); else router.push("/") }, [load, user, router])

  const openNotification = async (notification: any) => {
    if (!notification.read) {
      setNotifs((items) => items.map((item) => item.id === notification.id ? { ...item, read: 1 } : item))
      try { await api.markNotificationRead(notification.id) } catch {}
    }
    if (notification.post_id) router.push(`/post/${notification.post_id}`)
    else if (notification.type === "fantasy") router.push("/fantasy")
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 py-5">
        <div className="max-w-[680px] mx-auto px-4">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5" /> Уведомления
            </h1>
            {notifs.some((n: any) => !n.read) && (
              <button onClick={async () => { await api.markNotificationsRead(); load() }} className="text-[11px] text-[--text-muted] hover:text-[--text-primary]">
                Отметить все прочитанными
              </button>
            )}
          </div>
          {loading ? (
            <div className="text-center text-[--text-muted] py-8">Загрузка...</div>
          ) : notifs.length === 0 ? (
            <div className="text-center text-[--text-muted] py-8">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Нет уведомлений</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifs.map((n: any) => {
                const meta = NOTIF_META[n.type as string] || { Icon: Bell, tone: "var(--color-text-muted)" }
                const Icon = meta.Icon
                return (
                  <div
                    key={n.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors hover:bg-[--bg-elevated] ${n.read ? "border-[--border-default] bg-[--bg-surface]" : "border-l-[3px] border-l-[--accent] border-[--border-default] bg-[--bg-surface]"}`}
                    onClick={() => openNotification(n)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${meta.tone} 16%, transparent)`, color: meta.tone }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-[--text-secondary]">
                        <span className="font-semibold text-[--text-primary]">{n.actor_username}</span>{" "}
                        {NOTIF_TEXT[n.type as string] || "взаимодействует с вами"}
                        {n.post_title && <>: <span className="font-medium text-[--accent]">«{n.post_title}»</span></>}
                      </p>
                      <span className="mt-1 block text-[11px] text-[--text-muted]">{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[--accent]" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
