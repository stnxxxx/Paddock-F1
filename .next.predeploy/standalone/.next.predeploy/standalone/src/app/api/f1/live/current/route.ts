import { getLiveSnapshot } from "@/lib/f1/live"
import { apiError, apiResponse } from "@/lib/auth"

export async function GET() {
  try {
    const snapshot = await getLiveSnapshot()
    return apiResponse(snapshot)
  } catch {
    return apiError("Не удалось собрать live snapshot", 502)
  }
}
