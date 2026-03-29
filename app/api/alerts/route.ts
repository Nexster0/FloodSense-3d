import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get only active alerts
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(
        `
        id,
        severity,
        level_cm,
        message_ru,
        created_at,
        station_id,
        gauge_stations(id, name_ru, river)
      `
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Alerts query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      alerts: alerts || [],
      count: alerts?.length || 0,
    })
  } catch (error) {
    console.error('[v0] Alerts GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { station_id, severity, level_cm, message_ru } = body

    if (!station_id || !severity || !level_cm || !message_ru) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        station_id,
        severity,
        level_cm,
        message_ru,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Alert creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('[v0] Alerts POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, resolved } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing alert id' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: alert, error } = await supabase
      .from('alerts')
      .update({
        is_active: !resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[v0] Alert update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(alert)
  } catch (error) {
    console.error('[v0] Alerts PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}
