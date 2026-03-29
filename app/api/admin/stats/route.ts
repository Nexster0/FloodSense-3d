import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()

  try {
    // Fetch all table counts
    const [
      { count: buildingsCount },
      { count: readingsCount },
      { count: bulletinsCount },
      { count: alertsCount },
    ] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('gauge_readings').select('*', { count: 'exact', head: true }),
      supabase.from('bulletin_cache').select('*', { count: 'exact', head: true }),
      supabase.from('alerts').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      buildings: buildingsCount || 0,
      readings: readingsCount || 0,
      bulletins: bulletinsCount || 0,
      alerts: alertsCount || 0,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    )
  }
}
