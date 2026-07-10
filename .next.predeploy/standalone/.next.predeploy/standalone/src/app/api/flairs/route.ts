import { getDb } from "@/db"
import { apiResponse } from "@/lib/auth"

export async function GET() {
  const db = getDb()
  const flairs = await db.all("SELECT id, name, icon, color FROM flairs ORDER BY name")
  return apiResponse({ flairs })
}