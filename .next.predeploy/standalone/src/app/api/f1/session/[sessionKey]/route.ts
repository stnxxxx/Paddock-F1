import { getDrivers, getSession } from "@/lib/f1/openf1"
import { apiError, apiResponse } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ sessionKey: string }> }) {
  const { sessionKey } = await params
  const key = sessionKey === "latest" ? "latest" : Number(sessionKey)

  if (key !== "latest" && !Number.isFinite(key)) {
    return apiError("Некорректный sessionKey", 400)
  }

  try {
    const session = await getSession(key)
    const drivers = session ? await getDrivers(session.session_key).catch(() => []) : []
    return apiResponse({ session, drivers })
  } catch {
    return apiError("Не удалось загрузить сессию OpenF1", 502)
  }
}
