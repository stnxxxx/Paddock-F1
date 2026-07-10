import { getDb } from "@/db"
import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import { getCommunityBySlug, getCommunityRole, canModerate, publishToWall } from "@/lib/communities"
import { v4 as uuid } from "uuid"

interface SubmissionRow {
  id: string
  community_id: string
  author_id: string
  title: string
  content: string
  image: string | null
  tags: string | null
  as_community: number
  anonymous: number
  status: string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  const { slug, id } = await params
  const db = getDb()
  const community = await getCommunityBySlug(db, slug)
  if (!community) return apiError("Паблик не найден", 404)

  const siteRole = (await db.get<{ role?: string }>("SELECT role FROM users WHERE id = ?", [auth.userId]))?.role
  const role = await getCommunityRole(db, community.id, community.created_by, auth.userId, siteRole)
  if (!canModerate(role)) return apiError("Только редакторы модерируют предложку", 403)

  const body = await req.json().catch(() => null) as { action?: string } | null
  const action = body?.action
  if (action !== "approve" && action !== "reject") return apiError("Действие: approve или reject")

  const submission = await db.get<SubmissionRow>(
    "SELECT * FROM community_submissions WHERE id = ? AND community_id = ? AND status = 'pending'",
    [id, community.id]
  )
  if (!submission) return apiError("Предложка не найдена или уже обработана", 404)

  if (action === "approve") {
    let tags: string[] = []
    try { const parsed = JSON.parse(submission.tags || "[]"); if (Array.isArray(parsed)) tags = parsed.map(String) } catch {}

    const postId = await db.transaction(async (tx) => {
      const pid = await publishToWall(tx, {
        communityId: community.id,
        authorId: submission.author_id,
        title: submission.title,
        content: submission.content,
        image: submission.image,
        tags,
        asCommunity: submission.as_community === 1,
        anonymous: submission.anonymous === 1,
      })
      await tx.run(
        "UPDATE community_submissions SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), post_id = ? WHERE id = ?",
        [auth.userId, pid, submission.id]
      )
      await tx.run(
        "INSERT INTO notifications (id, user_id, type, actor_id, post_id) VALUES (?, ?, 'submission_approved', ?, ?)",
        [uuid(), submission.author_id, auth.userId, pid]
      )
      return pid
    })
    return apiResponse({ ok: true, status: "approved", postId })
  }

  // reject
  await db.transaction(async (tx) => {
    await tx.run(
      "UPDATE community_submissions SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [auth.userId, submission.id]
    )
    await tx.run(
      "INSERT INTO notifications (id, user_id, type, actor_id) VALUES (?, ?, 'submission_rejected', ?)",
      [uuid(), submission.author_id, auth.userId]
    )
  })
  return apiResponse({ ok: true, status: "rejected" })
}