import { createClient } from '@/lib/supabase/server'
import { MLForecast } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stationId = searchParams.get('station_id')
    const horizon = searchParams.get('horizon') // 3, 7, or 14

    const supabase = await createClient()

    let query = supabase
      .from('ml_forecasts')
      .select('*')
      .order('forecast_date', { ascending: false })

    if (stationId) {
      query = query.eq('station_id', stationId)
    }

    if (horizon) {
      query = query.eq('horizon_days', parseInt(horizon))
    }

    const { data: forecasts, error } = await query

    if (error) {
      console.error('[v0] Forecasts query error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: forecasts as MLForecast[] })
  } catch (error) {
    console.error('[v0] Forecasts endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      station_id,
      forecast_date,
      horizon_days,
      predicted_level_cm,
      confidence_lower_cm,
      confidence_upper_cm,
      probability_danger,
      probability_warning,
      model_version,
      input_features,
    } = body

    const supabase = await createClient()

    const { data: forecast, error } = await supabase
      .from('ml_forecasts')
      .insert({
        station_id,
        forecast_date,
        horizon_days,
        predicted_level_cm,
        confidence_lower_cm,
        confidence_upper_cm,
        probability_danger,
        probability_warning,
        model_version: model_version || 'v1.0',
        input_features,
      })
      .select()

    if (error) {
      console.error('[v0] Forecast creation error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: forecast }, { status: 201 })
  } catch (error) {
    console.error('[v0] Forecast creation endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
