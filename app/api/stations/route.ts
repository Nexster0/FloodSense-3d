import { createClient } from '@/lib/supabase/server'
import { GaugeStation } from '@/lib/types'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: stations, error } = await supabase
      .from('gauge_stations')
      .select('*')
      .eq('is_active', true)
      .order('name_ru', { ascending: true })

    if (error) {
      console.error('[v0] Stations query error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: stations as GaugeStation[] })
  } catch (error) {
    console.error('[v0] Stations endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
