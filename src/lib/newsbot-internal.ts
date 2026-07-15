import { createHash, createHmac, timingSafeEqual } from "crypto"
import { getDb } from "@/db"

export const NEWSBOT_API_PREFIX = "/api/internal/newsbot/v1"
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60
const NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/
const HEX_RE = /^[a-f0-9]{64}$/i
const IDEMPOTENCY_RE = /^[A-Za-z0-9:._-]{8,200}$/

export class NewsbotRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message)
    this.name = "NewsbotRequestError"
  }
}

export type VerifiedNewsbotRequest = {
  body: Buffer
  bodyHash: string
  idempotencyKey: string | null
}

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
}

export function newsbotJson<T>(data: T, status = 200) {
  return Response.json(data, { status, headers: responseHeaders })
}

export function newsbotError(error: unknown) {
  if (error instanceof NewsbotRequestError) {
    return newsbotJson({ error: error.message }, error.status)
  }
  return newsbotJson({ error: "Internal NewsBot API error" }, 500)
}

export function parseNewsbotJson<T = unknown>(request: VerifiedNewsbotRequest): T {
  try {
    return JSON.parse(request.body.toString("utf8")) as T
  } catch {
    throw new NewsbotRequestError(400, "Request body must be valid JSON")
  }
}

export function requireNewsbotIdempotencyKey(request: VerifiedNewsbotRequest): string {
  if (!request.idempotencyKey || !IDEMPOTENCY_RE.test(request.idempotencyKey)) {
    throw new NewsbotRequestError(400, "A valid Idempotency-Key header is required")
  }
  return request.idempotencyKey
}

function getNewsbotConfig() {
  if (process.env.NEWSBOT_API_ENABLED !== "1") {
    throw new NewsbotRequestError(404, "Not found")
  }

  const keyId = process.env.NEWSBOT_HMAC_KEY_ID
  const secret = process.env.NEWSBOT_HMAC_SECRET
  if (!keyId || !secret || secret.length < 32) {
    throw new NewsbotRequestError(503, "NewsBot API is not configured")
  }
  return { keyId, secret }
}

function safeEqualHex(expected: string, received: string) {
  if (!HEX_RE.test(received)) return false
  const expectedBuffer = Buffer.from(expected, "hex")
  const receivedBuffer = Buffer.from(received, "hex")
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer)
}

export async function verifyNewsbotRequest(
  req: Request,
  signedPath: string,
  options: { maxBytes?: number } = {}
): Promise<VerifiedNewsbotRequest> {
  if (!signedPath.startsWith(NEWSBOT_API_PREFIX + "/")) {
    throw new NewsbotRequestError(500, "Invalid internal route configuration")
  }

  const { keyId: expectedKeyId, secret } = getNewsbotConfig()
  const keyId = req.headers.get("X-NewsBot-Key-Id")
  const timestampText = req.headers.get("X-NewsBot-Timestamp")
  const nonce = req.headers.get("X-NewsBot-Nonce")
  const signature = req.headers.get("X-NewsBot-Signature")
  const maxBytes = options.maxBytes ?? 1024 * 1024
  const contentLength = req.headers.get("content-length")

  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    throw new NewsbotRequestError(413, "Request body is too large")
  }
  if (keyId !== expectedKeyId || !timestampText || !nonce || !signature) {
    throw new NewsbotRequestError(401, "Missing or invalid NewsBot signature headers")
  }
  if (!NONCE_RE.test(nonce) || !/^\d{1,13}$/.test(timestampText)) {
    throw new NewsbotRequestError(401, "Invalid NewsBot signature headers")
  }

  const timestamp = Number(timestampText)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
    throw new NewsbotRequestError(401, "Expired NewsBot request")
  }

  const body = Buffer.from(await req.arrayBuffer())
  if (body.length > maxBytes) {
    throw new NewsbotRequestError(413, "Request body is too large")
  }

  const bodyHash = createHash("sha256").update(body).digest("hex")
  const canonical = [req.method.toUpperCase(), signedPath, timestampText, nonce, bodyHash].join("\n")
  const expectedSignature = createHmac("sha256", secret).update(canonical, "utf8").digest("hex")
  if (!safeEqualHex(expectedSignature, signature)) {
    throw new NewsbotRequestError(401, "Invalid NewsBot signature")
  }

  const db = getDb()
  await db.run("DELETE FROM newsbot_request_nonces WHERE expires_at < NOW()")
  const inserted = await db.run(
    "INSERT INTO newsbot_request_nonces (nonce, key_id, body_sha256, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL '10 minutes') ON CONFLICT (nonce) DO NOTHING",
    [nonce, keyId, bodyHash]
  )
  if (inserted.rowCount !== 1) {
    throw new NewsbotRequestError(409, "NewsBot request replay rejected")
  }

  return {
    body,
    bodyHash,
    idempotencyKey: req.headers.get("Idempotency-Key"),
  }
}
