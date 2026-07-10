"use client"

import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth/auth-context"
import { BarChart3, Ban, Eye, EyeOff, FileText, Flag, Globe, MessageCircle, Play, Plus, RefreshCw, Search, Shield, ShieldAlert, ShieldOff, Trash2, UserCheck, Users, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type Tab = "dashboard" | "reports" | "users" | "posts" | "comments" | "live" | "fantasy" | "hubs"
type AdminStats = {
  totalUsers: number
  totalPosts: number
  totalComments: number
  totalBets: number
  activeEvents: number
  bannedUsers: number
  topKarma: { id: string; username: string; karma: number; role: string }[]
  recentUsers: { id: string; username: string; team: string | null; karma: number }[]
}

async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Ошибка запроса")
  return data
}

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("dashboard")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (user === null) setReady(true)
    else if (user && user.role !== "admin") router.push("/")
    else if (user) setReady(true)
  }, [user, router])

  if (!ready || !user || user.role !== "admin") {
    if (!user) {
      return (
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex flex-1 items-center justify-center text-[--text-muted]">Загрузка...</div>
        </div>
      )
    }
    return null
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: "dashboard", label: "Обзор", icon: BarChart3 },
    { key: "reports", label: "Жалобы", icon: Flag },
    { key: "users", label: "Пользователи", icon: Users },
    { key: "posts", label: "Посты", icon: FileText },
    { key: "live", label: "Эфир", icon: Play },
    { key: "fantasy", label: "Фэнтези", icon: Zap },
    { key: "hubs", label: "Паблики", icon: Globe },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[1120px] px-4">
          <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Shield className="h-5 w-5 text-[--accent]" />
            Админ-панель
          </h1>

          <div className="paddock-control mb-5 flex w-fit flex-wrap gap-1 rounded-xl p-1">
            {tabs.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    tab === item.key ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              )
            })}
          </div>

          {tab === "dashboard" && <DashboardTab />}
          {tab === "reports" && <ReportsTab />}
          {tab === "users" && <UsersTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "live" && <LiveOpsTab />}
          {tab === "fantasy" && <FantasyTab />}
          {tab === "hubs" && <HubsTab />}
        </div>
      </main>
    </div>
  )
}

function DashboardTab() {
  const [data, setData] = useState<AdminStats | null>(null)

  useEffect(() => {
    jsonFetch<AdminStats>("/api/admin/stats").then(setData).catch((e) => toast.error(e.message))
  }, [])

  if (!data) return <p className="text-sm text-[--text-muted]">Загрузка...</p>

  const stats = [
    { label: "Пользователей", value: data.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Постов", value: data.totalPosts, icon: FileText, color: "text-[--accent]" },
    { label: "Комментариев", value: data.totalComments, icon: Flag, color: "text-green-400" },
    { label: "Ставок", value: data.totalBets, icon: Zap, color: "text-[--gold]" },
    { label: "Активных ивентов", value: data.activeEvents, icon: BarChart3, color: "text-purple-400" },
    { label: "Забанено", value: data.bannedUsers, icon: Ban, color: "text-red-400" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 text-center">
              <Icon className={`mx-auto mb-1 h-4 w-4 ${stat.color}`} />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[10px] text-[--text-muted]">{stat.label}</div>
            </div>
          )
        })}
      </div>

      <F1SyncPanel />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Топ по карме">
          {data.topKarma?.map((u, i) => (
            <div key={u.id} className="flex items-center justify-between border-b border-[--border-default] py-1.5 text-xs last:border-0">
              <span className="flex items-center gap-2">
                <span className="w-4 font-mono text-[--text-muted]">{i + 1}</span>
                <span className="font-medium">{u.username}</span>
                {u.role === "admin" && <Badge className="text-[9px]">admin</Badge>}
              </span>
              <span className="font-semibold text-[--gold]">{u.karma}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Новые пользователи">
          {data.recentUsers?.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-[--border-default] py-1.5 text-xs last:border-0">
              <span className="font-medium">{u.username}</span>
              <span className="text-[--text-muted]">{u.team || "без команды"} · {u.karma} кармы</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function F1SyncPanel() {
  const [loading, setLoading] = useState(false)
  const [last, setLast] = useState<{ syncedAt: string; drivers: number; constructors: number; calendar: number } | null>(null)

  const sync = async () => {
    setLoading(true)
    try {
      const data = await jsonFetch<{ syncedAt: string; drivers: number; constructors: number; calendar: number }>(
        "/api/admin/f1/sync",
        { method: "POST" }
      )
      setLast(data)
      toast.success(`F1-данные обновлены: ${data.drivers} пилотов, ${data.constructors} команд`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить F1-данные")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel title="F1-данные (Jolpica / OpenF1)">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-xs text-[--text-muted]">
          Принудительно сбрасывает кэш и заново парсит календарь, зачёты, статистику и live-данные. В обычном режиме данные обновляются автоматически по таймеру.
        </p>
        <button
          onClick={sync}
          disabled={loading}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[--accent] px-3 text-xs font-semibold text-white hover:bg-[--accent-hover] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Обновление..." : "API Refresh"}
        </button>
      </div>
      {last && (
        <p className="mt-2 text-[11px] text-[--text-muted]">
          Обновлено {new Date(last.syncedAt).toLocaleString("ru-RU")} · {last.calendar} гонок · {last.drivers} пилотов · {last.constructors} команд
        </p>
      )}
    </Panel>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState<any[]>([])
  const [status, setStatus] = useState("open")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await jsonFetch<{ reports: any[] }>(`/api/reports?status=${status}`)
      setReports(data.reports || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить жалобы")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const resolve = async (id: string, nextStatus: "resolved" | "dismissed", resolution: string) => {
    try {
      await jsonFetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus, resolution }),
      })
      toast.success("Жалоба обновлена")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить жалобу")
    }
  }

  const moderate = async (action: string, payload: Record<string, string>) => {
    try {
      await jsonFetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      })
      toast.success("Готово")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка модерации")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-[--border-default] bg-[--bg-elevated] px-2 text-xs text-[--text-primary]">
          <option value="open">Открытые</option>
          <option value="resolved">Решённые</option>
          <option value="dismissed">Отклонённые</option>
          <option value="all">Все</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-[--text-muted]">Загрузка...</p> : reports.length === 0 ? (
        <Panel title="Очередь пуста">
          <p className="text-sm text-[--text-muted]">Сейчас нет жалоб в выбранном статусе.</p>
        </Panel>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Flag className="h-4 w-4 text-amber-400" />
                    {labelReason(report.reason)}
                    <Badge variant={report.status === "open" ? "default" : "secondary"} className="text-[9px]">{labelStatus(report.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[--text-muted]">
                    Жалоба от {report.reporter_username} на {report.target_username || "удалённого пользователя"}
                  </p>
                  {report.post_title && (
                    <a href={`/post/${report.post_id}`} target="_blank" className="mt-1 block text-xs font-medium text-[--text-primary] hover:underline">
                      {report.comment_id ? `Комментарий в посте: ${report.post_title}` : report.post_title}
                    </a>
                  )}
                  {report.comment_content && (
                    <p className="mt-1 rounded-md border border-[--border-default] bg-[--bg-elevated] px-2 py-1.5 text-xs text-[--text-secondary]">
                      {report.comment_content}
                    </p>
                  )}
                  {report.details && <p className="mt-1 text-xs text-[--text-muted]">{report.details}</p>}
                </div>
                {report.status === "open" && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {report.comment_id ? (
                      <button onClick={() => moderate("delete_comment", { commentId: report.comment_id, reportId: report.id })} className="rounded bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20">Удалить комментарий</button>
                    ) : report.post_id && (
                      <button onClick={() => moderate("delete_post", { postId: report.post_id, reportId: report.id })} className="rounded bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20">Удалить пост</button>
                    )}
                    {report.target_user_id && (
                      <button onClick={() => moderate("ban_user", { userId: report.target_user_id, reportId: report.id })} className="rounded bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/20">Забанить</button>
                    )}
                    <button onClick={() => resolve(report.id, "dismissed", "no_violation")} className="rounded bg-[--bg-elevated] px-2 py-1 text-[10px] font-medium text-[--text-secondary] hover:bg-[--bg-hover]">Отклонить</button>
                    <button onClick={() => resolve(report.id, "resolved", "reviewed")} className="rounded bg-green-500/10 px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-500/20">Закрыть</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [sort, setSort] = useState("new")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("sort", sort)
    try {
      const data = await jsonFetch<{ users: any[] }>(`/api/admin/users?${params}`)
      setUsers(data.users || [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить пользователей")
    } finally {
      setLoading(false)
    }
  }, [q, sort])

  useEffect(() => { load() }, [load])

  const moderate = async (action: string, userId: string) => {
    try {
      await jsonFetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      })
      toast.success("Готово")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  return (
    <div>
      <ToolbarSearch value={q} onChange={setQ} placeholder="Поиск по имени или email...">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-8 rounded-md border border-[--border-default] bg-[--bg-elevated] px-2 text-xs text-[--text-primary]">
          <option value="new">Новые</option>
          <option value="karma">По карме</option>
          <option value="name">По имени</option>
        </select>
      </ToolbarSearch>

      {loading ? <p className="text-sm text-[--text-muted]">Загрузка...</p> : (
        <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
          <div className="grid grid-cols-[1fr_1fr_80px_80px_120px] gap-2 border-b border-[--border-default] px-3 py-2 text-[10px] font-semibold uppercase text-[--text-muted]">
            <span>Пользователь</span><span>Email</span><span>Роль</span><span>Карма</span><span className="text-right">Действия</span>
          </div>
          {users.map((u) => (
            <div key={u.id} className={`grid grid-cols-[1fr_1fr_80px_80px_120px] items-center gap-2 border-b border-[--border-default] px-3 py-2 text-xs last:border-0 ${u.banned ? "bg-red-500/5" : ""}`}>
              <span className="flex items-center gap-1 truncate font-medium">
                {u.username}
                {u.banned ? <Badge variant="destructive" className="text-[8px]">бан</Badge> : null}
              </span>
              <span className="truncate text-[--text-muted]">{u.email}</span>
              <span>{u.role === "admin" ? <Badge className="text-[9px]">admin</Badge> : u.role === "moderator" ? <span className="text-[10px] font-semibold text-[--accent]">мод</span> : "user"}</span>
              <span className="font-semibold">{u.karma}</span>
              <div className="flex justify-end gap-1">
                <IconButton title="Забанить" onClick={() => moderate("ban_user", u.id)} icon={Ban} tone="danger" />
                <IconButton title="Разбанить" onClick={() => moderate("unban_user", u.id)} icon={UserCheck} tone="success" />
                {u.role !== "admin" && (u.role === "moderator"
                  ? <IconButton title="Снять модератора" onClick={() => moderate("unset_moderator", u.id)} icon={Shield} tone="warning" />
                  : <IconButton title="Сделать модератором" onClick={() => moderate("set_moderator", u.id)} icon={Shield} />)}
                {u.role !== "admin"
                  ? <IconButton title="Сделать админом" onClick={() => moderate("promote_user", u.id)} icon={ShieldAlert} />
                  : <IconButton title="Разжаловать" onClick={() => moderate("demote_user", u.id)} icon={ShieldOff} tone="warning" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PostsTab() {
  const [posts, setPosts] = useState<any[]>([])
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q) params.set("q", q)
    try {
      const data = await jsonFetch<{ posts: any[]; total: number }>(`/api/admin/posts?${params}`)
      setPosts(data.posts || [])
      setTotal(data.total || 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить посты")
    } finally {
      setLoading(false)
    }
  }, [q, page])

  useEffect(() => { load() }, [load])

  const deletePost = async (postId: string) => {
    if (!confirm("Удалить пост?")) return
    try {
      await jsonFetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_post", postId }),
      })
      toast.success("Пост удалён")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <ToolbarSearch value={q} onChange={(value) => { setQ(value); setPage(1) }} placeholder="Поиск постов..." />
      {loading ? <p className="text-sm text-[--text-muted]">Загрузка...</p> : (
        <>
          <div className="overflow-hidden rounded-xl border border-[--border-default] bg-[--bg-surface]">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-[--border-default] px-3 py-2.5 text-xs last:border-0">
                <div className="min-w-0 flex-1">
                  <a href={`/post/${p.id}`} target="_blank" className="block truncate font-medium hover:underline">{p.title}</a>
                  <span className="text-[--text-muted]">{p.username} · {p.upvotes - p.downvotes} очков · {p.comment_count} комм.</span>
                </div>
                <button onClick={() => deletePost(p.id)} className="ml-2 shrink-0 rounded p-1.5 text-[--text-muted] hover:bg-red-400/10 hover:text-red-400" title="Удалить">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded bg-[--bg-elevated] px-2 py-1 text-xs disabled:opacity-30">←</button>
              <span className="text-xs text-[--text-muted]">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded bg-[--bg-elevated] px-2 py-1 text-xs disabled:opacity-30">→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LiveOpsTab() {
  const [streams, setStreams] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [raceName, setRaceName] = useState("")
  const [url, setUrl] = useState("")
  const [embedUrl, setEmbedUrl] = useState("")
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [streamData, chatData] = await Promise.all([
        jsonFetch<{ streams: any[] }>("/api/streams?all=1"),
        jsonFetch<{ messages: any[] }>("/api/live-chat"),
      ])
      setStreams(streamData.streams || [])
      setMessages([...(chatData.messages || [])].reverse())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить эфир")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createStream = async () => {
    if (!raceName.trim() || !url.trim()) {
      toast.error("Название и URL обязательны")
      return
    }
    try {
      await jsonFetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race_name: raceName.trim(),
          url: url.trim(),
          embed_url: embedUrl.trim() || null,
          active,
        }),
      })
      setRaceName("")
      setUrl("")
      setEmbedUrl("")
      setActive(true)
      toast.success("Плеер добавлен")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось добавить плеер")
    }
  }

  const toggleStream = async (id: string, nextActive: boolean) => {
    try {
      await jsonFetch("/api/streams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: nextActive }),
      })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось обновить плеер")
    }
  }

  const deleteStream = async (id: string) => {
    if (!confirm("Удалить плеер?")) return
    try {
      await jsonFetch("/api/streams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      toast.success("Плеер удалён")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить плеер")
    }
  }

  const deleteMessage = async (id: string) => {
    try {
      await jsonFetch("/api/live-chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      toast.success("Сообщение скрыто")
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить сообщение")
    }
  }

  if (loading) return <p className="text-sm text-[--text-muted]">Загрузка...</p>

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Panel title="Добавить плеер">
          <div className="grid gap-2">
            <input
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Название: Гран-при Канады · гонка"
              className="h-9 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL для открытия во внешней вкладке"
              className="h-9 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none"
            />
            <input
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="Embed URL для iframe, если есть"
              className="h-9 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-[--text-secondary]">
                <Switch checked={active} onChange={setActive} size="sm" aria-label="Сразу показывать на /watch" />
                Сразу показывать на /watch
              </div>
              <button onClick={createStream} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[--accent] px-3 text-xs font-semibold text-white hover:bg-[--accent-hover]">
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Плееры">
          {streams.length === 0 ? <p className="text-sm text-[--text-muted]">Плееров пока нет.</p> : (
            <div className="space-y-2">
              {streams.map((stream) => (
                <div key={stream.id} className="rounded-md border border-[--border-default] bg-[--bg-elevated] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{stream.race_name}</span>
                        <Badge variant={stream.active ? "default" : "secondary"} className="text-[9px]">{stream.active ? "активен" : "скрыт"}</Badge>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-[--text-muted]">{stream.embed_url ? "iframe готов" : "только внешняя ссылка"}</p>
                      <a href={stream.url} target="_blank" className="mt-1 block truncate text-[11px] text-[--accent] hover:underline">{stream.url}</a>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton
                        title={stream.active ? "Скрыть" : "Показать"}
                        onClick={() => toggleStream(stream.id, !stream.active)}
                        icon={stream.active ? EyeOff : Eye}
                        tone={stream.active ? "warning" : "success"}
                      />
                      <IconButton title="Удалить" onClick={() => deleteStream(stream.id)} icon={Trash2} tone="danger" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Live чат">
        <div className="mb-2 flex items-center gap-2 text-xs text-[--text-muted]">
          <MessageCircle className="h-3.5 w-3.5" />
          Последние сообщения общей комнаты
        </div>
        {messages.length === 0 ? <p className="text-sm text-[--text-muted]">Сообщений пока нет.</p> : (
          <div className="max-h-[520px] space-y-2 overflow-y-auto">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md bg-[--bg-elevated] p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold">{message.username}</span>
                  <button onClick={() => deleteMessage(message.id)} className="shrink-0 rounded p-1 text-[--text-muted] hover:bg-red-400/10 hover:text-red-400" title="Удалить сообщение">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <p className="mt-1 break-words text-xs leading-5 text-[--text-secondary]">{message.content}</p>
                <p className="mt-1 text-[10px] text-[--text-muted]">{new Date(message.created_at).toLocaleString("ru-RU")}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function FantasyTab() {
  return (
    <Panel title="Фэнтези">
      <p className="text-sm text-[--text-secondary]">Фэнтези теперь полностью автоматическое: раунд-прогноз создаётся на каждый Гран-при, а очки начисляются из результатов Jolpica после гонки. Ручное управление не требуется.</p>
    </Panel>
  )
}

function HubsTab() {
  const [communities, setCommunities] = useState<any[]>([])

  const load = () => jsonFetch<{ communities: any[] }>("/api/communities").then((d) => setCommunities(d.communities || [])).catch((e) => toast.error(e.message))
  useEffect(() => { load() }, [])

  const remove = async (c: any) => {
    if (!confirm(`Удалить паблик «${c.name}»? Это необратимо.`)) return
    try {
      await jsonFetch(`/api/communities/${c.slug}`, { method: "DELETE" })
      setCommunities((list) => list.filter((x) => x.id !== c.id))
      toast.success("Паблик удалён")
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось удалить") }
  }

  return (
    <Panel title="Паблики">
      {communities.length === 0 ? <p className="text-sm text-[--text-muted]">Пабликов пока нет.</p> : communities.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 border-b border-[--border-default] py-2 text-xs last:border-0">
          <div className="min-w-0">
            <span className="font-medium">{c.name}</span>
            <span className="ml-2 text-[--text-muted]">/{c.slug}</span>
            {c.description && <p className="mt-0.5 truncate text-[--text-muted]">{c.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <a href={`/p/${c.slug}`} target="_blank" className="text-[--accent] hover:underline">Открыть</a>
            <button onClick={() => remove(c)} className="font-medium text-[--destructive] hover:underline">Удалить</button>
          </div>
        </div>
      ))}
    </Panel>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function ToolbarSearch({ value, onChange, placeholder, children }: { value: string; onChange: (value: string) => void; placeholder: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="relative flex flex-1 items-center">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[--text-muted]" />
        <input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-[--border-default] bg-[--bg-elevated] pl-8 pr-3 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none"
        />
      </div>
      {children}
    </div>
  )
}

function IconButton({ title, onClick, icon: Icon, tone = "default" }: { title: string; onClick: () => void; icon: typeof Ban; tone?: "default" | "danger" | "success" | "warning" }) {
  const toneClass = {
    default: "hover:bg-[--accent]/10 hover:text-[--accent]",
    danger: "hover:bg-red-400/10 hover:text-red-400",
    success: "hover:bg-green-400/10 hover:text-green-400",
    warning: "hover:bg-amber-400/10 hover:text-amber-400",
  }[tone]

  return (
    <button onClick={onClick} className={`rounded p-1 text-[--text-muted] ${toneClass}`} title={title}>
      <Icon className="h-3 w-3" />
    </button>
  )
}

function labelReason(reason: string) {
  return {
    spam: "Спам",
    abuse: "Оскорбления",
    spoiler: "Спойлер",
    misinformation: "Недостоверная информация",
    other: "Другое",
  }[reason] || reason
}

function labelStatus(status: string) {
  return {
    open: "открыта",
    resolved: "решена",
    dismissed: "отклонена",
  }[status] || status
}
