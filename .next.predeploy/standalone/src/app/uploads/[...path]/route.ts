import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params
  if (!segments || segments.length === 0) return new NextResponse("Not Found", { status: 404 })
  const filename = segments.join("/")
  const safe = filename.replace(/\.\.\//g, "").replace(/\.\.\\\\/g, "")
  const base = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads")
  const filePath = path.join(base, safe)
  if (!fs.existsSync(filePath)) return new NextResponse("Not Found", { status: 404 })
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mime: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif" }
  return new NextResponse(buffer, { headers: { "Content-Type": mime[ext] || "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } })
}
