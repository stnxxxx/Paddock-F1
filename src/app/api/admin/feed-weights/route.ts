import { getDb } from "@/db"
import { requireAdmin, apiResponse } from "@/lib/auth"
import { loadFeedWeights, saveFeedWeights } from "@/lib/feed/weights"

export async function GET() {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error
  return apiResponse({ weights: await loadFeedWeights(getDb()) })
}

export async function POST(req: Request) {
  const gate = await requireAdmin()
  if ("error" in gate) return gate.error
  const body = await req.json().catch(() => ({}))
  const incoming = (body && typeof body.weights === "object" && body.weights) || body
  const weights = await saveFeedWeights(getDb(), incoming as Record<string, unknown>)
  return apiResponse({ weights })
}
