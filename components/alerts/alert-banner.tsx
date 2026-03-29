'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GaugeStation, GaugeReading } from '@/lib/types'

interface Alert {
  id: string
  station: GaugeStation
  severity: 'WARNING' | 'DANGER' | 'CRITICAL'
  level_cm: number
  message_ru: string
  created_at: string
}

interface AlertBannerProps {
  alerts?: Alert[]
  isLoading?: boolean
}

export function AlertBanner({ alerts = [], isLoading }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || alerts.length === 0 || isLoading) {
    return null
  }

  const primaryAlert = alerts[0]
  const hasMoreAlerts = alerts.length > 1
  const isHighSeverity = primaryAlert.severity === 'CRITICAL' || primaryAlert.severity === 'DANGER'

  const bgColor =
    primaryAlert.severity === 'CRITICAL'
      ? 'bg-red-950'
      : primaryAlert.severity === 'DANGER'
        ? 'bg-red-900'
        : 'bg-amber-900'

  const borderColor =
    primaryAlert.severity === 'CRITICAL'
      ? 'border-red-700'
      : primaryAlert.severity === 'DANGER'
        ? 'border-red-700'
        : 'border-amber-700'

  const textColor =
    primaryAlert.severity === 'CRITICAL' ? 'text-red-200' : 'text-amber-200'

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 border-b ${bgColor} ${borderColor} px-4 py-3 ${
        isHighSeverity ? 'animate-pulse' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${textColor}`} />
          <div className="flex-1">
            <p className={`font-semibold ${textColor}`}>
              ⚠️ ВНИМАНИЕ: {primaryAlert.message_ru}
            </p>
            {hasMoreAlerts && (
              <p className="mt-1 text-sm text-gray-300">и ещё {alerts.length - 1} предупреждение ↓</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
