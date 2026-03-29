import type { GaugeReading, StationStatus, FloodForecast } from './types'

// Kazhydromet API response types
interface KazhydrometStation {
  id: string
  name: string
  river: string
  region: string
  lat: number
  lng: number
}

interface KazhydrometReading {
  station_id: string
  water_level: number // in cm
  water_level_change: number // in cm
  date: string
  time: string
}

interface KazhydrometAPIResponse {
  success: boolean
  data?: {
    stations?: KazhydrometStation[]
    readings?: KazhydrometReading[]
  }
  error?: string
}

// Validate if the API response contains valid float values
export function validateKazhydrometData(readings: KazhydrometReading[]): {
  valid: boolean
  errors: string[]
  validReadings: KazhydrometReading[]
} {
  const errors: string[] = []
  const validReadings: KazhydrometReading[] = []

  for (const reading of readings) {
    const issues: string[] = []

    // Check water_level is a valid number
    if (!Number.isFinite(reading.water_level)) {
      issues.push(`Invalid water_level: ${reading.water_level}`)
    } else if (reading.water_level < 0 || reading.water_level > 2000) {
      issues.push(`Suspicious water_level: ${reading.water_level}cm`)
    }

    // Check water_level_change is a valid number
    if (!Number.isFinite(reading.water_level_change)) {
      issues.push(`Invalid water_level_change: ${reading.water_level_change}`)
    } else if (Math.abs(reading.water_level_change) > 200) {
      issues.push(`Suspicious change: ${reading.water_level_change}cm`)
    }

    if (issues.length === 0) {
      validReadings.push(reading)
    } else {
      errors.push(`Station ${reading.station_id}: ${issues.join(', ')}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validReadings,
  }
}

// Check if the Kazhydromet API is active
export async function checkKazhydrometAPIHealth(): Promise<{
  active: boolean
  latency?: number
  error?: string
}> {
  const startTime = Date.now()

  try {
    // Try the real Kazhydromet API endpoint
    const response = await fetch(
      'https://kazhydromet.kz/api/hydro/monitoring',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    )

    const latency = Date.now() - startTime

    if (response.ok) {
      return { active: true, latency }
    } else {
      return {
        active: false,
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }
  } catch (error) {
    return {
      active: false,
      latency: Date.now() - startTime,
      error: (error as Error).message,
    }
  }
}

// Fetch real-time data from Kazhydromet
export async function fetchKazhydrometData(): Promise<KazhydrometAPIResponse> {
  try {
    // Note: This is the expected API structure. The actual endpoint may differ.
    // Replace with the real Kazhydromet API endpoint when available.
    const response = await fetch(
      'https://kazhydromet.kz/api/hydro/aktobe',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('[v0] Kazhydromet API error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Convert Kazhydromet reading to our internal format
export function convertToGaugeReading(
  reading: KazhydrometReading,
  dangerLevel: number,
  warningLevel: number
): Omit<GaugeReading, 'id'> {
  // Determine status based on water level vs thresholds
  let status: StationStatus = 'NORMAL'
  if (reading.water_level >= dangerLevel * 1.2) {
    status = 'CRITICAL'
  } else if (reading.water_level >= dangerLevel) {
    status = 'DANGER'
  } else if (reading.water_level >= warningLevel) {
    status = 'WARNING'
  } else if (reading.water_level >= warningLevel * 0.85) {
    status = 'WATCH'
  }

  // Determine forecast based on change
  let forecast: FloodForecast = 'stable'
  if (reading.water_level_change > 5) {
    forecast = 'rising'
  } else if (reading.water_level_change < -5) {
    forecast = 'falling'
  }

  return {
    station_id: reading.station_id,
    level_cm: reading.water_level,
    change_cm: reading.water_level_change,
    flow_rate_m3s: null,
    status,
    forecast,
    notes: null,
    bulletin_week: getWeekNumber(new Date()),
    bulletin_year: new Date().getFullYear(),
    recorded_at: `${reading.date}T${reading.time}:00Z`,
  }
}

// Helper to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// Mock data for development (when real API is unavailable)
export function getMockKazhydrometReadings(): KazhydrometReading[] {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().slice(0, 5)

  return [
    { station_id: 'ilek-aktobe', water_level: 421, water_level_change: 18, date: dateStr, time: timeStr },
    { station_id: 'ilek-ilek', water_level: 395, water_level_change: 12, date: dateStr, time: timeStr },
    { station_id: 'khobda-kandyag', water_level: 187, water_level_change: 5, date: dateStr, time: timeStr },
    { station_id: 'uil-uil', water_level: 142, water_level_change: -3, date: dateStr, time: timeStr },
    { station_id: 'aktobe-aktobe', water_level: 234, water_level_change: 22, date: dateStr, time: timeStr },
  ]
}
