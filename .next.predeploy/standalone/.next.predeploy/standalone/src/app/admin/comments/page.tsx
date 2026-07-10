"use client"

import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth/auth-context"
import { ArrowLeft, MessageCircle, Search, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { parseDbDate } from "@/lib/time"

type AdminComment = {
  id: string
  post_id: string
  parent_id: string | null
  content: string
  created_at: string
  user_id: string
  username: string
  team: string | null
  driver: string | null
  post_title: string
  upvotes: number
  downvotes: number
  open_reports: number
}

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Ошибка запроса")
  return data
}

export default function AdminCommentsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [comments, setComments] = useState<AdminComment[]>([])
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user === null) setReady(true)
    else if (user && user.role !== "admin") router.push("/")
    else if (user) setReady(true)
  }, [router, user])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q.trim()) params.set("q", q.trim())
    try {
      const data = await jsonFetch<{ comments: AdminComment[]; total: number }>(`/api/admin/comments?${params}`)
      setComments(data.comments || [])
      setTotal(data.total || 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить комментарии")
    } finally {
      setLoading(false)
    }
  }, [page, q])

  useEffect(() => {
    if (ready && user?.role === "admin") void load()
  }, [load, ready, user?.role])

  const deleteComment = async (commentId: string) => {
    if (!confirm("Удалить комментарий?")) return
    try {
      await jsonFetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_comment", commentId }),
      })
      toast.success("Комментарий удалён")
      setComments((current) => current.filter((comment) => comment.id !== commentId))
      setTotal((current) => Math.max(0, current - 1))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить комментарий")
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 30))

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center text-sm text-[--text-muted]">
          Загрузка...
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[980px] px-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/admin" className="mb-2 inline-flex items-center gap-1 text-xs text-[--text-muted] hover:text-[--text-primary]">
                <ArrowLeft className="h-3.5 w-3.5" />
                Админ-панель
              </Link>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <MessageCircle className="h-5 w-5 text-[--accent]" />
                Управление комментариями
              </h1>
              <p className="mt-1 text-sm text-[--text-muted]">
                Поиск, контекст поста, голоса, открытые жалобы и быстрое удаление.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--text-muted]" />
              <input
                value={q}
                onChange={(event) => {
                  setQ(event.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по тексту, автору или посту..."
                className="h-9 w-full rounded-md border border-[--border-default] bg-[--bg-elevated] pl-8 pr-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--border-hover]"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
            {loading ? (
              <div className="p-8 text-center text-sm text-[--text-muted]">Загрузка комментариев...</div>
            ) : comments.length === 0 ? (
              <div className="p-8 text-center text-sm text-[--text-muted]">Комментариев не найдено.</div>
            ) : comments.map((comment) => (
              <div key={comment.id} className="border-b border-[--border-default] p-3 last:border-0">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/user/${comment.username}`} className="font-semibold text-[--text-primary] hover:underline">
                    {comment.username}
                  </Link>
                  {comment.team && <Badge variant="secondary" className="text-[9px]">{comment.team}</Badge>}
                  {comment.driver && <span className="text-[--text-muted]">{comment.driver}</span>}
                  <span className="text-[--text-muted]">{new Date(parseDbDate(comment.created_at)).toLocaleString("ru-RU")}</span>
                  {comment.open_reports > 0 && <Badge className="bg-amber-500 text-[9px] text-black">{comment.open_reports} жал.</Badge>}
                </div>
                <p className="break-words rounded-md bg-[--bg-elevated] px-3 py-2 text-sm leading-5 text-[--text-secondary]">
                  {comment.content}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <Link href={`/post/${comment.post_id}`} className="min-w-0 truncate text-[--accent] hover:underline">
                    {comment.parent_id ? "Ответ в посте" : "Комментарий в посте"}: {comment.post_title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-[--text-muted]">
                      Голоса: {(comment.upvotes || 0) - (comment.downvotes || 0)}
                    </span>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 font-medium text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded bg-[--bg-elevated] px-3 py-1.5 text-xs disabled:opacity-30"
              >
                Назад
              </button>
              <span className="text-xs text-[--text-muted]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded bg-[--bg-elevated] px-3 py-1.5 text-xs disabled:opacity-30"
              >
                Дальше
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
