'use client'

import type { Building, FloodCalculation } from '@/lib/types'
import { AlertTriangle, Building2 } from 'lucide-react'

interface BuildingTooltipProps {
  building: Building | null
  calculation: FloodCalculation | null
  x: number
  y: number
}

const RISK_LABELS: Record<FloodCalculation['risk_level'], string> = {
  none: 'Нет риска',
  low: 'Низкий риск',
  medium: 'Средний риск',
  high: 'Высокий риск',
  critical: 'Критический риск',
}

const RISK_COLORS: Record<FloodCalculation['risk_level'], string> = {
  none: 'text-green-400 bg-green-950/80',
  low: 'text-yellow-400 bg-yellow-950/80',
  medium: 'text-orange-400 bg-orange-950/80',
  high: 'text-red-400 bg-red-950/80',
  critical: 'text-red-300 bg-red-900/90',
}

export function BuildingTooltip({
  building,
  calculation,
  x,
  y,
}: BuildingTooltipProps) {
  if (!building) return null

  const riskLevel = calculation?.risk_level ?? 'none'

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[200px] rounded-lg border border-border/50 bg-card/95 p-3 shadow-xl backdrop-blur-sm"
      style={{
        left: x + 15,
        top: y + 15,
        transform: 'translateY(-50%)',
      }}
    >
      {/* Address */}
      <div className="mb-2 flex items-start gap-2">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {building.address || building.name_ru || 'Без адреса'}
          </p>
          {building.district && (
            <p className="text-xs text-muted-foreground">{building.district}</p>
          )}
        </div>
      </div>

      {/* Building info */}
      <div className="mb-2 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Этажей:</span>
          <span className="font-medium">{building.floors ?? 2}</span>
        </div>
        {calculation && calculation.flooded_meters > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Затоплено:</span>
              <span className="font-mono font-medium text-destructive">
                {calculation.flooded_meters.toFixed(1)} м
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Покрыто этажей:</span>
              <span className="font-mono font-medium">
                {calculation.flooded_floors.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Risk badge */}
      <div
        className={`flex items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${RISK_COLORS[riskLevel]}`}
      >
        {riskLevel !== 'none' && <AlertTriangle className="h-3 w-3" />}
        {RISK_LABELS[riskLevel]}
      </div>
    </div>
  )
}
