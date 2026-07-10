/* eslint-disable @next/next/no-img-element */
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUp, Clock, Flame, Image as ImageIcon, X } from "lucide-react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/ui/user-avatar"
import { PostContent } from "@/components/ui/post-content"
import { PostSkeleton } from "@/components/ui/skeleton"
import { api, ApiPost } from "@/lib/api"
import { LIMITS } from "@/lib/validation"
import { compressImageForUpload } from "@/lib/client-image"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth/auth-context"
import { getPref, setPref } from "@/lib/prefs"
import { PostCard } from "./post-card"
import { useRouter, useSearchParams } from "next/navigation"

const SORTS = [
  { label: "Свежее", key: "new", icon: Clock },
  { label: "Популярное", key: "top", icon: Flame },
]

function parseTagInput(value: string) {
  const seen = new Set<string>()
  return value
    .split(",")
    .map((tagName) => tagName.replace(/^#+/, "").trim())
    .filter(Boolean)
    .map((tagName) => tagName.slice(0, 32))
    .filter((tagName) => {
      const key = tagName.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)
}

function newPostsLabel(n: number) {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return `${n} новый пост`
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return `${n} новых поста`
  return `${n} новых постов`
}

interface Props {
  searchQuery?: string
  focusCreate?: boolean
  onFocusDone?: () => void
}

export function Feed({ searchQuery, focusCreate, onFocusDone }: Props) {
  const { user } = useAuth()
  const userTeam = user?.team || null
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSearchQuery = searchParams.get("q") || ""
  const effectiveSearchQuery = searchQuery || urlSearchQuery
  const [sort, setSort] = useState("new")
  const [feedMode, setFeedMode] = useState<"foryou" | "all" | "following" | "team">("foryou")
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tag, setTag] = useState("")
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [image, setImage] = useState("")
  const [previewMode, setPreviewMode] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const [newCount, setNewCount] = useState(0)
  const sinceRef = useRef<string>(new Date().toISOString())
  const seenRef = useRef<Set<string>>(new Set())

  const loadPosts = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      // "Для вас" ranks personally, but a search/tag filter falls back to chronological so filtering still works.
      const personalized = feedMode === "foryou" && !effectiveSearchQuery && !tagFilter
      const feedParam = feedMode === "following" ? "following" : personalized ? "foryou" : undefined
      const data = await api.getPosts(
        pageNum,
        sort,
        tagFilter || undefined,
        effectiveSearchQuery || undefined,
        undefined,
        feedParam,
        feedMode === "team" ? userTeam || undefined : undefined
      )
      setPosts((prev) => pageNum === 1 ? data.posts : [...prev, ...data.posts])
      setTotal(data.total)
      if (pageNum === 1) { sinceRef.current = new Date().toISOString(); setNewCount(0) }
      if (user && personalized) data.posts.forEach((p) => seenRef.current.add(p.id))
    } catch {
      toast.error("Не удалось загрузить ленту")
    } finally {
      setLoading(false)
    }
  }, [effectiveSearchQuery, feedMode, sort, tagFilter, userTeam, user])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1)
      void loadPosts(1)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadPosts])

  useEffect(() => {
    if (!focusCreate) return
    const timeout = window.setTimeout(() => {
      setShowCreate(true)
      titleRef.current?.focus()
      onFocusDone?.()
    }, 100)
    return () => window.clearTimeout(timeout)
  }, [focusCreate, onFocusDone])

  useEffect(() => {
    if (searchParams.get("compose") === "1") {
      setShowCreate(true)
      const timeout = window.setTimeout(() => titleRef.current?.focus(), 100)
      return () => window.clearTimeout(timeout)
    }
  }, [searchParams])

  // Restore the last-used feed tab (cookie exists only if the visitor allowed preferences).
  useEffect(() => {
    const saved = getPref("feedtab")
    if (saved && ["foryou", "all", "following", "team"].includes(saved)) {
      setFeedMode(saved as "foryou" | "all" | "following" | "team")
    }
  }, [])

  const flushSeen = useCallback(() => {
    if (!user) return
    const ids = [...seenRef.current]
    if (!ids.length) return
    seenRef.current = new Set()
    api.markSeen(ids).catch(() => {})
  }, [user])

  // Poll for newer posts to surface the "N новых постов" pill.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return
      api.getNewCount(sinceRef.current).then((d) => setNewCount(d.new_since || 0)).catch(() => {})
    }
    const id = window.setInterval(tick, 30000)
    return () => window.clearInterval(id)
  }, [])

  // Flush seen posts on unmount so the next "Для вас" visit feels fresh.
  useEffect(() => () => flushSeen(), [flushSeen])

  const refreshFeed = () => {
    flushSeen()
    setNewCount(0)
    setPage(1)
    void loadPosts(1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCreate = async () => {
    if (!title.trim() || !user) return
    setBusy(true)
    try {
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        tags: parseTagInput(tag),
        image: image || undefined,
      })
      toast.success("Пост опубликован")
      setTitle("")
      setContent("")
      setTag("")
      setImage("")
      setShowCreate(false)
      setPage(1)
      await loadPosts(1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось опубликовать пост")
    } finally {
      setBusy(false)
    }
  }

  const loadMore = useCallback(() => {
    const next = page + 1
    setPage(next)
    void loadPosts(next)
  }, [loadPosts, page])

  const hasMore = posts.length < total

  useEffect(() => {
    const node = loadMoreRef.current
    if (!node || !hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore()
      },
      { rootMargin: "200px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loadMore, loading])

  return (
    <main className="flex-1 min-w-0 py-5">
      <div className="max-w-[640px] mx-auto px-4">
        {user ? (
          <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 mb-5">
            {showCreate ? (
              <div className="space-y-2.5">
                <div>
                  <input
                    ref={titleRef}
                    placeholder="Заголовок"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={cn(
                      "w-full bg-[--bg-elevated] border rounded-md px-3 py-1.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none transition-colors",
                      title.length > LIMITS.postTitleMax ? "border-red-400/70 focus:border-red-400" : "border-[--border-default] focus:border-[--border-hover]"
                    )}
                  />
                  {title.length > LIMITS.postTitleMax && (
                    <p className="mt-1 text-[10px] text-red-400">
                      Заголовок слишком длинный: {title.length} / {LIMITS.postTitleMax}
                    </p>
                  )}
                </div>
                <div className="flex bg-[--bg-elevated] rounded-md p-0.5 gap-0.5 w-fit">
                  <button onClick={() => setPreviewMode(false)} className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${!previewMode ? "bg-[--bg-surface] text-[--text-primary]" : "text-[--text-muted]"}`}>Редактор</button>
                  <button onClick={() => setPreviewMode(true)} className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${previewMode ? "bg-[--bg-surface] text-[--text-primary]" : "text-[--text-muted]"}`}>Предпросмотр</button>
                </div>
                {previewMode ? (
                  <div className="min-h-[100px] bg-[--bg-elevated] border border-[--border-default] rounded-md px-3 py-1.5 text-[13px] text-[--text-secondary]">
                    {content ? <PostContent text={content} /> : <span className="text-[--text-placeholder]">Предпросмотр пуст...</span>}
                  </div>
                ) : (
                  <textarea
                    placeholder="Текст. Поддерживается **жирный**, *курсив*, `код`."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={3}
                    className="w-full bg-[--bg-elevated] border border-[--border-default] rounded-md px-3 py-1.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--border-hover] transition-colors resize-none"
                  />
                )}
                {image && (
                  <div className="relative">
                    <img src={image} alt="" className="max-h-40 rounded-md" />
                    <button onClick={() => setImage("")} className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded" aria-label="Убрать изображение"><X className="w-3 h-3" /></button>
                  </div>
                )}
                <input
                  placeholder="Теги через запятую: Техника, Мем, Статистика..."
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full bg-[--bg-elevated] border border-[--border-default] rounded-md px-3 py-1.5 text-[13px] text-[--text-primary] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--border-hover] transition-colors"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageRef.current?.click()}
                    className="p-1.5 rounded text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-hover] transition-colors"
                    title="Прикрепить изображение"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={busy || !title.trim() || title.length > LIMITS.postTitleMax || content.length > LIMITS.postContentMax}
                    className="h-7 px-3 rounded-md text-xs font-medium text-white bg-[--accent] hover:bg-[--accent-hover] disabled:opacity-50 transition-colors"
                  >
                    {busy ? "..." : "Опубликовать"}
                  </button>
                  <button onClick={() => setShowCreate(false)} className="h-7 px-3 rounded-md text-xs font-medium text-[--text-muted] hover:text-[--text-primary] transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <UserAvatar username={user.username} src={user.avatar} className="h-8 w-8 shrink-0" />
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex-1 bg-[--bg-elevated] border border-[--border-default] rounded-full px-4 py-2 text-left text-[13px] text-[--text-muted] hover:border-[--accent]/40 hover:text-[--text-secondary] transition-colors"
                >
                  Поделитесь мыслью о Формуле 1...
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 mb-5 text-center text-[13px] text-[--text-muted]">
            Войдите, чтобы создавать посты, голосовать и сохранять обсуждения.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="paddock-control flex items-center gap-1 rounded-xl p-1">
            {([
              { key: "foryou", label: "Для вас" },
              { key: "all", label: "Все" },
              { key: "following", label: "Подписки" },
              { key: "team", label: userTeam || "Моя команда" },
            ] as const).map((mode) => {
              const disabled = (mode.key === "following" && !user) || (mode.key === "team" && !userTeam)
              const active = feedMode === mode.key
              return (
                <button
                  key={mode.key}
                  onClick={() => {
                    if (disabled) return
                    setFeedMode(mode.key)
                    setPref("feedtab", mode.key)
                    setPage(1)
                  }}
                  disabled={disabled}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                    active ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                  )}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>
          {feedMode !== "foryou" && (
            <div className="paddock-control flex items-center gap-1 rounded-xl p-1">
              {SORTS.map((sortOption) => {
                const Icon = sortOption.icon
                const active = sort === sortOption.key
                return (
                  <button
                    key={sortOption.key}
                    onClick={() => {
                      setSort(sortOption.key)
                      setPage(1)
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                      active ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {sortOption.label}
                  </button>
                )
              })}
            </div>
          )}
          {tagFilter && (
            <button onClick={() => setTagFilter(null)} className="text-[10px] text-[--text-muted] hover:text-[--text-primary] transition-colors">
              <span className="font-mono text-[10px] text-[--text-muted]">#{tagFilter} <X className="w-3 h-3 inline" /></span>
            </button>
          )}
        </div>

        {effectiveSearchQuery && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-[--border-default] bg-[--bg-surface] px-3 py-2">
            <div className="min-w-0 text-xs text-[--text-secondary]">
              Поиск: <span className="font-semibold text-[--text-primary]">{effectiveSearchQuery}</span>
            </div>
            <button
              onClick={() => router.push("/")}
              className="shrink-0 text-[11px] font-medium text-[--text-muted] hover:text-[--text-primary]"
            >
              Сбросить
            </button>
          </div>
        )}

        {newCount > 0 && (
          <div className="mb-3 flex justify-center">
            <button
              onClick={refreshFeed}
              className="flex items-center gap-1.5 rounded-full bg-[--accent] px-4 py-1.5 text-xs font-bold text-white shadow-lg transition-colors hover:bg-[--accent-hover]"
            >
              <ArrowUp className="w-3.5 h-3.5" /> {newPostsLabel(newCount)}
            </button>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onTagClick={(tagName) => setTagFilter(tagFilter === tagName ? null : tagName)} />
              ))}
            </div>
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-4">
                {loading && posts.length > 0 && <span className="text-[11px] text-[--text-muted]">Загрузка...</span>}
              </div>
            )}
            {posts.length === 0 && !loading && (
              <div className="text-center text-[--text-muted] text-sm py-8">Постов пока нет. Самое время начать обсуждение.</div>
            )}
          </>
        )}
      </div>
      <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-20 md:bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-[--accent] text-white shadow-lg hover:bg-[--accent-hover] transition-colors flex items-center justify-center md:hidden" aria-label="Наверх">
        <ArrowUp className="w-5 h-5" />
      </button>
      <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        try {
          const compressed = await compressImageForUpload(file)
          const form = new FormData()
          form.append("file", compressed)
          const res = await fetch("/api/upload", { method: "POST", body: form })
          const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
          if (!res.ok || !data.url) throw new Error(data.error || "Не удалось загрузить изображение")
          setImage(data.url)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Не удалось загрузить изображение")
        }
      }} />
    </main>
  )
}
