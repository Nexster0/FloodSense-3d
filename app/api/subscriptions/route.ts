import { createClient } from '@/lib/supabase/server'
import { Subscription } from '@/lib/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    const supabase = await createClient()

    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)

    if (email) {
      query = query.eq('email', email)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('[v0] Subscriptions query error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: subscriptions as Subscription[] })
  } catch (error) {
    console.error('[v0] Subscriptions endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      telegram_username,
      telegram_chat_id,
      phone,
      station_ids,
      notify_warning,
      notify_danger,
      notify_critical,
      notify_forecast,
      language,
    } = body

    // Validate at least one contact method
    if (!email && !telegram_username && !phone) {
      return Response.json(
        { error: 'At least one contact method required (email, telegram, or phone)' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        email,
        telegram_username,
        telegram_chat_id,
        phone,
        station_ids: station_ids || [],
        notify_warning: notify_warning !== false,
        notify_danger: notify_danger !== false,
        notify_critical: notify_critical !== false,
        notify_forecast: notify_forecast === true,
        language: language || 'ru',
        is_active: true,
      })
      .select()

    if (error) {
      console.error('[v0] Subscription creation error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: subscription }, { status: 201 })
  } catch (error) {
    console.error('[v0] Subscription creation endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return Response.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error('[v0] Subscription update error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ data: subscription })
  } catch (error) {
    console.error('[v0] Subscription update endpoint error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
