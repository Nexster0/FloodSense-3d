import { createClient } from '@/lib/supabase/server'
import { GaugeReading } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('station_id')
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = await createClient()

    let query = supabase
      .from('gauge_readings')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(limit)

    if (stationId) {
      query = query.eq('station_id', stationId)
    }

    // Optional: Filter by days if provided
    if (days > 0) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      query = query.gte('recorded_at', startDate.toISOString())
    }

    const { data: readings, error } = await query

    if (error) {
      console.error('[v0] Readings query error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: readings as GaugeReading[] })
  } catch (error) {
    console.error('[v0] Readings endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
