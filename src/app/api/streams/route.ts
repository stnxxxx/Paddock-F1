import { getDb } from "@/db"
import { getAuthUser, apiResponse, apiError } from "@/lib/auth"
import { v4 as uuid } from "uuid"

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

async function requireAdmin() {
  const auth = await getAuthUser()
  if (!auth) return { error: apiError("Не авторизован", 401), auth: null }

  const db = getDb()
  const u = await db.get("SELECT role FROM users WHERE id = ?", [auth.userId]) as any
  if (u?.role !== "admin") return { error: apiError("Только для администраторов", 403), auth: null }
  return { error: null, auth, db }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const includeAll = searchParams.get("all") === "1"
  const db = getDb()

  if (includeAll) {
    const admin = await requireAdmin()
    if (admin.error) return admin.error
    const streams = await admin.db!.all(
      "SELECT id, race_name, url, embed_url, active, created_at FROM streams ORDER BY created_at DESC"
    )
    return apiResponse({ streams })
  }

  const streams = await db.all(
    "SELECT id, race_name, url, embed_url, active, created_at FROM streams WHERE active = 1 ORDER BY created_at DESC"
  )
  return apiResponse({ streams })
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error
  const db = admin.db!
  const auth = admin.auth!

  const { race_name, url, embed_url, active } = await req.json()
  if (!race_name || !url) return apiError("Название гонки и URL обязательны")
  if (!isValidHttpUrl(url)) return apiError("URL должен начинаться с http:// или https://", 400)
  if (embed_url && !isValidHttpUrl(embed_url)) return apiError("Embed URL должен начинаться с http:// или https://", 400)

  const id = uuid()
  await db.run(
    "INSERT INTO streams (id, race_name, url, embed_url, active, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [id, race_name, url, embed_url || null, active ? 1 : 0, auth.userId]
  )

  return apiResponse({ stream: { id, race_name, url, embed_url: embed_url || null, active } }, 201)
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error
  const db = admin.db!

  const { id, active } = await req.json()
  if (!id) return apiError("ID обязателен")

  await db.run("UPDATE streams SET active = ? WHERE id = ?", [active ? 1 : 0, id])
  return apiResponse({ ok: true })
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin()
  if (admin.error) return admin.error
  const db = admin.db!

  const { id } = await req.json()
  if (!id) return apiError("ID обязателен")

  await db.run("DELETE FROM streams WHERE id = ?", [id])
  return apiResponse({ ok: true })
}