function supportedBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => {
      if (b) { resolve(b); return }
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    }, "image/webp", quality)
  })
}

export async function compressImageForUpload(file: File, options?: { maxSide?: number; quality?: number }) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file

  try {
    const bitmap = await createImageBitmap(file)
    const maxSide = options?.maxSide ?? 1600
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await supportedBlob(canvas, options?.quality ?? 0.82)
    if (!blob) return file
    const isJpeg = blob.type === "image/jpeg"
    const ext = isJpeg ? "jpg" : "webp"
    const name = file.name.replace(/\.[^.]+$/, "") || "image"
    return new File([blob], `${name}.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}
