'use client'

import { useMemo } from 'react'
import { format, subMonths, startOfYear, endOfYear, eachDayOfInterval, getISOWeek, getYear } from 'date-fns'
import { ru } from 'date-fns/locale'

interface EventCalendarProps {
  data?: Array<{ date: string; maxLevel: number; status: string }>
  isLoading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  NORMAL: '#10b981',
  WATCH: '#eab308',
  WARNING: '#f97316',
  DANGER: '#dc2626',
  CRITICAL: '#7f1d1d',
}

export function EventCalendar({ data = [], isLoading }: EventCalendarProps) {
  // Generate last 12 months of calendar grid
  const { weeks, monthLabels } = useMemo(() => {
    const now = new Date()
    const start = subMonths(now, 12)
    const days = eachDayOfInterval({ start, end: now })

    const weeksMap = new Map<number, typeof days>()
    days.forEach((day) => {
      const week = getISOWeek(day)
      const year = getYear(day)
      const key = `${year}-W${week}`
      if (!weeksMap.has(key as any)) {
        weeksMap.set(key as any, [])
      }
      weeksMap.get(key as any)!.push(day)
    })

    const weeks = Array.from(weeksMap.values())

    // Generate month labels
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i)
      months.push(format(month, 'LLL', { locale: ru }))
    }

    return { weeks, monthLabels: months }
  }, [])

  // Mock data for calendar - in production, fetch from database
  const calendarData = useMemo(() => {
    const mockMap: Record<string, string> = {}
    const now = new Date()

    for (let i = 0; i < 365; i++) {
      const date = subMonths(now, Math.floor(i / 30))
      const key = format(date, 'yyyy-MM-dd')
      const rand = Math.random()

      if (rand > 0.7) {
        mockMap[key] = Object.keys(STATUS_COLORS)[Math.floor(Math.random() * 5)]
      }
    }

    return mockMap
  }, [])

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">История наводнений (12 месяцев)</h3>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="mb-2 flex gap-1">
            <div className="w-8" />
            {monthLabels.map((month, idx) => (
              <div
                key={idx}
                className="w-12 text-center text-xs font-medium text-gray-400"
                style={{ minWidth: '48px' }}
              >
                {month}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-1">
            {/* Days of week labels */}
            <div className="flex flex-col gap-1">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                <div key={day} className="h-3 w-8 text-center text-xs text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day, dayIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const status = calendarData[dateStr] || ''
                  const color = STATUS_COLORS[status] || '#1f2937'

                  return (
                    <div
                      key={dayIdx}
                      className="h-3 w-3 rounded border border-gray-700 transition-all hover:ring-2 hover:ring-blue-500"
                      style={{ backgroundColor: color }}
                      title={`${format(day, 'dd MMM yyyy', { locale: ru })} - ${status || 'Нет данных'}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-600" />
          <span className="text-gray-400">Нет данных</span>
        </div>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-gray-400">{getStatusLabel(status)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NORMAL: 'Норма',
    WATCH: 'Внимание',
    WARNING: 'Предупреждение',
    DANGER: 'Опасность',
    CRITICAL: 'Критично',
  }
  return labels[status] || status
}
