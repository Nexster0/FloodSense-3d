import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const north = parseFloat(searchParams.get('north') || '50.38')
  const south = parseFloat(searchParams.get('south') || '50.18')
  const east = parseFloat(searchParams.get('east') || '57.32')
  const west = parseFloat(searchParams.get('west') || '57.05')

  try {
    // Fetch buildings within bounds
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .gte('lat', south)
      .lte('lat', north)
      .gte('lng', west)
      .lte('lng', east)
      .limit(1000)

    if (error) throw error

    // Convert to GeoJSON FeatureCollection
    const features = (data || []).map((building: any) => ({
      type: 'Feature',
      id: building.id,
      geometry: {
        type: 'Point',
        coordinates: [building.lng, building.lat],
      },
      properties: {
        id: building.id,
        name_ru: building.name_ru,
        address: building.address,
        district: building.district,
        floors: building.floors,
        building_type: building.building_type,
        height_m: building.height_m,
        foundation_elevation_m: building.foundation_elevation_m,
      },
    }))

    return NextResponse.json({
      type: 'FeatureCollection',
      features,
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
