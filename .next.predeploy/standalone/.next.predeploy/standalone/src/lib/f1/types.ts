export type F1SourceName = "jolpica" | "openf1"

export interface SourceHealth {
  source: F1SourceName
  ok: boolean
  latencyMs?: number
  message?: string
  checkedAt: string
}

export interface F1Race {
  season: number
  round: number
  name: string
  circuit: string
  locality?: string
  country: string
  date: string
  time?: string
}

export interface F1StandingDriver {
  pos: number
  driverCode: string
  driverId?: string
  driverName: string
  team: string
  constructorId?: string
  color: string
  pts: number
  wins: number
}

export interface F1StandingConstructor {
  pos: number
  constructorId?: string
  team: string
  color: string
  pts: number
  wins: number
}

export interface F1RaceResult {
  position: string
  grid?: string
  driverId?: string
  driverCode: string
  driverName: string
  constructorName: string
  constructorId?: string
  laps?: string
  status?: string
  time?: string
  points?: string
  fastestLap?: { rank: string; time: string } | null
}

export interface F1PitStop {
  driverId: string
  lap: number
  stop: number
  duration: string
  durationSec: number
}

export interface F1QualifyingResult {
  position: string
  driverCode: string
  driverName: string
  constructorName: string
  q1?: string
  q2?: string
  q3?: string
}

export interface OpenF1Session {
  session_key: number
  meeting_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  gmt_offset?: string
  location?: string
  country_name?: string
  circuit_short_name?: string
  year?: number
}

export interface OpenF1Driver {
  driver_number: number
  broadcast_name?: string
  full_name?: string
  name_acronym?: string
  team_name?: string
  team_colour?: string
  headshot_url?: string
  country_code?: string
  session_key?: number
  meeting_key?: number
}

export interface LiveDriverSnapshot {
  driverNumber: number
  code: string
  name: string
  team?: string
  teamColor?: string
  position?: number
  interval?: number | string | null
  gapToLeader?: number | string | null
  lastLap?: number | null
  bestLap?: number | null
  lapNumber?: number
  sectors?: Array<number | null>
  tyre?: string
  stintLapStart?: number
  telemetry?: {
    speed?: number
    throttle?: number
    brake?: number
    gear?: number
    rpm?: number
    drs?: number
    sampledAt?: string
  }
}

export interface LiveEvent {
  type: "race_control" | "pit" | "weather" | "radio" | "source"
  title: string
  message?: string
  driverNumber?: number
  lapNumber?: number
  time?: string
  severity?: "info" | "warning" | "danger"
}

export interface LiveSnapshot {
  mode: "countdown" | "pre-session" | "live" | "post-session" | "delayed"
  generatedAt: string
  session: {
    meetingKey?: number
    sessionKey?: number
    name?: string
    type?: string
    status: string
    startsAt?: string
    endsAt?: string
    location?: string
    country?: string
    circuit?: string
  }
  sources: SourceHealth[]
  drivers: LiveDriverSnapshot[]
  events: LiveEvent[]
  weather?: {
    airTemp?: number
    trackTemp?: number
    humidity?: number
    rainfall?: number
    windSpeed?: number
    sampledAt?: string
  }
  fallback?: {
    nextRace?: F1Race | null
    lastRaceName?: string
    message: string
  }
}
