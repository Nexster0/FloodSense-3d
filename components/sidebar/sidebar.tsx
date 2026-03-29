'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, Waves, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { StationCard } from './station-card'
import { BulletinPanel } from './bulletin-panel'
import type { StationWithReading } from '@/lib/types'

interface SidebarProps {
  stations: StationWithReading[]
  isLoading?: boolean
  generalSituation?: string
  lastUpdated?: Date
  selectedStationId?: string | null
  onStationSelect?: (station: StationWithReading) => void
  onRefresh?: () => Promise<void>
  floodStatsMessage?: string
}

export function Sidebar({
  stations,
  isLoading,
  generalSituation,
  lastUpdated,
  selectedStationId,
  onStationSelect,
  onRefresh,
  floodStatsMessage,
}: SidebarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  // Format date on client-side only to avoid hydration mismatch
  useEffect(() => {
    if (lastUpdated) {
      setFormattedDate(format(lastUpdated, 'dd MMMM yyyy, HH:mm', { locale: ru }))
    }
  }, [lastUpdated])

  // Count stations with warning or above
  const alertCount = stations.filter((s) =>
    ['WARNING', 'DANGER', 'CRITICAL'].includes(s.latest_reading?.status || 'NORMAL')
  ).length

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
      toast.success('Данные обновлены')
    } catch {
      toast.error('Ошибка при обновлении данных')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-border/50 bg-card/80 backdrop-blur-md">
      {/* Header */}
      <div className="shrink-0 border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <Waves className="h-6 w-6 text-blue-400" />
          <h1 className="text-lg font-bold text-foreground">АктобеФлудСенс</h1>
        </div>
        {formattedDate && (
          <p className="mt-1 text-xs text-muted-foreground">
            Обновлено: {formattedDate}
          </p>
        )}
        {floodStatsMessage && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-400">
            <Building2 className="h-3.5 w-3.5" />
            <span>{floodStatsMessage}</span>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {alertCount > 0 && (
        <div className="shrink-0 animate-pulse border-b border-red-900/50 bg-red-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Внимание! Превышение уровней на {alertCount}{' '}
              {alertCount === 1 ? 'станции' : alertCount < 5 ? 'станциях' : 'станциях'}
            </span>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="shrink-0 border-b border-border/50 p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить данные
        </Button>
      </div>

      {/* Station List */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <StationCardSkeleton key={i} />
              ))}
            </>
          ) : (
            stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isSelected={selectedStationId === station.id}
                onClick={() => onStationSelect?.(station)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* General Situation */}
      {generalSituation && (
        <div className="shrink-0 border-t border-border/50 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Общая обстановка
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{generalSituation}</p>
        </div>
      )}

      {/* Kazhydromet Bulletin Panel */}
      <BulletinPanel />
    </div>
  )
}

function StationCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-8 w-20" />
      <Skeleton className="mb-3 h-8 w-full" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}
