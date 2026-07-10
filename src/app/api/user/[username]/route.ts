import { getDb } from "@/db"
import { apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { getAchievementProgress } from "@/lib/achievements"

function inflateTags<T extends { tag?: string | null; tags_raw?: string | null }>(post: T) {
  const tags = post.tags_raw
    ? post.tags_raw.split("||").filter(Boolean)
    : post.tag
      ? [post.tag]
      : []
  const rest = { ...post }
  delete rest.tags_raw
  return { ...rest, tags }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const auth = await getAuthUser()
  const db = getDb()

  const user = await db.get(
    "SELECT id, username, display_name, team, driver, avatar, cover, bio, karma, created_at, hide_team, hide_driver FROM users WHERE username = ? AND banned = 0",
    [username]
  ) as any

  if (!user) return apiError("Пользователь не найден", 404)

  const flairs = await db.all(`
    SELECT f.id, f.name, f.icon, f.color
    FROM flairs f
    JOIN user_flairs uf ON uf.flair_id = f.id
    WHERE uf.user_id = ?
  `, [user.id]) as any[]

  const achievements = await getAchievementProgress(db, user.id)

  const stats = await db.get(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ? AND deleted = 0) as post_count,
      (SELECT COUNT(*) FROM comments WHERE user_id = ? AND deleted = 0) as comment_count,
      (SELECT COUNT(*) FROM votes v JOIN posts p ON p.id = v.post_id WHERE p.user_id = ? AND p.deleted = 0 AND v.direction = 1) as post_upvotes_received,
      (SELECT COUNT(*) FROM votes v JOIN posts p ON p.id = v.post_id WHERE p.user_id = ? AND p.deleted = 0 AND v.direction = -1) as post_downvotes_received,
      (
        (SELECT COALESCE(SUM(upvotes), 0) FROM comments WHERE user_id = ? AND deleted = 0) +
        (SELECT COUNT(*) FROM comment_votes cv JOIN comments c ON c.id = cv.comment_id WHERE c.user_id = ? AND c.deleted = 0 AND cv.direction = 1)
      ) as comment_upvotes_received,
      (SELECT COUNT(*) FROM comment_votes cv JOIN comments c ON c.id = cv.comment_id WHERE c.user_id = ? AND c.deleted = 0 AND cv.direction = -1) as comment_downvotes_received,
      (SELECT COALESCE(SUM(points), 0) FROM fantasy_entries WHERE user_id = ?) as fantasy_points,
      (SELECT COUNT(*) FROM fantasy_entries WHERE user_id = ?) as fantasy_bets,
      (SELECT COUNT(*) FROM fantasy_entries WHERE user_id = ? AND points > 0) as fantasy_hits,
      (SELECT COUNT(*) FROM follows WHERE followed_id = ?) as followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = ?) as is_following,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = ?) as is_followed_by
  `, [
    user.id, user.id, user.id, user.id, user.id, user.id, user.id,
    user.id, user.id, user.id, user.id, user.id,
    auth?.userId || "", user.id, user.id, auth?.userId || "",
  ]) as any

  const normalizedStats = {
    ...stats,
    upvotes_received: (stats.post_upvotes_received || 0) + (stats.comment_upvotes_received || 0),
    downvotes_received: (stats.post_downvotes_received || 0) + (stats.comment_downvotes_received || 0),
  }

  const posts = (await db.all(`
    SELECT p.*, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      (SELECT STRING_AGG(pt.tag, '||' ORDER BY pt.position) FROM post_tags pt WHERE pt.post_id = p.id) as tags_raw,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE p.user_id = ? AND p.deleted = 0 AND (p.anonymous = 0 OR ? = 1)
    ORDER BY (p.owner_pinned_at IS NOT NULL) DESC, p.owner_pinned_at DESC, p.created_at DESC
    LIMIT 50
  `, [user.id, auth?.userId === user.id ? 1 : 0])).map((post: any) => inflateTags(post))

  const isOwner = auth?.userId === user.id
  const isMuted = auth
    ? Boolean(await db.get("SELECT 1 FROM feed_signals WHERE user_id = ? AND type = 'mute_author' AND value = ?", [auth.userId, user.id]))
    : false
  const { hide_team, hide_driver, ...publicUser } = user
  // Respect privacy: hide team/driver from everyone except the profile owner.
  if (!isOwner && hide_team) publicUser.team = null
  if (!isOwner && hide_driver) publicUser.driver = null

  return apiResponse({
    profile: {
      ...publicUser,
      flairs: flairs || [],
      achievements: achievements || [],
      ...normalizedStats,
      is_muted: isMuted ? 1 : 0,
    },
    posts,
  })
}