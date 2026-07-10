import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { getCommunityBySlug, getCommunityRole, canModerate } from "@/lib/communities"
import { sanitizeImageUrl } from "@/lib/validation"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const auth = await getAuthUser()
  const db = getDb()

  const base = await db.get(`
    SELECT c.*, u.username as creator_username,
      COALESCE((SELECT COUNT(*) FROM community_subscriptions s WHERE s.community_id = c.id), 0) as subscriber_count,
      COALESCE((SELECT COUNT(*) FROM community_posts cp JOIN posts p ON p.id = cp.post_id AND p.deleted = 0 WHERE cp.community_id = c.id), 0) as post_count
    FROM communities c
    JOIN users u ON u.id = c.created_by
    WHERE c.slug = $1
  `, [slug]) as (Record<string, unknown> & { id: string; created_by: string }) | undefined
  if (!base) return apiError("Паблик не найден", 404)

  const siteRole = auth ? (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role : undefined
  const myRole = await getCommunityRole(db, base.id, base.created_by, auth?.userId, siteRole)
  const isSubscribed = auth
    ? Boolean(await db.get("SELECT 1 FROM community_subscriptions WHERE community_id = ? AND user_id = ?", [base.id, auth.userId]))
    : false

  const editors = await db.all(`
    SELECT u.id, u.username, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      'owner' as public_role
    FROM communities c JOIN users u ON u.id = c.created_by WHERE c.id = ?
    UNION ALL
    SELECT u.id, u.username, u.team, u.driver,
      CASE WHEN u.avatar LIKE '/uploads/%' OR u.avatar LIKE 'http%' THEN u.avatar ELSE NULL END as avatar,
      'editor' as public_role
    FROM community_moderators m JOIN users u ON u.id = m.user_id WHERE m.community_id = ?
    ORDER BY public_role DESC
  `, [base.id, base.id])

  const pendingCount = canModerate(myRole)
    ? (await db.get<{ c: number }>("SELECT COUNT(*) as c FROM community_submissions WHERE community_id = ? AND status = 'pending'", [base.id]))?.c ?? 0
    : 0

  return apiResponse({
    community: { ...base, is_subscribed: isSubscribed ? 1 : 0, my_role: myRole },
    editors,
    pendingCount,
  })
}

// Owner (or site admin) edits the community: avatar, description, icon, color.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const siteRole = (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role
  if (community.created_by !== auth.userId && siteRole !== "admin") {
    return apiError("Только владелец может менять паблик", 403)
  }

  const body = await req.json().catch(() => null) as { avatar?: string | null; description?: string; icon?: string; color?: string } | null
  if (!body) return apiError("Пустой запрос")

  const sets: string[] = []
  const values: unknown[] = []
  if (body.avatar !== undefined) { sets.push("avatar = ?"); values.push(body.avatar ? sanitizeImageUrl(body.avatar) : null) }
  if (body.description !== undefined) { sets.push("description = ?"); values.push(body.description.trim() || null) }
  if (body.icon !== undefined) { sets.push("icon = ?"); values.push(body.icon.trim().slice(0, 2) || "#") }
  if (body.color !== undefined) { sets.push("color = ?"); values.push(body.color || "#e10600") }
  if (sets.length === 0) return apiError("Нечего обновлять")

  values.push(community.id)
  await db.run(`UPDATE communities SET ${sets.join(", ")} WHERE id = ?`, values)

  const updated = await db.get("SELECT * FROM communities WHERE id = ?", [community.id])
  return apiResponse({ community: updated })
}

// Owner (or site admin) deletes the community. Linked rows cascade; wall posts survive
// but are detached from the community (re-attributed to their original author).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const siteRole = (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role
  if (community.created_by !== auth.userId && siteRole !== "admin") {
    return apiError("Только владелец может удалить паблик", 403)
  }

  await db.transaction(async (db) => {
    await db.run("UPDATE posts SET community_author_id = NULL WHERE community_author_id = ?", [community.id])
    await db.run("DELETE FROM communities WHERE id = ?", [community.id])
  })

  return apiResponse({ ok: true })
}