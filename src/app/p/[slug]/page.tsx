/* eslint-disable @next/next/no-img-element */
"use client"

import { Header } from "@/components/layout/header"
import { PostCard } from "@/components/layout/post-card"
import { Panel, SectionTitle, EmptyState } from "@/components/profile/panels"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiCommunity, ApiCommunityEditor, ApiPost, ApiSubmission } from "@/lib/api"
import { compressImageForUpload } from "@/lib/client-image"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Camera, Check, ChevronRight, FileText, Flag,
  Image as ImageIcon, Inbox, type LucideIcon, Plus, Settings,
  Shield, Tags, Trash2, Users, X,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

type Tab = "wall" | "queue" | "editors"

const TABS: Array<{ key: Tab; label: string; icon: LucideIcon }> = [
  { key: "wall", label: "Стена", icon: FileText },
  { key: "queue", label: "Предложка", icon: Inbox },
  { key: "editors", label: "Редакторы", icon: Shield },
]

interface NextRace { name: string; circuit?: string; country?: string; date: string; round: number }

export default function CommunityPage() {
  const { slug } = useParams() as { slug: string }
  const { user } = useAuth()

  const [community, setCommunity] = useState<ApiCommunity | null>(null)
  const [editors, setEditors] = useState<ApiCommunityEditor[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [submissions, setSubmissions] = useState<ApiSubmission[]>([])
  const [tab, setTab] = useState<Tab>("wall")
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [nextRace, setNextRace] = useState<NextRace | null>(null)

  const canModerate = community?.my_role === "owner" || community?.my_role === "editor"
  const isOwner = community?.my_role === "owner"
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const uploadAvatar = async (file: File) => {
    try {
      const compressed = await compressImageForUpload(file)
      const form = new FormData()
      form.append("file", compressed)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить изображение")
      await api.updateCommunity(slug, { avatar: data.url })
      setCommunity((current) => current ? { ...current, avatar: data.url ?? null } : current)
      toast.success("Аватар обновлён")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки")
    }
  }

  const loadMeta = useCallback(async () => {
    try {
      const data = await api.getCommunity(slug)
      setCommunity(data.community)
      setEditors(data.editors)
      setPendingCount(data.pendingCount)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Паблик не найден")
    }
  }, [slug])

  const loadWall = useCallback(async () => {
    try {
      const data = await api.getPosts(1, "new", undefined, undefined, slug)
      setPosts(data.posts)
    } catch {
      // Keep the shell visible; meta explains the page.
    } finally {
      setLoading(false)
    }
  }, [slug])

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getSubmissions(slug)
      setSubmissions(data.submissions)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось загрузить предложку")
    }
  }, [slug])

  useEffect(() => { loadMeta(); loadWall() }, [loadMeta, loadWall])
  useEffect(() => { if ((tab === "queue" || tab === "wall") && canModerate) loadQueue() }, [tab, canModerate, loadQueue])
  useEffect(() => {
    fetch("/api/stats/dashboard").then((r) => r.json()).then((d) => { if (d?.nextRace) setNextRace(d.nextRace) }).catch(() => {})
  }, [])

  const toggleSub = async () => {
    if (!user) { toast.error("Войдите, чтобы подписаться"); return }
    if (!community) return
    try {
      const result = await api.toggleCommunitySubscription(slug)
      setCommunity({ ...community, is_subscribed: result.subscribed ? 1 : 0, subscriber_count: result.subscriber_count })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  const moderate = async (id: string, action: "approve" | "reject") => {
    try {
      await api.moderateSubmission(slug, id, action)
      setSubmissions((current) => current.filter((item) => item.id !== id))
      setPendingCount((count) => Math.max(0, count - 1))
      toast.success(action === "approve" ? "Опубликовано на стене" : "Отклонено")
      if (action === "approve") loadWall()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tagName of post.tags?.length ? post.tags : post.tag ? [post.tag] : []) {
        counts.set(tagName, (counts.get(tagName) || 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [posts])

  if (!community) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header showTicker />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">Загрузка...</div>
      </div>
    )
  }

  const accent = community.color || "var(--color-accent)"
  const shownTabs = TABS.filter((item) => (item.key !== "queue" || canModerate) && (item.key !== "editors" || isOwner))
  const owner = editors.find((e) => e.public_role === "owner")
  const staff = editors.filter((e) => e.public_role === "editor")

  return (
    <div className="flex min-h-screen flex-col">
      <Header showTicker />
      <main className="flex-1 py-5">
        <div className="mx-auto w-full max-w-[1200px] px-4">
          {/* ── Hero ─────────────────────────────────────────── */}
          <section className="overflow-hidden rounded-2xl border border-[--border-default] bg-[--bg-surface]">
            <div
              className="h-24 border-b border-[--border-default] md:h-28"
              style={{ background: `radial-gradient(120% 160% at 8% 0%, color-mix(in srgb, ${accent} 30%, transparent), transparent 50%), linear-gradient(180deg, var(--color-bg-elevated), var(--color-bg-surface))` }}
            />
            <div className="px-4 pb-4 md:px-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex min-w-0 items-end gap-4">
                  <div className="relative -mt-12 shrink-0">
                    <UserAvatar username={community.name} src={community.avatar} color={accent} className="h-24 w-24 rounded-2xl ring-4 ring-[--bg-surface]" fallbackClassName="text-3xl" />
                    {isOwner && (
                      <>
                        <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[--bg-surface] bg-[--accent] text-white transition-colors hover:bg-[--accent-hover]" title="Сменить аватар">
                          <Camera className="h-3.5 w-3.5" />
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) uploadAvatar(file) }} />
                      </>
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-black text-[--text-primary] md:text-3xl">{community.name}</h1>
                      <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}18` }}>Паблик</span>
                    </div>
                    {community.description && <p className="mt-1 max-w-2xl text-sm leading-6 text-[--text-secondary]">{community.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[--text-muted]">
                      <span><b className="font-bold text-[--text-secondary]">{(community.subscriber_count ?? 0).toLocaleString("ru-RU")}</b> подписчиков</span>
                      <span><b className="font-bold text-[--text-secondary]">{community.post_count.toLocaleString("ru-RU")}</b> постов</span>
                      <span><b className="font-bold text-[--text-secondary]">{editors.length}</b> редакторов</span>
                      {community.creator_username && <span>Создатель <b className="font-medium text-[--text-secondary]">{community.creator_username}</b></span>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button size="sm" variant={community.is_subscribed ? "secondary" : "default"} onClick={toggleSub}>
                    {community.is_subscribed ? "Вы подписаны" : "Подписаться"}
                  </Button>
                  {user && (
                    <Button size="sm" variant="outline" onClick={() => { setTab("wall"); setComposerOpen(true) }}>
                      <Plus className="h-3.5 w-3.5" />{canModerate ? "Опубликовать" : "Предложить пост"}
                    </Button>
                  )}
                  {isOwner && (
                    <Button size="sm" variant="outline" onClick={() => setTab("editors")}>
                      <Settings className="h-3.5 w-3.5" />Управление
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="overflow-x-auto">
              <div className="paddock-control inline-flex items-center gap-1 rounded-xl p-1">
                {shownTabs.map((item) => {
                  const Icon = item.icon
                  const active = tab === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                        active ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />{item.label}
                      {item.key === "queue" && pendingCount > 0 && (
                        <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active ? "bg-white/25 text-white" : "bg-[--accent] text-white")}>{pendingCount}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────── */}
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0">
              {tab === "wall" && (
                <div className="flex flex-col gap-2.5">
                  {user && <InlineComposer slug={slug} community={community} canModerate={!!canModerate} open={composerOpen} setOpen={setComposerOpen} onDone={() => { loadWall(); loadMeta() }} />}
                  {loading ? <EmptyState text="Загрузка стены..." />
                    : posts.length === 0 ? <EmptyState text="На стене пока пусто." />
                    : posts.map((post) => <PostCard key={post.id} post={post} />)}
                  {canModerate && submissions.length > 0 && (
                    <QueuePreview submissions={submissions} onModerate={moderate} onOpen={() => setTab("queue")} />
                  )}
                </div>
              )}

              {tab === "queue" && canModerate && (
                submissions.length === 0 ? (
                  <div className="rounded-2xl border border-[--border-default] bg-[--bg-surface] py-12 text-center text-[--text-muted]">
                    <Inbox className="mx-auto mb-2 h-8 w-8 opacity-45" />
                    <p className="text-sm">Предложка пуста</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {submissions.map((submission) => <SubmissionCard key={submission.id} submission={submission} onModerate={moderate} />)}
                  </div>
                )
              )}

              {tab === "editors" && isOwner && <EditorsTab community={community} editors={editors} isOwner={isOwner} onChange={loadMeta} />}
            </section>

            {/* ── Right rail ──────────────────────────────────── */}
            <aside className="space-y-3">
              <Panel>
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle icon={Shield} title="Команда редакторов" inline />
                  {!canModerate && <button onClick={() => toast("Напишите владельцу паблика, чтобы стать редактором")} className="text-[11px] font-semibold text-[--accent] hover:underline">Стать редактором</button>}
                </div>
                <div className="space-y-2.5">
                  {owner && <EditorRow editor={owner} />}
                  {staff.slice(0, 4).map((e) => <EditorRow key={e.id} editor={e} />)}
                  {staff.length === 0 && !owner && <p className="text-xs text-[--text-muted]">Редакция формируется.</p>}
                </div>
              </Panel>

              {topTags.length > 0 && (
                <Panel>
                  <SectionTitle icon={Tags} title="Популярные теги" />
                  <div className="flex flex-wrap gap-1.5">
                    {topTags.map(([tagName, count]) => (
                      <span key={tagName} className="inline-flex items-center gap-1 rounded-full border border-[--border-default] bg-[--bg-elevated] px-2 py-0.5 text-[11px] font-medium text-[--text-secondary]">
                        #{tagName}<span className="text-[--text-muted]">{count}</span>
                      </span>
                    ))}
                  </div>
                </Panel>
              )}

              {nextRace && (
                <Panel>
                  <SectionTitle icon={Flag} title="Следующий этап" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[--text-primary]">{nextRace.name}</div>
                      <div className="mt-0.5 text-xs text-[--text-muted]">
                        {nextRace.circuit ? `${nextRace.circuit} · ` : ""}{new Date(nextRace.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                      </div>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[--bg-elevated] text-[--accent]"><Flag className="h-4 w-4" /></span>
                  </div>
                  <Link href={`/race/${new Date().getFullYear()}/${nextRace.round}`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[--accent] hover:underline">
                    Перейти к этапу <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Panel>
              )}
            </aside>
          </div>
        </div>
      </main>

    </div>
  )
}

function InlineComposer({ slug, community, canModerate, open, setOpen, onDone }: {
  slug: string; community: ApiCommunity; canModerate: boolean; open: boolean; setOpen: (v: boolean) => void; onDone: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [image, setImage] = useState("")
  const [busy, setBusy] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) titleRef.current?.focus() }, [open])

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

  const submit = async () => {
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      const r = await api.submitToCommunity(slug, {
        title: title.trim(),
        content: content.trim(),
        tags: tag.split(",").map((t) => t.trim()).filter(Boolean),
        image: image || undefined,
        anonymous,
      })
      setTitle(""); setContent(""); setTag(""); setImage(""); setAnonymous(false); setOpen(false)
      toast.success(r.status === "published" ? "Опубликовано на стене" : "Отправлено в предложку")
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить")
    } finally {
      setBusy(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--border-hover] focus:outline-none focus:ring-2 focus:ring-[--accent]/20"

  if (!open) {
    return (
      <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-3">
        <div className="flex items-center gap-3">
          <UserAvatar username={user?.username || "?"} src={user?.avatar} className="h-9 w-9 shrink-0" fallbackClassName="text-xs" />
          <button onClick={() => setOpen(true)} className="h-10 flex-1 rounded-xl border border-[--border-default] bg-[--bg-elevated] px-4 text-left text-sm text-[--text-muted] transition-colors hover:bg-[--bg-hover]">
            Напишите что-нибудь для {community.name}…
          </button>
          <Button size="sm" onClick={() => setOpen(true)}>{canModerate ? "Опубликовать" : "Предложить"}</Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <UserAvatar username={user?.username || "?"} src={user?.avatar} className="h-8 w-8 shrink-0" fallbackClassName="text-xs" />
        <span className="text-sm font-semibold text-[--text-primary]">{canModerate ? "Новый пост на стену" : "Предложить пост"}</span>
        {!canModerate && <span className="text-[11px] text-[--text-muted]">появится после одобрения редактора</span>}
      </div>
      <div className="space-y-2.5">
        <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Заголовок" className={inputCls} />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Текст. Поддерживается **жирный**, *курсив*, `код`." rows={4} className={cn(inputCls, "resize-none")} />
        <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Теги через запятую" className={inputCls} />
        {image && (
          <div className="relative w-fit">
            <img src={image} alt="" className="max-h-44 rounded-lg border border-[--border-default] object-contain" />
            <button onClick={() => setImage("")} className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white" aria-label="Убрать изображение"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button type="button" onClick={() => imageRef.current?.click()} className="flex items-center gap-1.5 rounded-md border border-[--border-default] px-2.5 py-1.5 text-xs text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]" title="Прикрепить изображение">
              <ImageIcon className="h-3.5 w-3.5" /> Картинка
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-[--text-secondary]" title="Пост всегда от имени паблика. Выключите, чтобы скрыть своё авторство.">
              <Switch checked={!anonymous} onChange={(v) => setAnonymous(!v)} size="sm" aria-label="Указывать авторство" />
              <span className="cursor-pointer select-none transition-colors hover:text-[--text-primary]" onClick={() => setAnonymous((a) => !a)}>Указывать авторство</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>Отмена</Button>
            <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>{busy ? "…" : canModerate ? "Опубликовать" : "Предложить"}</Button>
          </div>
        </div>
        <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f) }} />
      </div>
    </section>
  )
}

function QueuePreview({ submissions, onModerate, onOpen }: { submissions: ApiSubmission[]; onModerate: (id: string, a: "approve" | "reject") => void; onOpen: () => void }) {
  return (
    <section className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[--text-primary]">
          <Inbox className="h-4 w-4 text-[--purple]" />Очередь предложенных постов
          <span className="rounded-full bg-[--accent] px-1.5 text-[10px] font-bold text-white">{submissions.length}</span>
        </div>
        <button onClick={onOpen} className="text-[11px] font-semibold text-[--accent] hover:underline">Открыть всю</button>
      </div>
      <div className="space-y-2">
        {submissions.slice(0, 3).map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[--border-default] bg-[--bg-elevated] p-2.5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-[--text-primary]">{s.title}</div>
              <div className="text-[11px] text-[--text-muted]">{s.author_username} · {timeAgo(s.created_at)}</div>
            </div>
            <button onClick={() => onModerate(s.id, "approve")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"><Check className="h-3.5 w-3.5" />Одобрить</button>
            <button onClick={() => onModerate(s.id, "reject")} className="inline-flex items-center gap-1 rounded-lg bg-red-500/12 px-2 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/22"><X className="h-3.5 w-3.5" />Отклонить</button>
          </div>
        ))}
      </div>
    </section>
  )
}

function EditorRow({ editor }: { editor: ApiCommunityEditor }) {
  return (
    <div className="flex items-center gap-2.5">
      <UserAvatar username={editor.username} src={editor.avatar} className="h-8 w-8" fallbackClassName="text-[11px]" />
      <Link href={`/user/${editor.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-[--text-primary] hover:underline">{editor.username}</Link>
      <span className={cn(
        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        editor.public_role === "owner" ? "bg-[--accent]/15 text-[--accent]" : "bg-[--bg-elevated] text-[--text-muted]"
      )}>{editor.public_role === "owner" ? "Владелец" : "Редактор"}</span>
    </div>
  )
}

function EditorsTab({ community, editors, isOwner, onChange }: { community: ApiCommunity; editors: ApiCommunityEditor[]; isOwner: boolean; onChange: () => void }) {
  const [newEditor, setNewEditor] = useState("")
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const slug = community.slug

  const add = async () => {
    if (!newEditor.trim()) return
    try {
      await api.addCommunityEditor(slug, newEditor.trim())
      setNewEditor("")
      toast.success("Редактор добавлен")
      onChange()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") }
  }
  const remove = async (userId: string) => {
    try {
      await api.removeCommunityEditor(slug, userId)
      toast.success("Удалён")
      onChange()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка") }
  }
  const deleteCommunity = async () => {
    if (deleting) return
    if (!confirm(`Удалить паблик «${community.name}»? Подписки, предложка и редакторы будут удалены. Посты со стены сохранятся за их авторами. Это необратимо.`)) return
    setDeleting(true)
    try {
      await api.deleteCommunity(slug)
      toast.success("Паблик удалён")
      router.push("/communities")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Panel>
        <SectionTitle icon={Users} title="Команда паблика" />
        <div className="divide-y divide-[--border-default]">
          {editors.map((editor) => (
            <div key={`${editor.id}-${editor.public_role}`} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <UserAvatar username={editor.username} src={editor.avatar} className="h-9 w-9" fallbackClassName="text-xs" />
              <Link href={`/user/${editor.username}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-[--text-primary] hover:underline">{editor.username}</Link>
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", editor.public_role === "owner" ? "bg-[--accent]/15 text-[--accent]" : "bg-[--bg-elevated] text-[--text-muted]")}>
                {editor.public_role === "owner" ? "Владелец" : "Редактор"}
              </span>
              {isOwner && editor.public_role === "editor" && (
                <button onClick={() => remove(editor.id)} className="rounded-lg p-1.5 text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--destructive]" title="Убрать редактора">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
        {isOwner && (
          <div className="mt-3 flex gap-2 border-t border-[--border-default] pt-3">
            <input value={newEditor} onChange={(e) => setNewEditor(e.target.value)} placeholder="username нового редактора" className="h-9 flex-1 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-xs text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none" />
            <Button size="sm" onClick={add}>Добавить</Button>
          </div>
        )}
      </Panel>

      {isOwner && (
        <section className="rounded-2xl border border-[--destructive]/30 bg-[--destructive]/5 p-4">
          <h3 className="mb-1 text-sm font-semibold text-[--destructive]">Опасная зона</h3>
          <p className="mb-3 text-xs leading-5 text-[--text-muted]">Удаление паблика необратимо. Посты со стены сохранятся за их авторами.</p>
          <Button size="sm" onClick={deleteCommunity} disabled={deleting} className="text-white hover:brightness-110" style={{ backgroundColor: "var(--color-destructive)" }}>
            <Trash2 className="h-3.5 w-3.5" />{deleting ? "Удаление..." : "Удалить паблик"}
          </Button>
        </section>
      )}
    </div>
  )
}

function SubmissionCard({ submission, onModerate }: { submission: ApiSubmission; onModerate: (id: string, action: "approve" | "reject") => void }) {
  return (
    <article className="rounded-2xl border border-[--border-default] bg-[--bg-surface] p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-[--text-muted]">
        <UserAvatar username={submission.author_username} src={submission.author_avatar} className="h-6 w-6" fallbackClassName="text-[10px]" />
        <span className="font-semibold text-[--text-secondary]">{submission.author_username}</span>
        <span>{timeAgo(submission.created_at)}</span>
        <span className="ml-auto rounded bg-[--bg-elevated] px-1.5 py-0.5 text-[10px]">{submission.as_community ? "от паблика" : "от автора"}</span>
      </div>
      <h3 className="text-sm font-semibold text-[--text-primary]">{submission.title}</h3>
      {submission.content && <p className="mt-1 line-clamp-4 text-[13px] leading-5 text-[--text-secondary]">{submission.content}</p>}
      {submission.image && <img src={submission.image} alt="" className="mt-2 max-h-60 rounded-lg border border-[--border-default] object-contain" />}
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => onModerate(submission.id, "reject")}><X className="h-3.5 w-3.5" />Отклонить</Button>
        <Button size="sm" onClick={() => onModerate(submission.id, "approve")}><Check className="h-3.5 w-3.5" />Одобрить</Button>
      </div>
    </article>
  )
}
