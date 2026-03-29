import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAktobeBuildings } from '@/lib/osm-loader'
import { enrichBuildingsWithElevation } from '@/lib/elevation'

export async function POST() {
  const supabase = createClient()

  // 1. Check if buildings already loaded
  const { count } = await supabase
    .from('buildings')
    .select('*', { count: 'exact', head: true })

  if (count && count > 100) {
    return NextResponse.json({
      success: true,
      message: `Здания уже загружены: ${count} объектов`,
      already_loaded: true,
    })
  }

  try {
    // 2. Load from OSM
    const buildings = await fetchAktobeBuildings()

    // 3. Limit to first 500 for demo (full load = 5000+, too slow)
    const sample = buildings.slice(0, 500)

    // 4. Get elevations
    const enriched = await enrichBuildingsWithElevation(sample)

    // 5. Upsert to Supabase in chunks of 50
    let saved = 0
    for (let i = 0; i < enriched.length; i += 50) {
      const chunk = enriched.slice(i, i + 50)
      const { error } = await supabase
        .from('buildings')
        .upsert(chunk, { onConflict: 'id' })
      if (!error) saved += chunk.length
    }

    return NextResponse.json({
      success: true,
      total_from_osm: buildings.length,
      saved_to_db: saved,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
