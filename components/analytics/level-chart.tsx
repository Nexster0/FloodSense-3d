'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GaugeReading, GaugeStation } from '@/lib/types'

const STATION_COLORS: Record<string, string> = {
  'р. Илек': '#ef4444',
  'р. Сагыз': '#f97316',
  'р. Темир': '#eab308',
  'р. Оша': '#22c55e',
  'р. Орь': '#06b6d4',
}

interface LevelChartProps {
  stations: (GaugeStation & { latest_reading: GaugeReading | null })[]
  isLoading?: boolean
  range?: '7d' | '30d' | '90d'
  onRangeChange?: (range: '7d' | '30d' | '90d') => void
}

export function LevelChart({ stations, isLoading, range = '30d', onRangeChange }: LevelChartProps) {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d'>(range)

  // Mock data - in production, fetch from /api/analytics?range=30d
  const mockData = generateMockChartData(selectedRange)

  const handleRangeChange = (newRange: '7d' | '30d' | '90d') => {
    setSelectedRange(newRange)
    onRangeChange?.(newRange)
  }

  if (isLoading) {
    return <Skeleton className="h-80 w-full" />
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Уровень воды (последние 30 дней)</h3>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <Button
              key={r}
              variant={selectedRange === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleRangeChange(r)}
            >
              {r === '7d' ? '7 дней' : r === '30d' ? '30 дней' : '90 дней'}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: 300, minWidth: 200, minHeight: 300, display: 'flex' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300}>
          <LineChart data={mockData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="#9ca3af"
            label={{ value: 'Уровень (см)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f3f4f6' }}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          
          {/* Reference lines */}
          <ReferenceLine
            y={350}
            stroke="#dc2626"
            strokeDasharray="5 5"
            label={{ value: 'Опасный уровень', position: 'insideTopRight', offset: -10 }}
          />
          <ReferenceLine
            y={250}
            stroke="#f97316"
            strokeDasharray="5 5"
            label={{ value: 'Уровень внимания', position: 'insideTopRight', offset: -30 }}
          />

          {/* Station lines */}
          <Line
            type="monotone"
            dataKey="р. Илек"
            stroke={STATION_COLORS['р. Илек']}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="р. Сагыз"
            stroke={STATION_COLORS['р. Сагыз']}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="р. Темир"
            stroke={STATION_COLORS['р. Темир']}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function generateMockChartData(range: '7d' | '30d' | '90d') {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const data = []

  for (let i = days; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      date: format(date, 'dd MMM', { locale: ru }),
      'р. Илек': Math.floor(Math.random() * 150 + 180),
      'р. Сагыз': Math.floor(Math.random() * 100 + 120),
      'р. Темир': Math.floor(Math.random() * 80 + 100),
    })
  }

  return data
}
