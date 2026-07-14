import { getDb } from "@/db"
import {
  NEWSBOT_API_PREFIX,
  newsbotError,
  newsbotJson,
  verifyNewsbotRequest,
} from "@/lib/newsbot-internal"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SIGNED_PATH = NEWSBOT_API_PREFIX + "/health"

export async function GET(req: Request) {
  try {
    await verifyNewsbotRequest(req, SIGNED_PATH, { maxBytes: 0 })
    await getDb().get("SELECT 1 AS ok")
    return newsbotJson({
      ok: true,
      service: "paddock-newsbot",
      now: new Date().toISOString(),
    })
  } catch (error) {
    return newsbotError(error)
  }
}
