import { getDb } from "@/db"
import { getAuthUser, apiError, apiResponse } from "@/lib/auth"

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await getAuthUser()
  const db = getDb()

  const postSql = auth
    ? `SELECT p.*,
      CASE WHEN ah.id IS NOT NULL THEN ah.name ELSE u.username END as username,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.display_name END as display_name,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.team END as team,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.driver END as driver,
      CASE WHEN ah.id IS NOT NULL THEN NULL WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      CASE WHEN ah.id IS NOT NULL THEN 'public' ELSE 'user' END as author_type,
      ah.slug as public_slug,
      ah.icon as public_icon,
      ah.color as public_color,
      ah.avatar as public_avatar,
      CASE WHEN p.anonymous = 1 THEN NULL ELSE u.username END as operator_username,
      (SELECT STRING_AGG(pt.tag, '||' ORDER BY pt.position) FROM post_tags pt WHERE pt.post_id = p.id) as tags_raw,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count,
      uv.direction as user_vote, CASE WHEN bm.user_id IS NOT NULL THEN 1 ELSE 0 END as bookmarked
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN communities ah ON ah.id = p.community_author_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    LEFT JOIN votes uv ON uv.post_id = p.id AND uv.user_id = ?
    LEFT JOIN bookmarks bm ON bm.post_id = p.id AND bm.user_id = ?
    WHERE p.id = ? AND p.deleted = 0`
    : `SELECT p.*,
      CASE WHEN ah.id IS NOT NULL THEN ah.name ELSE u.username END as username,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.display_name END as display_name,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.team END as team,
      CASE WHEN ah.id IS NOT NULL THEN NULL ELSE u.driver END as driver,
      CASE WHEN ah.id IS NOT NULL THEN NULL WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      CASE WHEN ah.id IS NOT NULL THEN 'public' ELSE 'user' END as author_type,
      ah.slug as public_slug,
      ah.icon as public_icon,
      ah.color as public_color,
      ah.avatar as public_avatar,
      CASE WHEN p.anonymous = 1 THEN NULL ELSE u.username END as operator_username,
      (SELECT STRING_AGG(pt.tag, '||' ORDER BY pt.position) FROM post_tags pt WHERE pt.post_id = p.id) as tags_raw,
      COALESCE(vu.upvotes, 0) as upvotes,
      COALESCE(vd.downvotes, 0) as downvotes,
      COALESCE(cc.cnt, 0) as comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN communities ah ON ah.id = p.community_author_id
    LEFT JOIN (SELECT post_id, COUNT(*) as upvotes FROM votes WHERE direction = 1 GROUP BY post_id) vu ON vu.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as downvotes FROM votes WHERE direction = -1 GROUP BY post_id) vd ON vd.post_id = p.id
    LEFT JOIN (SELECT post_id, COUNT(*) as cnt FROM comments WHERE deleted = 0 GROUP BY post_id) cc ON cc.post_id = p.id
    WHERE p.id = ? AND p.deleted = 0`

  const postParams: unknown[] = auth ? [auth.userId, auth.userId, id] : [id]
  const post = await db.get<any>(postSql, postParams)

  if (!post) return apiError("Пост не найден", 404)

  const commentsSql = auth
    ? `SELECT c.*, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      COALESCE(cvu.upvotes, 0) as upvotes,
      COALESCE(cvd.downvotes, 0) as downvotes,
      cv.direction as user_vote
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN (SELECT comment_id, COUNT(*) as upvotes FROM comment_votes WHERE direction = 1 GROUP BY comment_id) cvu ON cvu.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as downvotes FROM comment_votes WHERE direction = -1 GROUP BY comment_id) cvd ON cvd.comment_id = c.id
    LEFT JOIN comment_votes cv ON cv.comment_id = c.id AND cv.user_id = ?
    WHERE c.post_id = ? AND c.deleted = 0 AND u.banned = 0
    ORDER BY c.created_at ASC`
    : `SELECT c.*, u.username, u.display_name, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      COALESCE(cvu.upvotes, 0) as upvotes,
      COALESCE(cvd.downvotes, 0) as downvotes
    FROM comments c
    JOIN users u ON u.id = c.user_id
    LEFT JOIN (SELECT comment_id, COUNT(*) as upvotes FROM comment_votes WHERE direction = 1 GROUP BY comment_id) cvu ON cvu.comment_id = c.id
    LEFT JOIN (SELECT comment_id, COUNT(*) as downvotes FROM comment_votes WHERE direction = -1 GROUP BY comment_id) cvd ON cvd.comment_id = c.id
    WHERE c.post_id = ? AND c.deleted = 0 AND u.banned = 0
    ORDER BY c.created_at ASC`

  const commentsParams: unknown[] = auth ? [auth.userId, id] : [id]
  const comments = await db.all(commentsSql, commentsParams)

  return apiResponse({ post: inflateTags(post), comments })
}