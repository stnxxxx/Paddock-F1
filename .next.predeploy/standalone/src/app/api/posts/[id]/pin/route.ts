import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError, apiBanGuard } from "@/lib/auth"

// Toggles a pin on a post.
// Body: { scope: "profile" | "feed" }
//  - "profile": the post author pins it to the top of their profile.
//  - "feed": an admin pins it to the top of the "Все" feed.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const scope = body.scope === "feed" ? "feed" : "profile"

  const db = getDb()
  const post = await db.get<{ user_id: string; owner_pinned_at: string | null; feed_pinned_at: string | null }>(
    "SELECT user_id, owner_pinned_at, feed_pinned_at FROM posts WHERE id = ? AND deleted = 0", [id]
  )
  if (!post) return apiError("Пост не найден", 404)

  if (scope === "profile") {
    if (post.user_id !== auth.userId) return apiError("Можно закреплять только свои посты", 403)
    const next = post.owner_pinned_at ? null : new Date().toISOString()
    await db.run("UPDATE posts SET owner_pinned_at = ? WHERE id = ?", [next, id])
    return apiResponse({ owner_pinned: Boolean(next) })
  }

  const me = await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId])
  if (me?.role !== "admin") return apiError("Только для администраторов", 403)
  const next = post.feed_pinned_at ? null : new Date().toISOString()
  await db.run("UPDATE posts SET feed_pinned_at = ? WHERE id = ?", [next, id])
  return apiResponse({ feed_pinned: Boolean(next) })
}