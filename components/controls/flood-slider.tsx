'use client'

import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Waves, Building2, MapPin, AlertTriangle } from 'lucide-react'

interface FloodSliderProps {
  realWaterLevelM: number
  effectiveWaterLevel: number
  simulationOffset: number
  isSimulating: boolean
  stats: {
    total: number
    flooded: number
    critical: number
    high: number
    medium: number
    low: number
    floodedPercent: number
  }
  onOffsetChange: (offset: number) => void
  onSimulationToggle: (enabled: boolean) => void
}

export function FloodSlider({
  realWaterLevelM,
  effectiveWaterLevel,
  simulationOffset,
  isSimulating,
  stats,
  onOffsetChange,
  onSimulationToggle,
}: FloodSliderProps) {
  return (
    <Card className="w-80 border-border/50 bg-card/80 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Waves className="h-4 w-4 text-primary" />
          Симуляция уровня воды
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Real water level */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Реальный уровень:</span>
          <span className="font-mono font-medium">
            {realWaterLevelM.toFixed(1)} м
          </span>
        </div>

        {/* Simulation toggle */}
        <div className="flex items-center justify-between">
          <Label
            htmlFor="simulation-toggle"
            className="text-sm text-muted-foreground"
          >
            Включить симуляцию
          </Label>
          <Switch
            id="simulation-toggle"
            checked={isSimulating}
            onCheckedChange={onSimulationToggle}
          />
        </div>

        {/* Offset slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Смещение:</span>
            <span
              className={`font-mono font-medium ${
                simulationOffset > 0
                  ? 'text-destructive'
                  : simulationOffset < 0
                    ? 'text-green-500'
                    : ''
              }`}
            >
              {simulationOffset > 0 ? '+' : ''}
              {simulationOffset.toFixed(1)} м
            </span>
          </div>
          <Slider
            value={[simulationOffset]}
            min={-3}
            max={5}
            step={0.1}
            disabled={!isSimulating}
            onValueChange={([value]) => onOffsetChange(value)}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-3м</span>
            <span>+5м</span>
          </div>
        </div>

        {/* Effective water level */}
        <div className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm">
          <span className="text-muted-foreground">Эффективный уровень:</span>
          <span className="font-mono font-bold text-primary">
            {effectiveWaterLevel.toFixed(1)} м
          </span>
        </div>

        {/* Stats */}
        {stats.total > 0 && (
          <div className="space-y-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Затоплено зданий:
              </span>
              <span
                className={`font-medium ${
                  stats.floodedPercent > 50
                    ? 'text-destructive'
                    : stats.floodedPercent > 20
                      ? 'text-orange-500'
                      : stats.floodedPercent > 0
                        ? 'text-yellow-500'
                        : 'text-green-500'
                }`}
              >
                {stats.flooded} ({stats.floodedPercent}%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between rounded bg-red-950/50 px-2 py-1">
                <span className="text-red-400">Критически:</span>
                <span className="font-mono font-medium text-red-400">
                  {stats.critical}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-orange-950/50 px-2 py-1">
                <span className="text-orange-400">Высокий:</span>
                <span className="font-mono font-medium text-orange-400">
                  {stats.high}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-amber-950/50 px-2 py-1">
                <span className="text-amber-400">Средний:</span>
                <span className="font-mono font-medium text-amber-400">
                  {stats.medium}
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-yellow-950/50 px-2 py-1">
                <span className="text-yellow-400">Низкий:</span>
                <span className="font-mono font-medium text-yellow-400">
                  {stats.low}
                </span>
              </div>
            </div>
          </div>
        )}

        {stats.total === 0 && (
          <div className="flex items-center gap-2 rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>Загрузите здания через админ-панель</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
