import {
  NEWSBOT_API_PREFIX,
  newsbotError,
  newsbotJson,
  parseNewsbotJson,
  requireNewsbotIdempotencyKey,
  verifyNewsbotRequest,
} from "@/lib/newsbot-internal"
import {
  parseNewsbotPost,
  publishNewsbotPost,
} from "@/lib/newsbot-publish"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SIGNED_PATH = NEWSBOT_API_PREFIX + "/posts"
const MAX_POST_BYTES = 64 * 1024

export async function POST(req: Request) {
  try {
    const signed = await verifyNewsbotRequest(req, SIGNED_PATH, { maxBytes: MAX_POST_BYTES })
    const input = parseNewsbotPost(parseNewsbotJson(signed))
    const response = await publishNewsbotPost(input, {
      mode: "create",
      payloadHash: signed.bodyHash,
      idempotencyKey: requireNewsbotIdempotencyKey(signed),
    })
    return newsbotJson(response, response.alreadyExisted ? 200 : 201)
  } catch (error) {
    return newsbotError(error)
  }
}
