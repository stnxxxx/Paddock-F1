/* eslint-disable @next/next/no-img-element */
"use client"

import { Header } from "@/components/layout/header"
import { useAuth } from "@/components/auth/auth-context"
import { UserAvatar } from "@/components/ui/user-avatar"
import { TeamLogo, getTeamColor } from "@/components/ui/team-logo"
import { PostContent } from "@/components/ui/post-content"
import { ReportDialog } from "@/components/ui/report-dialog"
import { api, ApiComment, ApiPost } from "@/lib/api"
import { cn } from "@/lib/utils"
import { timeAgo, parseDbDate } from "@/lib/time"
import { ArrowBigDown, ArrowBigUp, ArrowLeft, Bookmark, Flag, MessageCircle, Send, Share2, Trash2 } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const id = params.id as string
  const [post, setPost] = useState<ApiPost | null>(null)
  const [comments, setComments] = useState<ApiComment[]>([])
  const [loading, setLoading] = useState(true)
  const [vote, setVote] = useState<number | null>(null)
  const [up, setUp] = useState(0)
  const [down, setDown] = useState(0)
  const [commentText, setCommentText] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [commentSort, setCommentSort] = useState<"new" | "old" | "top">("old")
  const [reportComment, setReportComment] = useState<ApiComment | null>(null)
  const [postAnim, setPostAnim] = useState<1 | -1 | null>(null)
  const [commentAnim, setCommentAnim] = useState<{ id: string; dir: 1 | -1 } | null>(null)

  const load = useCallback(async () => {
    try {
      const d = await api.getPost(id)
      setPost(d.post)
      setComments(d.comments)
      setUp(d.post.upvotes)
      setDown(d.post.downvotes)
      setVote(d.post.user_vote || null)
      setSaved(!!d.post.bookmarked)
    } catch {
      router.push("/")
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  const handleVote = async (dir: 1 | -1) => {
    if (busy) return
    if (!user) { toast.error("Войдите, чтобы голосовать"); return }
    if (post && post.user_id === user.id) { toast.error("Нельзя голосовать за свой пост"); return }
    setBusy(true)
    try {
      setPostAnim(dir)
      const r = await api.vote(id, dir)
      setUp(r.upvotes)
      setDown(r.downvotes)
      setVote(r.user_vote)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить голос")
    } finally {
      setBusy(false)
      setTimeout(() => setPostAnim(null), 400)
    }
  }

  const handleComment = async () => {
    if (!commentText.trim() || !user || busy) return
    setBusy(true)
    try {
      const r = await api.addComment(id, commentText.trim(), replyTo?.id)
      setComments((prev) => [...prev, r.comment])
      setCommentText("")
      setReplyTo(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить комментарий")
    } finally {
      setBusy(false)
    }
  }

  const handleCommentVote = async (commentId: string, dir: 1 | -1) => {
    if (busy) return
    if (!user) { toast.error("Войдите, чтобы голосовать"); return }
    setBusy(true)
    try {
      setCommentAnim({ id: commentId, dir })
      const r = await api.voteComment(commentId, dir)
      setComments((prev) => prev.map((comment) => (
        comment.id === commentId
          ? { ...comment, upvotes: r.upvotes, downvotes: r.downvotes, user_vote: r.user_vote }
          : comment
      )))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось отправить голос")
    } finally {
      setBusy(false)
      setTimeout(() => setCommentAnim(null), 400)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return
    if (!confirm("Удалить комментарий?")) return
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_comment", commentId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Не удалось удалить комментарий")
      }
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить комментарий")
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center text-[--text-muted]">Загрузка...</div>
      </div>
    )
  }

  if (!post) return null
  const isPublicAuthor = post.author_type === "public" && post.public_slug
  const isOwnPost = Boolean(user && post.user_id === user.id)

  const sortedComments = [...comments].sort((a, b) => {
    if (commentSort === "new") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (commentSort === "old") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return (b.upvotes || 0) - (a.upvotes || 0)
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-5">
        <div className="mx-auto max-w-[680px] px-4">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-[13px] text-[--text-muted] transition-colors hover:text-[--text-primary]"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </button>

          <article className="mb-4 rounded-xl border border-[--border-default] bg-[--bg-surface] p-5">
            <div className="mb-3 flex items-center gap-2">
              <UserAvatar
                username={post.username}
                src={isPublicAuthor ? post.public_avatar : post.avatar}
                color={isPublicAuthor ? post.public_color : post.team ? getTeamColor(post.team) : undefined}
                className="h-7 w-7"
                fallbackClassName="text-[11px]"
              />
              <span
                className="cursor-pointer text-sm font-medium hover:underline"
                style={post.team ? { color: getTeamColor(post.team) } : { color: "var(--color-text-primary)" }}
                onClick={() => router.push(isPublicAuthor ? `/p/${post.public_slug}` : `/user/${post.username}`)}
              >
                {post.display_name || post.username}
              </span>
              {!isPublicAuthor && post.display_name && (
                <span className="text-[11px] text-[--text-muted]">@{post.username}</span>
              )}
              {post.team && <TeamLogo team={post.team} size={14} />}
              {isPublicAuthor && post.operator_username && (
                <span className="text-[11px] text-[--text-muted]">от {post.operator_username}</span>
              )}
              <span className="ml-auto text-[11px] text-[--text-muted]">
                {new Date(parseDbDate(post.created_at)).toLocaleString("ru-RU")}
              </span>
            </div>

            <h1 className="mb-3 text-lg font-bold leading-snug text-[--text-primary]">{post.title}</h1>

            {post.content && (
              <div className="mb-4 text-[14px] leading-relaxed text-[--text-secondary]">
                <PostContent text={post.content} />
              </div>
            )}

            {post.sources && post.sources.length > 0 && (
              <section aria-label="Источники" className="mb-4 rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-2.5">
                <h2 className="mb-1.5 text-xs font-semibold text-[--text-primary]">Источники</h2>
                <ul className="space-y-1 text-xs">
                  {post.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener nofollow"
                        className="text-[--accent] hover:underline"
                      >
                        {source.publisher}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {post.image && (
              <div className="mb-4 overflow-hidden rounded-md border border-[--border-default] bg-black/5">
                <img src={post.image} alt={post.title} className="max-h-[640px] w-full rounded-md object-contain" />
              </div>
            )}

            <div className="flex items-center gap-1.5 border-t border-[--border-default] pt-3.5">
              <div
                className="flex items-center rounded-full bg-[--bg-elevated] border p-0.5 transition-colors"
                style={{ borderColor: vote === 1 ? "rgba(77,166,255,0.5)" : vote === -1 ? "rgba(255,138,61,0.5)" : "var(--color-border-default)" }}
              >
                <button
                  onClick={() => handleVote(1)}
                  disabled={isOwnPost || busy}
                  style={vote === 1 ? { backgroundColor: "rgba(77,166,255,0.2)" } : undefined}
                  className={cn(
                    "relative rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    vote === 1 ? "text-[--upvote]" : "text-[--text-muted] hover:text-[--upvote]"
                  )}
                  title={isOwnPost ? "Нельзя голосовать за свой пост" : "Поддержать"}
                >
                  <AnimatePresence>
                    {postAnim === 1 && (
                      <motion.div
                        key="post-up"
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: -18, scale: 1.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center text-[--upvote] pointer-events-none"
                      >
                        <ArrowBigUp className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ArrowBigUp className={cn("h-4 w-4", vote === 1 && "fill-current")} />
                </button>
                <span className={cn(
                  "min-w-[2rem] text-center text-sm font-bold tabular-nums",
                  vote === 1 ? "text-[--upvote]" : vote === -1 ? "text-[--downvote]" : "text-[--text-secondary]"
                )}>
                  {up - down}
                </span>
                <button
                  onClick={() => handleVote(-1)}
                  disabled={isOwnPost || busy}
                  style={vote === -1 ? { backgroundColor: "rgba(255,138,61,0.2)" } : undefined}
                  className={cn(
                    "relative rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    vote === -1 ? "text-[--downvote]" : "text-[--text-muted] hover:text-[--downvote]"
                  )}
                  title={isOwnPost ? "Нельзя голосовать за свой пост" : "Не согласен"}
                >
                  <AnimatePresence>
                    {postAnim === -1 && (
                      <motion.div
                        key="post-down"
                        initial={{ opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 0, y: 18, scale: 1.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center text-[--downvote] pointer-events-none"
                      >
                        <ArrowBigDown className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <ArrowBigDown className={cn("h-4 w-4", vote === -1 && "fill-current")} />
                </button>
              </div>
              <span className="ml-1 flex items-center gap-1.5 h-8 px-3 rounded-full text-sm text-[--text-muted]">
                <MessageCircle className="h-4 w-4" />
                {comments.length}
              </span>
              <div className="ml-auto flex items-center gap-0.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href)
                    toast.success("Ссылка скопирована")
                  }}
                  className="rounded-md p-1.5 text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--text-primary]"
                  title="Скопировать ссылку"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {user && (
                  <button
                    onClick={async () => {
                      try {
                        const r = await api.toggleBookmark(id)
                        setSaved(r.bookmarked)
                        toast.success(r.bookmarked ? "Добавлено в закладки" : "Убрано из закладок")
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Не удалось обновить закладки")
                      }
                    }}
                    className={`rounded-md p-1.5 transition-colors ${saved ? "text-[--gold] hover:bg-[--gold]/10" : "text-[--text-muted] hover:bg-[--bg-hover] hover:text-[--text-primary]"}`}
                    title={saved ? "Убрать из закладок" : "Сохранить"}
                  >
                    <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                  </button>
                )}
              </div>
            </div>
          </article>

          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[--text-primary]">Комментарии ({comments.length})</h2>
            <div className="paddock-control ml-auto flex items-center gap-1 rounded-xl p-1">
              {(["new", "old", "top"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCommentSort(s)}
                  aria-pressed={commentSort === s}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    commentSort === s ? "bg-[--accent] text-white shadow-sm" : "text-[--text-secondary] hover:text-[--text-primary]"
                  )}
                >
                  {s === "new" ? "Новые" : s === "old" ? "Старые" : "Топ"}
                </button>
              ))}
            </div>
          </div>

          {sortedComments.map((c) => {
            const parent = c.parent_id ? comments.find((x) => x.id === c.parent_id) : null
            const isReply = Boolean(c.parent_id)
            return (
              <div key={c.id} className={cn(
                "mb-2 rounded-xl border border-[--border-default] bg-[--bg-surface] p-3.5",
                isReply && "ml-5 border-l-[3px] border-l-[--border-hover]"
              )}>
                <div className="mb-1.5 flex items-center gap-2">
                  <UserAvatar
                    username={c.username}
                    src={c.avatar}
                    color={c.team ? getTeamColor(c.team) : undefined}
                    className="h-6 w-6"
                    fallbackClassName="text-[10px]"
                  />
                  <span
                    className="cursor-pointer text-[13px] font-medium hover:underline"
                    style={c.team ? { color: getTeamColor(c.team) } : { color: "var(--color-text-primary)" }}
                    onClick={() => router.push(`/user/${c.username}`)}
                  >
                    {c.display_name || c.username}
                  </span>
                  {c.team && <TeamLogo team={c.team} size={12} />}
                  <span className="ml-auto text-[10px] text-[--text-muted]">{timeAgo(c.created_at)}</span>
                </div>
                {parent && (
                  <p className="mb-1 text-[10px] text-[--text-muted]">в ответ {parent.username}</p>
                )}
                <p className="mb-2 text-[13px] leading-relaxed text-[--text-secondary]">{c.content}</p>
                <div className="flex items-center gap-1">
                  <div
                    className="flex items-center rounded-full bg-[--bg-elevated] border p-0.5 transition-colors"
                    style={{ borderColor: c.user_vote === 1 ? "rgba(77,166,255,0.5)" : c.user_vote === -1 ? "rgba(255,138,61,0.5)" : "var(--color-border-default)" }}
                  >
                  <button
                    onClick={() => handleCommentVote(c.id, 1)}
                    disabled={!user || busy || c.user_id === user?.id}
                    style={c.user_vote === 1 ? { backgroundColor: "rgba(77,166,255,0.2)" } : undefined}
                    className={cn(
                      "p-1 rounded-full transition-colors relative disabled:cursor-not-allowed disabled:opacity-40",
                      c.user_vote === 1 ? "text-[--upvote]" : "text-[--text-muted] hover:text-[--upvote]"
                    )}
                    title={c.user_id === user?.id ? "Нельзя голосовать за свой комментарий" : "Поддержать"}
                  >
                    <AnimatePresence>
                      {commentAnim?.id === c.id && commentAnim.dir === 1 && (
                        <motion.div
                          key={`comment-up-${c.id}`}
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
                    <ArrowBigUp className={cn("w-4 h-4", c.user_vote === 1 && "fill-current")} />
                  </button>
                  <span className={cn(
                    "font-bold tabular-nums text-xs min-w-[1.75rem] text-center",
                    c.user_vote === 1 ? "text-[--upvote]" : c.user_vote === -1 ? "text-[--downvote]" : "text-[--text-secondary]"
                  )}>
                    {(c.upvotes || 0) - (c.downvotes || 0)}
                  </span>
                  <button
                    onClick={() => handleCommentVote(c.id, -1)}
                    disabled={!user || busy || c.user_id === user?.id}
                    style={c.user_vote === -1 ? { backgroundColor: "rgba(255,138,61,0.2)" } : undefined}
                    className={cn(
                      "p-1 rounded-full transition-colors relative disabled:cursor-not-allowed disabled:opacity-40",
                      c.user_vote === -1 ? "text-[--downvote]" : "text-[--text-muted] hover:text-[--downvote]"
                    )}
                    title={c.user_id === user?.id ? "Нельзя голосовать за свой комментарий" : "Не согласен"}
                  >
                    <AnimatePresence>
                      {commentAnim?.id === c.id && commentAnim.dir === -1 && (
                        <motion.div
                          key={`comment-down-${c.id}`}
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
                    <ArrowBigDown className={cn("w-4 h-4", c.user_vote === -1 && "fill-current")} />
                  </button>
                  </div>
                  {user && (
                  <button
                    onClick={() => { setReplyTo({ id: c.id, username: c.username }); setCommentText(`@${c.username} `) }}
                    className="ml-1 rounded px-1.5 py-0.5 text-[10px] text-[--text-muted] transition-colors hover:bg-[--bg-hover] hover:text-[--text-secondary]"
                  >
                    Ответить
                  </button>
                )}
                  <div className="ml-auto flex items-center gap-0.5">
                    {user && user.id !== c.user_id && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          setReportComment(c)
                        }}
                        className="rounded p-1 text-[--text-muted] transition-colors hover:bg-amber-400/5 hover:text-amber-400"
                        title="Пожаловаться"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(user?.role === "admin" || user?.id === c.user_id) && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="rounded p-1 text-[--text-muted] transition-colors hover:bg-red-400/5 hover:text-red-400"
                        title="Удалить"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {user ? (
            <div className="mt-4 flex items-start gap-2">
              <UserAvatar username={user.username} src={user.avatar} className="mt-1.5 h-7 w-7 shrink-0" fallbackClassName="text-[11px]" />
              <div className="flex flex-1 flex-col gap-1.5">
                {replyTo && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[--text-muted]">Ответ {replyTo.username}</span>
                    <button
                      onClick={() => { setReplyTo(null); setCommentText("") }}
                      className="text-[10px] text-[--text-muted] hover:text-[--text-primary]"
                    >
                      отмена
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <textarea
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-[--border-default] bg-[--bg-elevated] px-3 py-1.5 text-[13px] text-[--text-primary] transition-colors placeholder:text-[--text-placeholder] focus:border-[--border-hover] focus:outline-none"
                  />
                  <button
                    onClick={handleComment}
                    disabled={busy || !commentText.trim()}
                    className="rounded-md bg-[--accent] p-2 text-white transition-colors hover:bg-[--accent-hover] disabled:opacity-50"
                    title="Отправить"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-[13px] text-[--text-muted]">Войдите, чтобы оставить комментарий</p>
          )}
        </div>
      </main>
      <ReportDialog
        open={Boolean(reportComment)}
        onClose={() => setReportComment(null)}
        commentId={reportComment?.id}
        contextText={reportComment?.content}
      />
    </div>
  )
}
