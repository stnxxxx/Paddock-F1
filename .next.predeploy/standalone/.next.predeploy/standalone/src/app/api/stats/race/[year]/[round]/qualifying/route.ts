import { fetchQualifyingResults } from "@/lib/f1-data"
import { apiResponse, apiError } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ year: string; round: string }> }) {
  const { year, round } = await params
  try {
    const data = await fetchQualifyingResults(parseInt(year), parseInt(round))
    return apiResponse(data)
  } catch {
    return apiError("Не удалось загрузить квалификацию", 502)
  }
}
