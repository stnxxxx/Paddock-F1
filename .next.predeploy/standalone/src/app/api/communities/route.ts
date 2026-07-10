import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { slugify } from "@/lib/communities"
import { sanitizeImageUrl } from "@/lib/validation"
import { v4 as uuid } from "uuid"

const CREATE_KARMA = 500

export async function GET() {
  const auth = await getAuthUser()
  const db = getDb()
  const isAdmin = auth
    ? ((await db.get("SELECT role FROM users WHERE id = ?", [auth.userId]) as { role?: string } | undefined)?.role === "admin" ? 1 : 0)
    : 0

  const communities = await db.all(`
    SELECT c.*, u.username as creator_username,
      COALESCE(pc.cnt, 0) as post_count,
      COALESCE(sc.cnt, 0) as subscriber_count
      ${auth ? ", CASE WHEN mysub.user_id IS NOT NULL THEN 1 ELSE 0 END as is_subscribed" : ", 0 as is_subscribed"}
      ${auth ? ", CASE WHEN c.created_by = ? OR ? = 1 THEN 'owner' WHEN mymod.user_id IS NOT NULL THEN 'editor' ELSE NULL END as my_role" : ", NULL as my_role"}
    FROM communities c
    JOIN users u ON u.id = c.created_by
    LEFT JOIN (SELECT cp.community_id, COUNT(*) as cnt FROM community_posts cp JOIN posts p ON p.id = cp.post_id AND p.deleted = 0 GROUP BY cp.community_id) pc ON pc.community_id = c.id
    LEFT JOIN (SELECT community_id, COUNT(*) as cnt FROM community_subscriptions GROUP BY community_id) sc ON sc.community_id = c.id
    ${auth ? "LEFT JOIN community_subscriptions mysub ON mysub.community_id = c.id AND mysub.user_id = ?" : ""}
    ${auth ? "LEFT JOIN community_moderators mymod ON mymod.community_id = c.id AND mymod.user_id = ?" : ""}
    ORDER BY subscriber_count DESC, c.created_at DESC
  `, [...auth ? [auth.userId, isAdmin, auth.userId, auth.userId] : []])

  return apiResponse({ communities })
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const db = getDb()
  const user = await db.get("SELECT role, karma FROM users WHERE id = ?", [auth.userId]) as { role?: string; karma?: number } | undefined
  if (user?.role !== "admin" && (user?.karma || 0) < CREATE_KARMA) {
    return apiError(`Нужно ${CREATE_KARMA} кармы для создания паблика`, 403)
  }

  const body = await req.json().catch(() => null) as { name?: string; description?: string; icon?: string; color?: string; avatar?: string } | null
  const name = body?.name?.trim()
  if (!name) return apiError("Название обязательно")
  if (name.length > 60) return apiError("Название должно быть короче 60 символов")

  const slug = slugify(name)
  if (!slug) return apiError("Некорректное название")
  if (await db.get("SELECT id FROM communities WHERE slug = ?", [slug])) {
    return apiError("Паблик с таким названием уже существует", 409)
  }

  const avatar = sanitizeImageUrl(body?.avatar)
  const id = uuid()
  await db.transaction(async (db) => {
    await db.run("INSERT INTO communities (id, name, slug, description, icon, color, avatar, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, name, slug, body?.description?.trim() || null, body?.icon?.trim() || "#", body?.color || "#e10600", avatar, auth.userId])
    await db.run("INSERT INTO community_subscriptions (community_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [id, auth.userId])
  })

  return apiResponse({
    community: {
      id, name, slug,
      description: body?.description?.trim() || null,
      icon: body?.icon?.trim() || "#",
      color: body?.color || "#e10600",
      avatar,
      creator_username: auth.username,
      post_count: 0,
      subscriber_count: 1,
      is_subscribed: 1,
      my_role: "owner",
    },
  }, 201)
}