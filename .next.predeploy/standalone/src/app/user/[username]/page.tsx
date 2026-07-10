/* eslint-disable @next/next/no-img-element */
"use client"

import { Header } from "@/components/layout/header"
import { PostCard } from "@/components/layout/post-card"
import { Panel, SectionTitle, EmptyState } from "@/components/profile/panels"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { UserAvatar } from "@/components/ui/user-avatar"
import { useAuth } from "@/components/auth/auth-context"
import { api, ApiPost, ApiUserProfile } from "@/lib/api"
import { compressImageForUpload } from "@/lib/client-image"
import { ALL_DRIVERS } from "@/lib/drivers"
import { cn, teamSlug } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"
import { ReportDialog } from "@/components/ui/report-dialog"
import { toast } from "sonner"
import {
  Activity, Award, Calendar, Camera, Check, ChevronRight, Edit3, Eye, EyeOff, FileText,
  Flag, Gauge, Images, Medal, MessageCircle, MoreHorizontal,
  Settings, Share2, Star, ThumbsDown, ThumbsUp, Trophy, Users, Zap, type LucideIcon,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type ProfileTab = "posts" | "media" | "achievements" | "stats"

const PROFILE_TABS: Array<{ key: ProfileTab; label: string; icon: LucideIcon }> = [
  { key: "posts", label: "Посты", icon: FileText },
  { key: "media", label: "Медиа", icon: Images },
  { key: "achievements", label: "Достижения", icon: Award },
  { key: "stats", label: "Статистика", icon: Gauge },
]

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
const BADGE_ICONS: LucideIcon[] = [Medal, Flag, Trophy, Star, Award, Zap]
const BADGE_TONES = ["var(--color-gold)", "var(--color-teal)", "var(--color-blue)", "var(--color-purple)", "var(--color-accent)"]

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : String(n)
const ru = (n: number) => n.toLocaleString("ru-RU")

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: me } = useAuth()
  const username = params.username as string
  const [profile, setProfile] = useState<ApiUserProfile | null>(null)
  const [posts, setPosts] = useState<ApiPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [editBio, setEditBio] = useState("")
  const [editName, setEditName] = useState("")
  const [editBusy, setEditBusy] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [muted, setMuted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [tab, setTab] = useState<ProfileTab>("posts")
  const [sort, setSort] = useState<"new" | "top">("new")
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const reduce = useReducedMotion()

  const isOwn = me?.username === username

  const load = useCallback(async () => {
    try {
      const d = await api.getUserProfile(username)
      setProfile(d.profile)
      setPosts(d.posts)
      setIsFollowing(Boolean(d.profile.is_following))
      setMuted(Boolean(d.profile.is_muted))
      setError("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить профиль")
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => { load() }, [load])

  const toggleFollow = async () => {
    if (!me || !profile) return
    try {
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Не удалось обновить подписку")
      setIsFollowing(Boolean(d.following))
      setProfile((current) => current ? {
        ...current,
        followers_count: Math.max(0, current.followers_count + (d.following ? 1 : -1)),
        is_following: d.following ? 1 : 0,
      } : current)
    } catch {
      // The profile remains usable even if the social action fails.
    }
  }

  const shareProfile = async () => {
    setMenuOpen(false)
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/user/${username}`)
      toast.success("Ссылка на профиль скопирована")
    } catch {
      toast.error("Не удалось скопировать ссылку")
    }
  }

  const toggleMute = async () => {
    if (!me || !profile) return
    setMenuOpen(false)
    const next = !muted
    setMuted(next)
    try {
      await api.feedSignal("mute_author", profile.id, !next)
      toast.success(next ? "Посты пользователя скрыты из «Для вас»" : "Снова показываем в «Для вас»")
    } catch {
      setMuted(!next)
      toast.error("Не удалось обновить")
    }
  }

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    try {
      const compressed = await compressImageForUpload(file, {
        maxSide: type === "avatar" ? 512 : 1600,
        quality: type === "avatar" ? 0.8 : 0.82,
      })
      const form = new FormData()
      form.append("file", compressed)
      const upload = await fetch("/api/upload", { method: "POST", body: form })
      const data = await upload.json() as { url?: string; error?: string }
      if (!upload.ok || !data.url) throw new Error(data.error || "Upload failed")
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: data.url }),
      })
      if (res.ok) load()
    } catch {}
  }

  const handleSaveProfile = async () => {
    setEditBusy(true)
    try {
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: editBio, display_name: editName }),
      })
      setEditing(false)
      load()
    } catch {}
    setEditBusy(false)
  }

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tagName of post.tags?.length ? post.tags : post.tag ? [post.tag] : []) {
        counts.set(tagName, (counts.get(tagName) || 0) + 1)
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [posts])

  // Last 7 days of posting activity, derived from post timestamps.
  const week = useMemo(() => {
    const now = new Date()
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(now.getDate() - (6 - i))
      return { time: d.getTime(), label: WEEKDAYS[d.getDay()], count: 0 }
    })
    for (const p of posts) {
      const d = new Date(p.created_at)
      d.setHours(0, 0, 0, 0)
      const b = buckets.find((x) => x.time === d.getTime())
      if (b) b.count++
    }
    return buckets
  }, [posts])
  const weekMax = Math.max(1, ...week.map((b) => b.count))

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header showTicker />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">Загрузка...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header showTicker />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="mb-3 text-[--text-muted]">{error || "Пользователь не найден"}</p>
            <button onClick={() => router.push("/")} className="text-sm text-[--accent] hover:underline">На главную</button>
          </div>
        </div>
      </div>
    )
  }

  const teamColor = profile.team ? getTeamColor(profile.team) : "var(--color-accent)"
  const driverInfo = profile.driver ? ALL_DRIVERS.find((d) => d.code === profile.driver) : null
  const memberSince = new Date(profile.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
  const totalUp = profile.upvotes_received || 0
  const totalDown = profile.downvotes_received ?? ((profile.post_downvotes_received || 0) + (profile.comment_downvotes_received || 0))

  const mediaPosts = posts.filter((post) => post.image)
  const sortedPosts = [...posts].sort((a, b) => {
    const ap = a.owner_pinned_at ? 1 : 0
    const bp = b.owner_pinned_at ? 1 : 0
    if (ap !== bp) return bp - ap
    return sort === "top"
      ? (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Staggered entrance for sidebar cards.
  const rail = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.05 } },
  }
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header showTicker />
      <main className="flex-1 py-5">
        <div className="mx-auto w-full max-w-[1200px] px-4">
          {/* ── Hero ───────────────────────────────────────────── */}
          <motion.section
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden rounded-2xl border border-[--border-default] bg-[--bg-surface]"
          >
            <div className="relative h-44 md:h-56">
              {profile.cover ? (
                <img src={profile.cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="paddock-hero h-full w-full">
                  <div className="h-full w-full" style={{ background: `radial-gradient(120% 140% at 12% 0%, color-mix(in srgb, ${teamColor} 32%, transparent), transparent 52%)` }} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[--bg-surface] via-[--bg-surface]/70 to-transparent" />
              {isOwn && (
                <button
                  onClick={() => coverRef.current?.click()}
                  className="absolute right-3 top-3 flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-black/45 px-2.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/65"
                >
                  <Camera className="h-3.5 w-3.5" /> Обложка
                </button>
              )}
            </div>

            <div className="px-4 pb-4 md:px-6">
              <div className="-mt-14 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
                <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
                  <div className="relative shrink-0">
                    <UserAvatar
                      username={profile.username}
                      src={profile.avatar}
                      color={teamColor}
                      className="h-28 w-28 rounded-full ring-4 ring-[--bg-surface] md:h-32 md:w-32"
                      fallbackClassName="text-3xl"
                    />
                    {isOwn && (
                      <button
                        onClick={() => avatarRef.current?.click()}
                        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[--bg-surface] bg-[--bg-elevated] text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
                        title="Обновить аватар"
                      >
                        <Camera className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="break-words text-2xl font-black text-[--text-primary] md:text-[28px]">{profile.display_name || profile.username}</h1>
                      {profile.team && <TeamLogo team={profile.team} size={20} />}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[--text-muted]">
                      <span className="font-medium text-[--text-secondary]">@{profile.username}</span>
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />На PADDOCK с {memberSince}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:pb-2">
                  {isOwn ? (
                    <>
                      <button onClick={() => { setEditing(!editing); setEditBio(profile.bio || ""); setEditName(profile.display_name || "") }} className="flex h-9 items-center gap-2 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm font-semibold text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                        <Edit3 className="h-4 w-4" />{editing ? "Отмена" : "Редактировать"}
                      </button>
                      <Link href="/settings" className="flex h-9 items-center gap-2 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm font-semibold text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                        <Settings className="h-4 w-4" />Настройки
                      </Link>
                    </>
                  ) : me && (
                    <>
                      {isFollowing && profile.is_followed_by ? (
                        <Link href={`/messages?u=${profile.id}`} style={{ backgroundColor: "var(--accent)" }} className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-110">
                          <MessageCircle className="h-4 w-4" />Написать
                        </Link>
                      ) : null}
                      <button
                        onClick={toggleFollow}
                        className={cn(
                          "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
                          isFollowing ? "border border-[--border-default] bg-[--bg-elevated] text-[--text-primary] hover:bg-[--bg-hover]" : "bg-[--accent] text-white hover:bg-[--accent-hover]"
                        )}
                      >
                        {isFollowing ? "Подписан" : "Подписаться"}
                      </button>
                    </>
                  )}
                  <div className="relative">
                    <button onClick={() => setMenuOpen((o) => !o)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--border-default] bg-[--bg-elevated] text-[--text-secondary] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]" aria-label="Ещё">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <div className="glass-popup absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg p-1 shadow-2xl">
                          <button onClick={shareProfile} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                            <Share2 className="h-3.5 w-3.5" /> Поделиться профилем
                          </button>
                          {me && !isOwn && (
                            <>
                              <button onClick={toggleMute} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                                {muted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                {muted ? "Показывать в «Для вас»" : "Скрыть в «Для вас»"}
                              </button>
                              <button onClick={() => { setMenuOpen(false); setShowReport(true) }} className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-[--destructive] transition-colors hover:bg-[--destructive]/10">
                                <Flag className="h-3.5 w-3.5" /> Пожаловаться
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {profile && (
                  <ReportDialog open={showReport} onClose={() => setShowReport(false)} userId={profile.id} contextText={profile.display_name || profile.username} />
                )}
              </div>

              {editing && (
                <div className="mt-4 space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[--text-muted]">Отображаемое имя</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={40}
                      placeholder={profile.username}
                      className="h-9 w-full max-w-sm rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-[--text-muted]">Имя видно вместо @{profile.username}. Оставьте пустым, чтобы показывать ник.</p>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-start">
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="О себе..."
                      rows={2}
                      className="min-h-20 flex-1 resize-none rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-placeholder] focus:border-[--accent] focus:outline-none"
                    />
                    <button onClick={handleSaveProfile} disabled={editBusy} className="h-9 rounded-lg bg-[--accent] px-4 text-sm font-semibold text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-50">Сохранить</button>
                  </div>
                </div>
              )}

              {/* Stats bar */}
              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[--border-default] bg-[--border-default] sm:grid-cols-3 lg:grid-cols-6">
                <Stat icon={Zap} tone="var(--color-gold)" label="Карма" value={ru(profile.karma)} />
                <Stat icon={FileText} tone="var(--color-text-secondary)" label="Посты" value={ru(profile.post_count)} />
                <Stat icon={MessageCircle} tone="var(--color-blue)" label="Комментарии" value={ru(profile.comment_count)} />
                <Stat icon={Users} tone="var(--color-teal)" label="Подписчики" value={ru(profile.followers_count)} />
                <Stat icon={Trophy} tone="var(--color-purple)" label="Фэнтези" value={ru(profile.fantasy_points || 0)} />
                <Stat icon={ThumbsUp} tone="var(--color-upvote)" label="Голоса" value={
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[--upvote]">{compact(totalUp)}</span>
                    <span className="text-[--text-muted]">/</span>
                    <span className="text-[--downvote]">{compact(totalDown)}</span>
                  </span>
                } />
              </div>
            </div>
          </motion.section>

          {/* ── Body ───────────────────────────────────────────── */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="overflow-x-auto">
                  <div className="paddock-control inline-flex items-center gap-1 rounded-xl p-1">
                    {PROFILE_TABS.map((t) => {
                      const Icon = t.icon
                      const active = tab === t.key
                      return (
                        <button
                          key={t.key}
                          onClick={() => setTab(t.key)}
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                            active ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />{t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {tab === "posts" && (
                  <button
                    onClick={() => setSort(sort === "new" ? "top" : "new")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[--border-default] bg-[--bg-elevated] px-3 text-xs font-medium text-[--text-secondary] transition-colors hover:text-[--text-primary]"
                  >
                    {sort === "new" ? "Сначала новые" : "Сначала лучшие"}
                    <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                  </button>
                )}
              </div>

              {tab === "posts" && (
                <div className="flex flex-col gap-2.5">
                  {sortedPosts.length === 0 ? <EmptyState text="Постов пока нет" />
                    : sortedPosts.map((post) => <PostCard key={post.id} post={post} context="profile" />)}
                </div>
              )}

              {tab === "media" && (
                <div className="flex flex-col gap-2.5">
                  {mediaPosts.length === 0 ? <EmptyState text="Медиа-постов пока нет" />
                    : mediaPosts.map((post) => <PostCard key={post.id} post={post} context="profile" />)}
                </div>
              )}

              {tab === "achievements" && (
                <Panel>
                  <div className="mb-3 flex items-center justify-between">
                    <SectionTitle icon={Award} title="Достижения" inline />
                    {profile.achievements?.length > 0 && (
                      <span className="text-xs font-semibold tabular-nums text-[--text-muted]">
                        {profile.achievements.filter((a) => a.earned).length} из {profile.achievements.length}
                      </span>
                    )}
                  </div>
                  {profile.achievements?.length ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {profile.achievements.map((a, i) => <BadgeCard key={a.id} index={i} achievement={a} />)}
                    </div>
                  ) : <EmptyState text="Достижения ещё впереди" />}
                </Panel>
              )}

              {tab === "stats" && (
                <div className="flex flex-col gap-4">
                  <Panel>
                    <SectionTitle icon={Gauge} title="Голоса и фэнтези" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <VoteBlock label="Посты" up={profile.post_upvotes_received || 0} down={profile.post_downvotes_received || 0} />
                      <VoteBlock label="Комментарии" up={profile.comment_upvotes_received || 0} down={profile.comment_downvotes_received || 0} />
                      <div className="rounded-xl border border-[--border-default] bg-[--bg-elevated] p-3">
                        <div className="text-xs text-[--text-muted]">Fantasy</div>
                        <div className="mt-1 text-xl font-black tabular-nums text-[--text-primary]">{ru(profile.fantasy_points || 0)}</div>
                        <p className="mt-1 text-[11px] text-[--text-muted]">{profile.fantasy_hits || 0} попаданий из {profile.fantasy_bets || 0}</p>
                      </div>
                    </div>
                  </Panel>
                  <Panel>
                    <SectionTitle icon={Activity} title="Активность за неделю" />
                    <div className="flex h-28 items-end justify-between gap-2">
                      {week.map((b, i) => {
                        const peak = b.count === weekMax && b.count > 0
                        return (
                          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                            <span className="text-[10px] font-semibold tabular-nums text-[--text-muted]">{b.count || ""}</span>
                            <div className="w-full rounded-md transition-all" style={{ height: `${Math.max(6, (b.count / weekMax) * 72)}px`, backgroundColor: b.count > 0 ? (profile.team ? getTeamColor(profile.team) : "var(--accent)") : "var(--color-bg-active)", opacity: peak ? 1 : (b.count > 0 ? 0.55 : 1) }} />
                            <span className="text-[10px] text-[--text-muted]">{b.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Panel>
                </div>
              )}
            </section>

            {/* ── Right rail ──────────────────────────────────── */}
            <motion.aside className="space-y-3" variants={rail} initial="hidden" animate="show">
              <motion.div variants={item}>
                <Panel>
                  <SectionTitle icon={FileText} title="О себе" />
                  {profile.bio ? (
                    <p className="text-sm leading-6 text-[--text-secondary]">{profile.bio}</p>
                  ) : (
                    <p className="text-xs text-[--text-muted]">{isOwn ? "Расскажите о себе — нажмите «Редактировать»." : "Пользователь пока ничего не рассказал."}</p>
                  )}
                  <div className="mt-3 text-xs text-[--text-muted]">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />На PADDOCK с {memberSince}</span>
                  </div>
                </Panel>
              </motion.div>

              <motion.div variants={item}>
                <Panel>
                  <SectionTitle icon={Star} title="Любимые теги" />
                  {topTags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {topTags.map(([tagName, count]) => (
                        <span key={tagName} className="inline-flex items-center gap-1 rounded-full border border-[--border-default] bg-[--bg-elevated] px-2 py-0.5 text-[11px] font-medium text-[--text-secondary]">
                          #{tagName}<span className="text-[--text-muted]">{count}</span>
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-xs text-[--text-muted]">Теги появятся после первых постов.</p>}
                </Panel>
              </motion.div>

              <motion.div variants={item} className="grid grid-cols-1 gap-3">
                {profile.team && (
                  <Link href={`/teams/${teamSlug(profile.team)}`} className="group flex items-center justify-between rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 transition-colors hover:bg-[--bg-elevated]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${teamColor} 18%, transparent)` }}>
                        <TeamLogo team={profile.team} size={18} />
                      </span>
                      <div>
                        <div className="text-[11px] text-[--text-muted]">Команда сердца</div>
                        <div className="text-sm font-semibold text-[--text-primary]">{profile.team}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[--text-muted] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
                {driverInfo && (
                  <Link href={`/drivers/${driverInfo.code}`} className="group flex items-center justify-between rounded-xl border border-[--border-default] bg-[--bg-surface] p-3 transition-colors hover:bg-[--bg-elevated]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--bg-elevated] font-mono text-xs font-bold" style={{ color: teamColor }}>{driverInfo.code}</span>
                      <div>
                        <div className="text-[11px] text-[--text-muted]">Любимый пилот</div>
                        <div className="text-sm font-semibold text-[--text-primary]">{driverInfo.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[--text-muted] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </motion.div>
            </motion.aside>
          </div>
        </div>
      </main>

      {isOwn && <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "avatar") }} />}
      {isOwn && <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file, "cover") }} />}
    </div>
  )
}


function Stat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="bg-[--bg-surface] px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[--text-muted]">
        <Icon className="h-3.5 w-3.5" style={{ color: tone }} />{label}
      </div>
      <div className="mt-1 text-lg font-black tabular-nums text-[--text-primary]">{value}</div>
    </div>
  )
}

function BadgeCard({ index, achievement }: { index: number; achievement: ApiUserProfile["achievements"][number] }) {
  const { id, name, description, current, target, earned } = achievement
  const [imgError, setImgError] = useState(false)
  const Icon = BADGE_ICONS[index % BADGE_ICONS.length]
  const tone = BADGE_TONES[index % BADGE_TONES.length]
  const pct = Math.min(100, Math.round((current / target) * 100))
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border border-[--border-default] p-3", earned ? "bg-[--bg-elevated]" : "bg-[--bg-surface]")}>
      {imgError ? (
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
          style={earned
            ? { backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }
            : { backgroundColor: "var(--color-bg-elevated)", color: "var(--color-text-muted)" }}
        >
          <Icon className="h-5 w-5" />
        </span>
      ) : (
        <Image
          src={`/art/achievements/${id}.png`}
          alt=""
          width={48}
          height={48}
          onError={() => setImgError(true)}
          className={cn("h-12 w-12 shrink-0 object-contain", !earned && "opacity-40 grayscale")}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-semibold", earned ? "text-[--text-primary]" : "text-[--text-secondary]")}>{name}</span>
          {earned && <Check className="h-3.5 w-3.5 shrink-0 text-[--live]" />}
        </div>
        <p className="mt-0.5 text-xs leading-5 text-[--text-muted]">{description}</p>
        {!earned && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[--bg-elevated]">
              <div className="h-full rounded-full bg-[--accent] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-[10px] font-medium tabular-nums text-[--text-muted]">{current} / {target}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function VoteBlock({ label, up, down }: { label: string; up: number; down: number }) {
  return (
    <div className="rounded-xl border border-[--border-default] bg-[--bg-elevated] p-3">
      <div className="text-xs text-[--text-muted]">{label}</div>
      <div className="mt-2 flex items-center justify-between text-sm font-semibold tabular-nums">
        <span className="inline-flex items-center gap-1 text-[--upvote]"><ThumbsUp className="h-3.5 w-3.5" />{ru(up)}</span>
        <span className="inline-flex items-center gap-1 text-[--downvote]"><ThumbsDown className="h-3.5 w-3.5" />{ru(down)}</span>
      </div>
    </div>
  )
}
