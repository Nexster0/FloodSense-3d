'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Download, TrendingDown, TrendingUp, AlertTriangle, Database } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { LevelChart } from '@/components/analytics/level-chart'
import { EventCalendar } from '@/components/analytics/event-calendar'
import { getMockStationsWithReadings } from '@/lib/constants'
import type { StationWithReading } from '@/lib/types'

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [isExporting, setIsExporting] = useState(false)

  // Mock stations data
  const stations = getMockStationsWithReadings()
  const latestReadings = stations.map((s) => s.latest_reading).filter(Boolean)

  // Calculate stats
  const maxLevel = Math.max(...(latestReadings.map((r) => r?.level_cm || 0) || [0]))
  const stationsInAlert = stations.filter(
    (s) => s.latest_reading?.status && ['DANGER', 'CRITICAL'].includes(s.latest_reading.status)
  ).length

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export-csv')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gauge_readings_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
    } catch (error) {
      console.error('[v0] Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportGeoJSON = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export-geojson')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `buildings_flood_${format(new Date(), 'yyyy-MM-dd')}.geojson`
      a.click()
    } catch (error) {
      console.error('[v0] Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Аналитика</h1>
              <p className="mt-1 text-sm text-gray-400">
                Данные мониторинга паводковой ситуации в Актюбинской области
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">← На карту</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stat Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Текущий макс уровень"
            value={`${maxLevel} см`}
            icon={<Database className="h-5 w-5" />}
            color="bg-blue-600"
          />
          <StatCard
            title="Станций в тревоге"
            value={`${stationsInAlert} / 5`}
            icon={<AlertTriangle className="h-5 w-5" />}
            color={stationsInAlert > 0 ? 'bg-red-600' : 'bg-green-600'}
          />
          <StatCard
            title="Дней до пика"
            value="2-3 дня"
            icon={<TrendingUp className="h-5 w-5" />}
            color="bg-amber-600"
          />
          <StatCard
            title="Записей в истории"
            value={latestReadings.length > 0 ? '1,240' : '0'}
            icon={<Database className="h-5 w-5" />}
            color="bg-purple-600"
          />
        </div>

        {/* Level Chart */}
        <div className="mb-8">
          <LevelChart
            stations={stations as any}
            range={range}
            onRangeChange={setRange}
          />
        </div>

        {/* Stations Table */}
        <div className="mb-8 rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-800">
                  <th className="px-6 py-3 text-left font-semibold">Станция</th>
                  <th className="px-6 py-3 text-left font-semibold">Река</th>
                  <th className="px-6 py-3 text-right font-semibold">Уровень (см)</th>
                  <th className="px-6 py-3 text-center font-semibold">Изменение</th>
                  <th className="px-6 py-3 text-center font-semibold">Статус</th>
                  <th className="px-6 py-3 text-center font-semibold">Прогноз</th>
                  <th className="px-6 py-3 text-left font-semibold">Последнее обновление</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => {
                  const reading = station.latest_reading
                  return (
                    <tr key={station.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium">{station.name_ru}</td>
                      <td className="px-6 py-3 text-gray-400">{station.river}</td>
                      <td className="px-6 py-3 text-right font-mono text-lg">
                        {reading?.level_cm || '-'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {reading?.change_cm && (
                          <span
                            className={`flex items-center justify-center gap-1 ${
                              reading.change_cm < 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {reading.change_cm < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            )}
                            {Math.abs(reading.change_cm)} см
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(
                            reading?.status || ''
                          )}`}
                        >
                          {getStatusLabel(reading?.status || '')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-gray-400">
                        {reading?.forecast || '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-400 text-xs">
                        {reading?.recorded_at
                          ? format(new Date(reading.recorded_at), 'dd MMM, HH:mm', { locale: ru })
                          : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calendar and Export */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventCalendar />
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-lg font-semibold">Экспорт данных</h3>
            <div className="space-y-3">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="w-full justify-center gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Экспортировать CSV
              </Button>
              <Button
                onClick={handleExportGeoJSON}
                disabled={isExporting}
                className="w-full justify-center gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Экспортировать GeoJSON
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
      <div className={`mb-3 inline-block rounded-lg ${color} p-3 text-white`}>{icon}</div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
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

function getStatusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    NORMAL: 'bg-green-900 text-green-200',
    WATCH: 'bg-yellow-900 text-yellow-200',
    WARNING: 'bg-orange-900 text-orange-200',
    DANGER: 'bg-red-900 text-red-200',
    CRITICAL: 'bg-red-950 text-red-100',
  }
  return classes[status] || 'bg-gray-800 text-gray-200'
}
