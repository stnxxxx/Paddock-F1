import { fetchDriverResults } from "@/lib/f1-data"
import { getJolpicaDriverId } from "@/lib/drivers"
import { apiResponse, apiError } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const year = new Date().getFullYear()
    const driverId = getJolpicaDriverId(id)
    const data = await fetchDriverResults(driverId, year)
    return apiResponse(data)
  } catch {
    return apiError("Не удалось загрузить результаты пилота", 502)
  }
}
