import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const range = request.nextUrl.searchParams.get('range') || '30d'
    const stationId = request.nextUrl.searchParams.get('station_id')

    // Calculate date range
    const now = new Date()
    const daysBack =
      range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Query readings
    let query = supabase
      .from('gauge_readings')
      .select(
        `
        id,
        level_cm,
        change_cm,
        status,
        forecast,
        recorded_at,
        station_id,
        gauge_stations(id, name_ru, river)
      `
      )
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })

    if (stationId) {
      query = query.eq('station_id', stationId)
    }

    const { data: readings, error } = await query

    if (error) {
      console.error('[v0] Analytics query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by date
    const groupedByDate: Record<string, any> = {}
    readings?.forEach((reading: any) => {
      const date = reading.recorded_at.split('T')[0]
      if (!groupedByDate[date]) {
        groupedByDate[date] = {}
      }
      const stationName = reading.gauge_stations?.name_ru || 'Unknown'
      groupedByDate[date][stationName] = reading.level_cm
    })

    // Convert to chart data
    const chartData = Object.entries(groupedByDate).map(([date, levels]) => ({
      date,
      ...levels,
    }))

    // Calculate stats
    const maxLevel = Math.max(...(readings?.map((r: any) => r.level_cm) || [0]))
    const avgLevel =
      readings && readings.length > 0
        ? readings.reduce((sum: number, r: any) => sum + r.level_cm, 0) / readings.length
        : 0

    return NextResponse.json({
      readings: chartData,
      stats: {
        maxLevel: Math.round(maxLevel),
        avgLevel: Math.round(avgLevel),
        count: readings?.length || 0,
      },
    })
  } catch (error) {
    console.error('[v0] Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
