import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { format } from 'date-fns'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: readings, error } = await supabase
      .from('gauge_readings')
      .select(
        `
        id,
        level_cm,
        change_cm,
        flow_rate_m3s,
        status,
        forecast,
        recorded_at,
        gauge_stations(id, name_ru, river)
      `
      )
      .order('recorded_at', { ascending: false })

    if (error) {
      throw error
    }

    // Convert to CSV format
    const headers = [
      'ID',
      'Станция',
      'Река',
      'Уровень (см)',
      'Изменение (см)',
      'Расход (м³/с)',
      'Статус',
      'Прогноз',
      'Дата записи',
    ]

    const rows = readings.map((r: any) => [
      r.id,
      r.gauge_stations?.name_ru || '',
      r.gauge_stations?.river || '',
      r.level_cm,
      r.change_cm,
      r.flow_rate_m3s || '',
      r.status,
      r.forecast,
      format(new Date(r.recorded_at), 'yyyy-MM-dd HH:mm:ss'),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row: string[]) =>
        row.map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell)).join(',')
      ),
    ].join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gauge_readings_${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    })
  } catch (error) {
    console.error('[v0] CSV export error:', error)
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 })
  }
}
