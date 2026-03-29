'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS, STATUS_LABELS_RU, FORECAST_LABELS_RU } from '@/lib/constants'
import type { StationWithReading, StationStatus, FloodForecast } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StationCardProps {
  station: StationWithReading
  isSelected?: boolean
  onClick?: () => void
}

export function StationCard({ station, isSelected, onClick }: StationCardProps) {
  const { latest_reading, readings_history } = station
  const status = latest_reading?.status || 'NORMAL'
  const level = latest_reading?.level_cm ?? 0
  const change = latest_reading?.change_cm ?? 0
  const forecast = latest_reading?.forecast || 'stable'

  const chartData = readings_history.map((r) => ({ level: r.level_cm }))

  return (
    <Card
      className={cn(
        'cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:bg-card/80',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {station.name_ru}
            </h3>
            <p className="text-xs text-muted-foreground">{station.river}</p>
          </div>
          <Badge
            variant="secondary"
            className="ml-2 shrink-0 text-white"
            style={{ backgroundColor: STATUS_COLORS[status as StationStatus] }}
          >
            {STATUS_LABELS_RU[status as StationStatus]}
          </Badge>
        </div>

        {/* Level and Change */}
        <div className="mb-3 flex items-end justify-between">
          <div>
            <span
              className="text-3xl font-bold"
              style={{ color: STATUS_COLORS[status as StationStatus] }}
            >
              {level}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">см</span>
          </div>
          <ChangeIndicator change={change} />
        </div>

        {/* Sparkline */}
        <div className="mb-3 h-8 w-full" style={{ minWidth: 100, minHeight: 32 }}>
          {chartData.length > 0 && (
            <div style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={32}>
                <LineChart data={chartData}>
                  <Line
                    type="monotone"
                    dataKey="level"
                    stroke={STATUS_COLORS[status as StationStatus]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Forecast */}
        <div className="text-xs text-muted-foreground">
          Прогноз:{' '}
          <span
            className={cn(
              'font-medium',
              forecast === 'rising' && 'text-red-400',
              forecast === 'falling' && 'text-blue-400',
              forecast === 'stable' && 'text-muted-foreground'
            )}
          >
            {FORECAST_LABELS_RU[forecast as FloodForecast]}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function ChangeIndicator({ change }: { change: number }) {
  if (change > 0) {
    return (
      <div className="flex items-center text-sm font-medium text-red-400">
        <ArrowUp className="mr-0.5 h-4 w-4" />
        <span>+{change} см</span>
      </div>
    )
  }
  if (change < 0) {
    return (
      <div className="flex items-center text-sm font-medium text-blue-400">
        <ArrowDown className="mr-0.5 h-4 w-4" />
        <span>{change} см</span>
      </div>
    )
  }
  return (
    <div className="flex items-center text-sm font-medium text-muted-foreground">
      <Minus className="mr-0.5 h-4 w-4" />
      <span>стабильно</span>
    </div>
  )
}
