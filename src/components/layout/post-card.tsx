/* eslint-disable @next/next/no-img-element */
"use client"

import { ArrowBigDown, ArrowBigUp, Bookmark, Flag, MessageCircle, MoreHorizontal, Pin, Share2, Trash2 } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { PostContent } from "@/components/ui/post-content"
import { ReportDialog } from "@/components/ui/report-dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { api, ApiPost } from "@/lib/api"
import { useAuth } from "@/components/auth/auth-context"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { timeAgo } from "@/lib/time"

export function PostCard({ post, onTagClick, context }: { post: ApiPost; onTagClick?: (tag: string) => void; context?: "feed" | "profile" }) {
  const { user } = useAuth()
  const router = useRouter()
  const [vote, setVote] = useState<number | null>(post.user_vote || null)
  const [up, setUp] = useState(post.upvotes)
  const [down, setDown] = useState(post.downvotes)
  const [saved, setSaved] = useState(!!post.bookmarked)
  const [busy, setBusy] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [animDir, setAnimDir] = useState<1 | -1 | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [ownerPinned, setOwnerPinned] = useState(!!post.owner_pinned_at)
  const [feedPinned, setFeedPinned] = useState(!!post.feed_pinned_at)

  const isOwnPost = Boolean(user && user.id === post.user_id)
  const isAdmin = user?.role === "admin"
  const showPinned = context === "profile" ? ownerPinned : feedPinned

  const handleVote = async (dir: 1 | -1) => {
    if (busy) return
    if (!user) { toast.error("Войдите, чтобы голосовать"); return }
    if (isOwnPost) { toast.error("Нельзя голосовать за свой пост"); return }
    setBusy(true)
    setAnimDir(dir)

    const prevVote = vote
    const prevUp = up
    const prevDown = down

    let newVote: number | null = dir
    let newUp = up
    let newDown = down

    if (prevVote === dir) {
      newVote = null
      if (dir === 1) newUp = up - 1
      else newDown = down - 1
    } else if (prevVote === -dir) {
      if (dir === 1) {
        newUp = up + 1
        newDown = down - 1
      } else {
        newDown = down + 1
        newUp = up - 1
      }
    } else if (dir === 1) {
      newUp = up + 1
    } else {
      newDown = down + 1
    }

    setVote(newVote)
    setUp(newUp)
    setDown(newDown)

    try {
      const r = await api.vote(post.id, dir)
      setUp(r.upvotes)
      setDown(r.downvotes)
      setVote(r.user_vote)
    } catch (e) {
      setVote(prevVote)
      setUp(prevUp)
      setDown(prevDown)
      toast.error(e instanceof Error ? e.message : "Не удалось отправить голос")
    } finally {
      setBusy(false)
      setTimeout(() => setAnimDir(null), 400)
    }
  }

  const tags = post.tags?.length ? post.tags : post.tag ? [post.tag] : []
  const net = up - down
  const isPublicAuthor = post.author_type === "public" && post.public_slug
  const openAuthor = () => router.push(isPublicAuthor ? `/p/${post.public_slug}` : `/user/${post.username}`)

  const hideCard = () => { setHidden(true); setMenuOpen(false) }
  const notInterested = async () => { hideCard(); try { await api.markSeen([post.id]) } catch {} toast("Скрыто — учтём в «Для вас»") }
  const muteAuthor = async () => { hideCard(); try { await api.feedSignal("mute_author", post.user_id) } catch {} toast.success(`Посты @${post.username} скрыты`) }
  const muteTag = async (t: string) => { hideCard(); try { await api.feedSignal("mute_tag", t) } catch {} toast.success(`Тег «${t}» скрыт`) }
  const boostTag = async (t: string) => { setMenuOpen(false); try { await api.feedSignal("boost_tag", t) } catch {} toast.success(`Будем показывать больше: «${t}»`) }
  const togglePin = async (scope: "profile" | "feed") => {
    setMenuOpen(false)
    try {
      const r = await api.pinPost(post.id, scope)
      if (scope === "profile") { setOwnerPinned(!!r.owner_pinned); toast.success(r.owner_pinned ? "Закреплено в профиле" : "Откреплено из профиля") }
      else { setFeedPinned(!!r.feed_pinned); toast.success(r.feed_pinned ? "Закреплено в ленте" : "Откреплено из ленты") }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Не удалось изменить закреп") }
  }

  if (deleted || hidden) return null

  return (
    <>
    <article className={cn(
      "group/card rounded-xl border bg-[--bg-surface] card-interactive",
      tags.includes("Новость") ? "border-l-[3px] border-l-[--accent] border-[--border-default]" : "border-[--border-default]"
    )}>
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2 mb-2">
          <UserAvatar
            username={post.username}
            src={isPublicAuthor ? post.public_avatar : post.avatar}
            color={isPublicAuthor ? post.public_color : post.team ? getTeamColor(post.team) : undefined}
            className="h-7 w-7 shrink-0"
            fallbackClassName="text-[11px]"
          />
          <span
            className="text-[13px] font-semibold cursor-pointer hover:underline"
            style={post.team ? { color: getTeamColor(post.team) } : { color: "var(--color-text-primary)" }}
            onClick={(e) => { e.stopPropagation(); openAuthor() }}
          >
            {post.display_name || post.username}
          </span>
          {!isPublicAuthor && post.display_name && (
            <span className="text-[11px] text-[--text-muted]">@{post.username}</span>
          )}
          {post.team && <TeamLogo team={post.team} size={14} className="ml-0.5" />}
          {isPublicAuthor && post.operator_username && (
            <span className="text-[10px] text-[--text-muted]">от {post.operator_username}</span>
          )}
          <span className="text-[--text-placeholder]">·</span>
          <span className="text-[11px] text-[--text-muted]">{timeAgo(post.created_at)}</span>
          {showPinned && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[--accent]">
              <Pin className="w-3 h-3" /> Закреплено
            </span>
          )}
          {tags.length > 0 && (
            <div className="ml-auto flex max-w-[45%] flex-wrap justify-end gap-1">
              {tags.map((tagName) => (
                <button
                  key={tagName}
                  onClick={(e) => { e.stopPropagation(); onTagClick?.(tagName) }}
                  className="max-w-full cursor-pointer truncate rounded-md border border-[--border-default] bg-[--bg-elevated] px-2 py-0.5 text-[10px] font-medium text-[--text-muted] transition-colors hover:text-[--text-secondary]"
                >
                  {tagName}
                </button>
              ))}
            </div>
          )}
        </div>

        <h3
          className="text-[15px] font-semibold text-[--text-primary] mb-1 leading-snug cursor-pointer transition-colors group-hover/card:text-white"
          onClick={() => router.push(`/post/${post.id}`)}
        >
          {post.title}
        </h3>

        {post.content && (
          <div className="text-[13px] text-[--text-secondary] leading-relaxed mb-3 line-clamp-3">
            <PostContent text={post.content} />
          </div>
        )}
        {post.image && (
          <div className="mb-3 rounded-lg overflow-hidden border border-[--border-default] bg-black/20">
            <img src={post.image} alt={post.title} className="max-h-[520px] w-full object-contain" />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center rounded-full bg-[--bg-elevated] border p-0.5 transition-colors"
            style={{ borderColor: vote === 1 ? "rgba(77,166,255,0.5)" : vote === -1 ? "rgba(255,138,61,0.5)" : "var(--color-border-default)" }}
          >
            <button
              onClick={() => handleVote(1)}
              disabled={isOwnPost}
              style={vote === 1 ? { backgroundColor: "rgba(77,166,255,0.2)" } : undefined}
              className={cn(
                "p-1 rounded-full transition-colors relative disabled:cursor-not-allowed disabled:opacity-40",
                vote === 1 ? "text-[--upvote]" : "text-[--text-muted] hover:text-[--upvote]"
              )}
              title={isOwnPost ? "Нельзя голосовать за свой пост" : "Поддержать"}
            >
              <AnimatePresence>
                {animDir === 1 && (
                  <motion.div
                    key="up-anim"
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -18, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center text-[--upvote] pointer-events-none"
                  >
                    <ArrowBigUp className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              <ArrowBigUp className={cn("w-4 h-4", vote === 1 && "fill-current")} />
            </button>
            <span className={cn(
              "font-bold tabular-nums text-xs min-w-[1.75rem] text-center",
              vote === 1 ? "text-[--upvote]" : vote === -1 ? "text-[--downvote]" : "text-[--text-secondary]"
            )}>
              {net >= 1000 ? `${(net / 1000).toFixed(1)}K` : net}
            </span>
            <button
              onClick={() => handleVote(-1)}
              disabled={isOwnPost}
              style={vote === -1 ? { backgroundColor: "rgba(255,138,61,0.2)" } : undefined}
              className={cn(
                "p-1 rounded-full transition-colors relative disabled:cursor-not-allowed disabled:opacity-40",
                vote === -1 ? "text-[--downvote]" : "text-[--text-muted] hover:text-[--downvote]"
              )}
              title={isOwnPost ? "Нельзя голосовать за свой пост" : "Не согласен"}
            >
              <AnimatePresence>
                {animDir === -1 && (
                  <motion.div
                    key="down-anim"
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: 18, scale: 1.4 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center text-[--downvote] pointer-events-none"
                  >
                    <ArrowBigDown className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
              <ArrowBigDown className={cn("w-4 h-4", vote === -1 && "fill-current")} />
            </button>
          </div>

          <button
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
            onClick={() => router.push(`/post/${post.id}`)}
            title="Комментарии"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="tabular-nums">{post.comment_count}</span>
          </button>

          <div className="flex items-center gap-0.5 ml-auto">
            {(user?.role === "admin" || user?.id === post.user_id) && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm("Удалить пост?")) return
                  try {
                    const res = await fetch("/api/moderate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "delete_post", postId: post.id }),
                    })
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}))
                      throw new Error(data.error || "Не удалось удалить пост")
                    }
                    toast.success("Пост удалён")
                    setDeleted(true)
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Не удалось удалить пост")
                  }
                }}
                className="p-1.5 rounded-md text-[--text-muted] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
                toast.success("Ссылка скопирована")
              }}
              className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
              title="Скопировать ссылку"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {user && user.id !== post.user_id && (
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  setShowReport(true)
                }}
                className="p-1.5 rounded-md text-[--text-muted] hover:text-[--destructive] hover:bg-[--destructive]/10 transition-colors"
                title="Пожаловаться"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={async () => {
                if (!user) { toast.error("Войдите, чтобы сохранять посты"); return }
                try {
                  const r = await api.toggleBookmark(post.id)
                  setSaved(r.bookmarked)
                  toast.success(r.bookmarked ? "Добавлено в закладки" : "Убрано из закладок")
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Не удалось обновить закладки")
                }
              }}
              className={cn("p-1.5 rounded-md transition-colors", saved ? "text-[--gold] hover:bg-[--gold]/10" : "text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover]")}
              title={saved ? "Убрать из закладок" : "Сохранить"}
            >
              <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
            </button>
            {user && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
                  className="p-1.5 rounded-md text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-hover] transition-colors"
                  title="Ещё"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="glass-popup absolute right-0 bottom-full z-50 mb-1 w-56 overflow-hidden rounded-lg p-1 shadow-2xl">
                      {isOwnPost && (
                        <button onClick={() => togglePin("profile")} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-[--text-primary] transition-colors hover:bg-[--bg-hover]">
                          <Pin className="h-3.5 w-3.5" /> {ownerPinned ? "Открепить из профиля" : "Закрепить в профиле"}
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => togglePin("feed")} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] text-[--accent] transition-colors hover:bg-[--bg-hover]">
                          <Pin className="h-3.5 w-3.5" /> {feedPinned ? "Открепить из ленты" : "Закрепить в ленте"}
                        </button>
                      )}
                      <button onClick={notInterested} className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] text-[--text-primary] transition-colors hover:bg-[--bg-hover]">Не интересно</button>
                      {!isPublicAuthor && !isOwnPost && (
                        <button onClick={muteAuthor} className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] text-[--text-primary] transition-colors hover:bg-[--bg-hover]">Скрыть автора @{post.username}</button>
                      )}
                      {tags[0] && (
                        <button onClick={() => muteTag(tags[0])} className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] text-[--text-primary] transition-colors hover:bg-[--bg-hover]">Скрыть тег «{tags[0]}»</button>
                      )}
                      {tags[0] && (
                        <button onClick={() => boostTag(tags[0])} className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] text-[--text-primary] transition-colors hover:bg-[--bg-hover]">Показывать больше такого</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
    <ReportDialog open={showReport} onClose={() => setShowReport(false)} postId={post.id} />
    </>
  )
}
