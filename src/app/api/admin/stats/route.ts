import { getDb } from "@/db"
import { requireAdmin, apiResponse } from "@/lib/auth"

export async function GET() {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error
  const db = getDb()

  const totalUsers = (await db.get("SELECT COUNT(*) as c FROM users") as any).c
  const totalPosts = (await db.get("SELECT COUNT(*) as c FROM posts WHERE deleted = 0") as any).c
  const totalComments = (await db.get("SELECT COUNT(*) as c FROM comments WHERE deleted = 0") as any).c
  const totalBets = (await db.get("SELECT COUNT(*) as c FROM fantasy_entries") as any).c
  const activeEvents = (await db.get("SELECT COUNT(*) as c FROM fantasy_rounds WHERE status = 'open'") as any).c
  const bannedUsers = (await db.get("SELECT COUNT(*) as c FROM users WHERE banned = 1") as any).c

  const recentUsers = await db.all("SELECT id, username, email, team, karma, role, banned, created_at FROM users ORDER BY created_at DESC LIMIT 10")
  const topKarma = await db.all("SELECT id, username, team, karma, role FROM users WHERE banned = 0 ORDER BY karma DESC LIMIT 5")
  const recentPosts = await db.all(`
    SELECT p.id, p.title, p.created_at, u.username
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.deleted = 0 ORDER BY p.created_at DESC LIMIT 5
  `)

  return apiResponse({
    totalUsers, totalPosts, totalComments, totalBets, activeEvents, bannedUsers,
    recentUsers, topKarma, recentPosts,
  })
}