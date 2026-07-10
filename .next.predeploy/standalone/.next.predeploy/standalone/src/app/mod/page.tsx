"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Shield, Trash2 } from "lucide-react"
import Link from "next/link"

interface Report {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reporter_username: string
  target_username: string | null
  post_id: string | null
  comment_id: string | null
  post_title: string | null
  post_deleted: number | null
  comment_content: string | null
  comment_deleted: number | null
}

const REASON_LABEL: Record<string, string> = {
  spam: "Спам",
  abuse: "Оскорбления",
  spoiler: "Спойлер",
  misinformation: "Дезинформация",
  other: "Другое",
}

export default function ModPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)

  const isStaff = !!user && (user.role === "admin" || user.role === "moderator")

  useEffect(() => {
    if (user === null) setReady(true)
    else if (user && !isStaff) router.push("/")
    else if (user) setReady(true)
  }, [user, isStaff, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/reports?status=open")
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Ошибка")
      setReports(d.reports || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить жалобы")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (isStaff) load() }, [isStaff, load])

  if (!ready || !user || !isStaff) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">
          {user === null ? "Войдите, чтобы продолжить" : "Загрузка..."}
        </div>
      </div>
    )
  }

  const deleteContent = async (rep: Report) => {
    const action = rep.comment_id ? "delete_comment" : "delete_post"
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postId: rep.post_id, commentId: rep.comment_id, reportId: rep.id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Ошибка")
      toast.success("Контент удалён, жалоба закрыта")
      setReports((prev) => prev.filter((x) => x.id !== rep.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить")
    }
  }

  const dismiss = async (rep: Report) => {
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rep.id, status: "dismissed" }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "Ошибка")
      toast.success("Жалоба отклонена")
      setReports((prev) => prev.filter((x) => x.id !== rep.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить")
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[--accent]" />
          <h1 className="text-lg font-bold text-[--text-primary]">Модерация</h1>
          {user.role === "admin" && (
            <Link href="/admin" className="ml-auto text-xs text-[--text-muted] transition-colors hover:text-[--text-primary]">Админ-панель →</Link>
          )}
        </div>
        <p className="mb-5 text-[13px] text-[--text-secondary]">
          Открытые жалобы. Удаляйте нарушающий контент или отклоняйте необоснованные жалобы. Доступ к управлению пользователями и настройкам — только у администраторов.
        </p>

        {loading ? (
          <p className="text-sm text-[--text-muted]">Загрузка…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] py-12 text-center text-sm text-[--text-muted]">Открытых жалоб нет 🎉</div>
        ) : (
          <div className="space-y-2.5">
            {reports.map((rep) => {
              const isComment = !!rep.comment_id
              const content = isComment ? rep.comment_content : rep.post_title
              const gone = isComment ? rep.comment_deleted : rep.post_deleted
              return (
                <div key={rep.id} className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[--text-muted]">
                    <span className="rounded-md border border-[--border-default] px-2 py-0.5 font-medium text-[--text-secondary]">{REASON_LABEL[rep.reason] || rep.reason}</span>
                    <span>{isComment ? "Комментарий" : "Пост"}</span>
                    <span>· от @{rep.reporter_username}</span>
                    {rep.target_username && <span>· на @{rep.target_username}</span>}
                  </div>
                  <div className="mt-2 line-clamp-3 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-[13px] text-[--text-secondary]">
                    {gone ? <span className="italic text-[--text-muted]">Контент уже удалён</span> : (content || "—")}
                  </div>
                  {rep.details && <p className="mt-2 text-[12px] text-[--text-muted]">От жалующегося: {rep.details}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    {rep.post_id && (
                      <Link href={`/post/${rep.post_id}`} className="text-[12px] text-[--text-muted] transition-colors hover:text-[--text-primary]">Открыть →</Link>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => dismiss(rep)} className="flex h-8 items-center gap-1.5 rounded-lg border border-[--border-default] px-3 text-xs font-medium text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]">
                        <Check className="h-3.5 w-3.5" /> Отклонить
                      </button>
                      {!gone && (
                        <button onClick={() => deleteContent(rep)} style={{ backgroundColor: "var(--color-destructive)" }} className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white transition-[filter] hover:brightness-110">
                          <Trash2 className="h-3.5 w-3.5" /> Удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
