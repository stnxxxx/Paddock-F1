import { getDb } from "@/db"
import {
  NEWSBOT_API_PREFIX,
  NewsbotRequestError,
  newsbotError,
  newsbotJson,
  parseNewsbotJson,
  requireNewsbotIdempotencyKey,
  verifyNewsbotRequest,
} from "@/lib/newsbot-internal"
import { createHash, randomUUID } from "crypto"
import { access, mkdir, rename, unlink, writeFile } from "fs/promises"
import path from "path"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SIGNED_PATH = NEWSBOT_API_PREFIX + "/media"
const MAX_CARD_BYTES = 4 * 1024 * 1024
const MAX_REQUEST_BYTES = 6 * 1024 * 1024
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

const MEDIA_SCHEMA = z.object({
  contentType: z.enum(["image/png", "image/webp"]),
  data: z.string().min(4).max(Math.ceil(MAX_CARD_BYTES * 4 / 3) + 8),
}).strict()

function sniffImage(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" }
  }
  return null
}

async function ensureCardFile(destination: string, buffer: Buffer) {
  try {
    await access(destination)
    return
  } catch {
    // The only possible destination is a content-hash filename generated below.
  }

  const directory = path.dirname(destination)
  await mkdir(directory, { recursive: true })
  const temporary = path.join(directory, "." + path.basename(destination) + "." + randomUUID() + ".tmp")
  await writeFile(temporary, buffer, { flag: "wx" })
  try {
    // POSIX rename is atomic. Concurrent writers have the same content hash and bytes.
    await rename(temporary, destination)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const signed = await verifyNewsbotRequest(req, SIGNED_PATH, { maxBytes: MAX_REQUEST_BYTES })
    requireNewsbotIdempotencyKey(signed)

    const parsed = MEDIA_SCHEMA.safeParse(parseNewsbotJson(signed))
    if (!parsed.success) {
      throw new NewsbotRequestError(422, "Invalid NewsBot media payload")
    }
    if (parsed.data.data.length % 4 !== 0 || !BASE64_RE.test(parsed.data.data)) {
      throw new NewsbotRequestError(422, "NewsBot media data is not valid base64")
    }

    const buffer = Buffer.from(parsed.data.data, "base64")
    if (!buffer.length || buffer.length > MAX_CARD_BYTES) {
      throw new NewsbotRequestError(413, "NewsBot card is too large")
    }

    const detected = sniffImage(buffer)
    if (!detected || detected.contentType !== parsed.data.contentType) {
      throw new NewsbotRequestError(422, "NewsBot card content type does not match image data")
    }

    const sha256 = createHash("sha256").update(buffer).digest("hex")
    const filename = "newsbot-card-" + sha256 + "." + detected.extension
    const url = "/uploads/" + filename
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
    const destination = path.join(uploadDir, filename)
    const db = getDb()
    const existing = await db.get<{ path: string }>("SELECT path FROM newsbot_media WHERE sha256 = ?", [sha256])

    if (!existing) {
      await ensureCardFile(destination, buffer)
      await db.run(
        "INSERT INTO newsbot_media (sha256, path, content_type, byte_length) VALUES (?, ?, ?, ?) ON CONFLICT (sha256) DO NOTHING",
        [sha256, url, detected.contentType, buffer.length]
      )
    }

    return newsbotJson({
      url,
      contentType: detected.contentType,
      size: buffer.length,
      sha256,
      alreadyExisted: Boolean(existing),
    }, existing ? 200 : 201)
  } catch (error) {
    return newsbotError(error)
  }
}
