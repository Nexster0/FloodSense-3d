import { createClient } from '@/lib/supabase/server'
import {
  checkKazhydrometAPIHealth,
  fetchKazhydrometData,
  validateKazhydrometData,
  getMockKazhydrometReadings,
  convertToGaugeReading,
} from '@/lib/kazhydromet'

export async function GET() {
  try {
    // Check API health
    const health = await checkKazhydrometAPIHealth()

    // Try to fetch real data
    let readings
    let source: 'kazhydromet' | 'mock' = 'kazhydromet'

    if (health.active) {
      const apiResponse = await fetchKazhydrometData()
      if (apiResponse.success && apiResponse.data?.readings) {
        const validation = validateKazhydrometData(apiResponse.data.readings)
        readings = validation.validReadings
      } else {
        // Fall back to mock data
        readings = getMockKazhydrometReadings()
        source = 'mock'
      }
    } else {
      // API unavailable, use mock data
      readings = getMockKazhydrometReadings()
      source = 'mock'
    }

    // Validate the data
    const validation = validateKazhydrometData(readings)

    return Response.json({
      success: true,
      source,
      apiHealth: health,
      readings: validation.validReadings,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Kazhydromet route error:', error)
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

// POST to sync data to Supabase
export async function POST() {
  try {
    const supabase = await createClient()

    // Check API health
    const health = await checkKazhydrometAPIHealth()

    // Get readings (real or mock)
    let readings
    let source: 'kazhydromet' | 'mock' = 'kazhydromet'

    if (health.active) {
      const apiResponse = await fetchKazhydrometData()
      if (apiResponse.success && apiResponse.data?.readings) {
        const validation = validateKazhydrometData(apiResponse.data.readings)
        readings = validation.validReadings
      } else {
        readings = getMockKazhydrometReadings()
        source = 'mock'
      }
    } else {
      readings = getMockKazhydrometReadings()
      source = 'mock'
    }

    // Get stations from database to get threshold levels
    const { data: stations } = await supabase
      .from('gauge_stations')
      .select('id, danger_level_cm, warning_level_cm')

    const stationThresholds = new Map(
      stations?.map((s) => [s.id, { danger: s.danger_level_cm, warning: s.warning_level_cm }]) || []
    )

    // Convert and insert readings
    const insertedReadings: string[] = []
    const errors: string[] = []

    for (const reading of readings) {
      const thresholds = stationThresholds.get(reading.station_id) || { danger: 400, warning: 300 }
      const gaugeReading = convertToGaugeReading(reading, thresholds.danger, thresholds.warning)

      const { error } = await supabase.from('gauge_readings').insert(gaugeReading)

      if (error) {
        errors.push(`${reading.station_id}: ${error.message}`)
      } else {
        insertedReadings.push(reading.station_id)
      }
    }

    return Response.json({
      success: errors.length === 0,
      source,
      apiHealth: health,
      inserted: insertedReadings,
      errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[v0] Kazhydromet sync error:', error)
    return Response.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
