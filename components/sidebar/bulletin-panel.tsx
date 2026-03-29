'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, AlertTriangle, MapPin, FileText, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface District {
  name: string
  nameKz: string
  riskLevel: 'high' | 'medium' | 'low'
}

const FLOOD_RISK_DISTRICTS: District[] = [
  // Medium risk - yellow on map
  { name: 'Қобда', nameKz: 'Қобда ауданы', riskLevel: 'medium' },
  { name: 'Әйтеке би', nameKz: 'Әйтеке би ауданы', riskLevel: 'medium' },
  { name: 'Алға', nameKz: 'Алға ауданы', riskLevel: 'medium' },
  { name: 'Мұғалжар', nameKz: 'Мұғалжар ауданы', riskLevel: 'medium' },
  { name: 'Ойыл', nameKz: 'Ойыл ауданы', riskLevel: 'medium' },
  { name: 'Қарғалы', nameKz: 'Қарғалы ауданы', riskLevel: 'medium' },
  { name: 'Ырғыз', nameKz: 'Ырғыз ауданы', riskLevel: 'medium' },
  { name: 'Мәртөк', nameKz: 'Мәртөк ауданы', riskLevel: 'medium' },
  { name: 'Ақтөбе қ.', nameKz: 'Ақтөбе қаласы', riskLevel: 'medium' },
  // Low risk - green on map
  { name: 'Байғанин', nameKz: 'Байғанин ауданы', riskLevel: 'low' },
  { name: 'Шалқар', nameKz: 'Шалқар ауданы', riskLevel: 'low' },
  { name: 'Хромтау', nameKz: 'Хромтау ауданы', riskLevel: 'low' },
  { name: 'Темір', nameKz: 'Темір ауданы', riskLevel: 'low' },
]

const RISK_COLORS = {
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const RISK_LABELS = {
  high: 'Жоғары қауіп',
  medium: 'Орташа қауіп',
  low: 'Төмен қауіп',
}

export function BulletinPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDistricts, setShowDistricts] = useState(false)

  const mediumRisk = FLOOD_RISK_DISTRICTS.filter((d) => d.riskLevel === 'medium')
  const lowRisk = FLOOD_RISK_DISTRICTS.filter((d) => d.riskLevel === 'low')

  return (
    <div className="border-t border-border/50 bg-card/30">
      {/* Main toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <FileText className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-medium">Қазгидромет бюллетені</span>
        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
          Көктем 2024
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-4 px-4 pb-4">
          {/* Map image from Kazhydromet PDF */}
          <div className="overflow-hidden rounded-lg border border-border/50">
            <div className="bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
              Сурет 2 – Ақтөбе облысы бойынша су тасқыны қауіпті аудандарының картасы
            </div>
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-DaiXKSWMllw2TmtXVks7BzGqDbax5v.png"
              alt="Ақтөбе облысы су тасқыны қауіпті аудандары"
              className="w-full"
            />
            <div className="flex items-center gap-4 bg-muted/30 px-3 py-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-amber-400" />
                <span className="text-muted-foreground">Орташа қауіп</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-400" />
                <span className="text-muted-foreground">Төмен қауіп</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">Көктемгі су тасқыны болжамы</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Көктемгі су тасқыны қаупі <span className="text-amber-400 font-medium">орташа</span>: 
              Қобда, Әйтеке би, Алға, Мұғалжар, Ойыл, Қарғалы, Ырғыз, Мәртөк аудандары, 
              сондай-ақ Ақтөбе қаласы. Қаупі <span className="text-emerald-400 font-medium">төмен</span>: 
              Байғанин, Шалқар, Хромтау, Темір аудандары.
            </p>
          </div>

          {/* Districts toggle */}
          <button
            onClick={() => setShowDistricts(!showDistricts)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left transition-colors hover:bg-muted/50"
          >
            {showDistricts ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <MapPin className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm">Аудандар бойынша</span>
            <span className="text-xs text-muted-foreground">{FLOOD_RISK_DISTRICTS.length} аудан</span>
          </button>

          {showDistricts && (
            <div className="space-y-3">
              {/* Medium risk */}
              <div>
                <div className="mb-2 text-xs font-medium text-amber-400">
                  Орташа қауіп ({mediumRisk.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {mediumRisk.map((district) => (
                    <span
                      key={district.name}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs',
                        RISK_COLORS.medium
                      )}
                    >
                      {district.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Low risk */}
              <div>
                <div className="mb-2 text-xs font-medium text-emerald-400">
                  Төмен қауіп ({lowRisk.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lowRisk.map((district) => (
                    <span
                      key={district.name}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs',
                        RISK_COLORS.low
                      )}
                    >
                      {district.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Source link */}
          <a
            href="https://kazhydromet.kz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            Дереккөз: РМК «Қазгидромет»
          </a>
        </div>
      )}
    </div>
  )
}
