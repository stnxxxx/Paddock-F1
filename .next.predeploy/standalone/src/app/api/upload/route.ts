import { apiBanGuard, apiError, apiResponse, getAuthUser } from "@/lib/auth"
import fs from "fs"
import path from "path"
import { v4 as uuid } from "uuid"

const MAX_SIZE = 4 * 1024 * 1024
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

function sniffImageType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg"
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
  ) return "image/png"
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) return "image/webp"
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii")
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "image/heic"
  }
  return null
}

export async function POST(req: Request) {
  const auth = await getAuthUser()
  if (!auth) return apiError("Не авторизован", 401)
  const banned = await apiBanGuard(auth.userId)
  if (banned) return banned

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return apiError("Файл не найден", 400)
    if (!file.type.startsWith("image/")) return apiError("Файл не является изображением", 400)
    if (file.size > MAX_SIZE) return apiError("Максимальный размер после сжатия — 2MB", 400)

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = sniffImageType(buffer)
    if (!detectedType) return apiError("Файл не похож на корректное изображение", 400)

    const ext = EXT_BY_TYPE[detectedType] || (detectedType === "image/heic" ? "heic" : "bin")
    const filename = `${uuid()}.${ext}`
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(path.join(uploadDir, filename), buffer)

    return apiResponse({ url: `/uploads/${filename}`, size: buffer.length, type: detectedType }, 201)
  } catch (err) {
    console.error("[upload]", err)
    return apiError("Ошибка загрузки", 500)
  }
}
