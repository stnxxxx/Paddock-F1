import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { getCommunityBySlug } from "@/lib/communities"

// Only the owner (or site admin) manages editors.
async function requireOwner(db: ReturnType<typeof getDb>, slug: string, userId: string) {
  const community = await getCommunityBySlug(db, slug)
  if (!community) return { error: apiError("Паблик не найден", 404) }
  const user = await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [userId])
  if (community.created_by !== userId && user?.role !== "admin") {
    return { error: apiError("Только владелец паблика может управлять редакторами", 403) }
  }
  return { community }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const { slug } = await params
  const db = getDb()
  const ctx = await requireOwner(db, slug, auth.userId)
  if (ctx.error) return ctx.error

  const owner = await db.get(`
    SELECT u.id, u.username, u.team, u.driver, u.avatar, 'owner' as public_role
    FROM communities c JOIN users u ON u.id = c.created_by WHERE c.id = ?
  `, [ctx.community.id])
  const editors = await db.all(`
    SELECT u.id, u.username, u.team, u.driver, u.avatar, m.role as public_role, m.created_at
    FROM community_moderators m JOIN users u ON u.id = m.user_id
    WHERE m.community_id = ? ORDER BY m.created_at DESC
  `, [ctx.community.id])

  return apiResponse({ owner, editors })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug } = await params
  const db = getDb()
  const ctx = await requireOwner(db, slug, auth.userId)
  if (ctx.error) return ctx.error

  const body = await req.json().catch(() => null) as { username?: string } | null
  const username = body?.username?.trim()
  if (!username) return apiError("Укажите username редактора")

  const target = await db.get("SELECT id, username, team, driver, avatar FROM users WHERE username = ? AND banned = 0", [username]) as {
    id: string; username: string; team: string | null; driver: string | null; avatar: string | null
  } | undefined
  if (!target) return apiError("Пользователь не найден", 404)
  if (target.id === ctx.community.created_by) return apiError("Владелец уже управляет пабликом", 409)

  await db.run("INSERT INTO community_moderators (community_id, user_id, role) VALUES (?, ?, 'editor') ON CONFLICT DO NOTHING", [ctx.community.id, target.id])
  return apiResponse({ editor: { ...target, public_role: "editor" } }, 201)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug } = await params
  const db = getDb()
  const ctx = await requireOwner(db, slug, auth.userId)
  if (ctx.error) return ctx.error

  const body = await req.json().catch(() => null) as { userId?: string } | null
  if (!body?.userId) return apiError("ID пользователя обязателен")

  await db.run("DELETE FROM community_moderators WHERE community_id = ? AND user_id = ?", [ctx.community.id, body.userId])
  return apiResponse({ ok: true })
}