import {
  NEWSBOT_API_PREFIX,
  NewsbotRequestError,
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

const MAX_POST_BYTES = 64 * 1024

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ externalId: string[] }> }
) {
  try {
    const { externalId: segments } = await params
    const externalId = segments.join("/")
    // The raw URL keeps percent-encoded path separators exactly as the local
    // client included them in its HMAC canonical string.
    const signedPath = new URL(req.url).pathname
    const signed = await verifyNewsbotRequest(req, signedPath, { maxBytes: MAX_POST_BYTES })
    const input = parseNewsbotPost(parseNewsbotJson(signed))

    if (input.externalId !== externalId) {
      throw new NewsbotRequestError(400, "URL externalId does not match request body")
    }

    const response = await publishNewsbotPost(input, {
      mode: "update",
      payloadHash: signed.bodyHash,
      idempotencyKey: requireNewsbotIdempotencyKey(signed),
    })
    return newsbotJson(response)
  } catch (error) {
    return newsbotError(error)
  }
}
