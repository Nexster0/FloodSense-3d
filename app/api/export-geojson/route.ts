import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: buildings, error } = await supabase
      .from('buildings')
      .select('*')
      .limit(1000)

    if (error) {
      throw error
    }

    // Convert to GeoJSON
    const features = buildings.map((building: any) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: building.footprint || [],
      },
      properties: {
        id: building.id,
        osm_id: building.osm_id,
        name: building.name_ru,
        address: building.address,
        district: building.district,
        floors: building.floors,
        type: building.building_type,
        height_m: building.height_m,
        foundation_elevation_m: building.foundation_elevation_m,
      },
    }))

    const geojson = {
      type: 'FeatureCollection',
      features,
    }

    return new Response(JSON.stringify(geojson, null, 2), {
      headers: {
        'Content-Type': 'application/geo+json; charset=utf-8',
        'Content-Disposition': `attachment; filename="buildings_flood_${new Date().toISOString().split('T')[0]}.geojson"`,
      },
    })
  } catch (error) {
    console.error('[v0] GeoJSON export error:', error)
    return NextResponse.json({ error: 'Failed to export GeoJSON' }, { status: 500 })
  }
}
