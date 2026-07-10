import { fetchConstructorResults } from "@/lib/f1-data"
import { apiResponse, apiError } from "@/lib/auth"

const TEAM_ID_MAP: Record<string, string> = {
  "Red Bull": "red_bull", "Ferrari": "ferrari", "McLaren": "mclaren", "Mercedes": "mercedes",
  "Aston Martin": "aston_martin", "Alpine": "alpine", "Williams": "williams",
  "Racing Bulls": "rb", "Haas": "haas", "Audi": "audi", "Cadillac": "cadillac",
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const year = new Date().getFullYear()
    const constructorId = TEAM_ID_MAP[id] || id.toLowerCase()
    const data = await fetchConstructorResults(constructorId, year)
    return apiResponse(data)
  } catch {
    return apiError("Не удалось загрузить результаты команды", 502)
  }
}
