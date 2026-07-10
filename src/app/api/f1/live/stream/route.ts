import { getLiveSnapshot } from "@/lib/f1/live"

export const dynamic = "force-dynamic"

export async function GET() {
  const encoder = new TextEncoder()
  let closed = false
  let interval: ReturnType<typeof setInterval> | undefined
  let heartbeat: ReturnType<typeof setInterval> | undefined

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return
        try {
          const snapshot = await getLiveSnapshot()
          controller.enqueue(encoder.encode(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`))
        } catch {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "Live snapshot unavailable" })}\n\n`))
        }
      }

      await send()
      interval = setInterval(send, 5000)

      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`))
      }, 15000)
    },
    cancel() {
      closed = true
      if (interval) clearInterval(interval)
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
