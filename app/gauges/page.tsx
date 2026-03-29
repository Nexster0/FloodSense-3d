'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowUp, ArrowDown, Cloud, Droplets, Wind } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GaugeStation, GaugeReading, MLForecast, Alert } from '@/lib/types'

async function fetchStations() {
  const res = await fetch('/api/stations')
  if (!res.ok) throw new Error('Failed to fetch stations')
  return res.json()
}

async function fetchReadings(stationId: string) {
  const res = await fetch(`/api/readings?station_id=${stationId}&days=30`)
  if (!res.ok) throw new Error('Failed to fetch readings')
  return res.json()
}

async function fetchForecasts(stationId: string) {
  const res = await fetch(`/api/forecasts?station_id=${stationId}`)
  if (!res.ok) throw new Error('Failed to fetch forecasts')
  return res.json()
}

async function fetchAlerts(stationId: string) {
  const res = await fetch(`/api/alerts?station_id=${stationId}&active=true`)
  if (!res.ok) throw new Error('Failed to fetch alerts')
  return res.json()
}

export default function GaugesPage() {
  const [selectedStationId, setSelectedStationId] = useState<string>('ilek-aktobe')

  const { data: stationsData } = useSWR('gauges-stations', fetchStations)
  const { data: readingsData } = useSWR(selectedStationId ? `readings-${selectedStationId}` : null, () => fetchReadings(selectedStationId))
  const { data: forecastsData } = useSWR(selectedStationId ? `forecasts-${selectedStationId}` : null, () => fetchForecasts(selectedStationId))
  const { data: alertsData } = useSWR(selectedStationId ? `alerts-${selectedStationId}` : null, () => fetchAlerts(selectedStationId))

  const stations = (stationsData?.data || []) as GaugeStation[]
  const readings = (readingsData?.data || []) as GaugeReading[]
  const forecasts = (forecastsData?.data || []) as MLForecast[]
  const alerts = (alertsData?.data || []) as Alert[]

  const selectedStation = stations.find((s) => s.id === selectedStationId)
  const latestReading = readings[0]
  const forecast3d = forecasts.find((f) => f.horizon_days === 3)
  const forecast7d = forecasts.find((f) => f.horizon_days === 7)

  // Prepare chart data
  const chartData = readings
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((r) => ({
      date: new Date(r.recorded_at).toLocaleDateString('ru-RU'),
      level: r.level_cm,
      flow: r.flow_rate_m3s || 0,
      temp: r.water_temp_c || 0,
    }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'text-red-500'
      case 'DANGER':
        return 'text-orange-500'
      case 'WARNING':
        return 'text-yellow-500'
      case 'WATCH':
        return 'text-blue-500'
      default:
        return 'text-green-500'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CRITICAL':
        return 'bg-red-500/10'
      case 'DANGER':
        return 'bg-orange-500/10'
      case 'WARNING':
        return 'bg-yellow-500/10'
      case 'WATCH':
        return 'bg-blue-500/10'
      default:
        return 'bg-green-500/10'
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Гидрологические посты</h1>
        <p className="text-muted-foreground">Детальная информация по каждому посту мониторинга</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Station List */}
        <div className="space-y-2">
          {stations.map((station) => (
            <button
              key={station.id}
              onClick={() => setSelectedStationId(station.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selectedStationId === station.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 hover:border-border/75'
              }`}
            >
              <p className="text-sm font-medium">{station.name_ru}</p>
              <p className="text-xs text-muted-foreground">{station.river}</p>
            </button>
          ))}
        </div>

        {/* Main Content */}
        {selectedStation && (
          <div className="space-y-6 lg:col-span-3">
            {/* Header Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Текущий уровень</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-3">
                    <span className={`text-2xl font-bold ${getStatusColor(latestReading?.status || 'NORMAL')}`}>
                      {latestReading?.level_cm || 'N/A'} см
                    </span>
                    {latestReading?.change_cm !== undefined && (
                      <span className={`flex items-center gap-1 text-sm ${latestReading.change_cm > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {latestReading.change_cm > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        {Math.abs(latestReading.change_cm)} см
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Статус</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusBg(latestReading?.status || 'NORMAL')} ${getStatusColor(latestReading?.status || 'NORMAL')}`}>
                    {latestReading?.status || 'N/A'}
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Расход воды</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-lg font-semibold">{latestReading?.flow_rate_m3s || 'N/A'} м³/с</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Опасная отметка</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-lg font-semibold">{selectedStation.danger_level_cm} см</span>
                </CardContent>
              </Card>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <Card className="border-orange-500/50 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="text-orange-600">Активные оповещения</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-2 rounded-lg bg-orange-500/10 p-2">
                        <div className="mt-1 h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{alert.message_ru}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="chart" className="space-y-4">
              <TabsList>
                <TabsTrigger value="chart">График</TabsTrigger>
                <TabsTrigger value="forecast">Прогноз</TabsTrigger>
                <TabsTrigger value="info">Информация</TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Уровень воды (последние 30 дней)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="level" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLevel)" name="Уровень (см)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Расход воды</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="flow" stroke="#06b6d4" name="Расход (м³/с)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="forecast" className="space-y-4">
                {forecast3d && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Прогноз на 3 дня</CardTitle>
                      <CardDescription>Дата прогноза: {forecast3d.forecast_date}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-primary/5 p-4">
                          <p className="text-sm text-muted-foreground">Прогнозный уровень</p>
                          <p className="mt-2 text-2xl font-bold">{forecast3d.predicted_level_cm} см</p>
                        </div>
                        <div className="rounded-lg bg-blue-500/5 p-4">
                          <p className="text-sm text-muted-foreground">Доверительный интервал</p>
                          <p className="mt-2 text-sm font-mono">{forecast3d.confidence_lower_cm} - {forecast3d.confidence_upper_cm} см</p>
                        </div>
                        <div className="rounded-lg bg-orange-500/5 p-4">
                          <p className="text-sm text-muted-foreground">Вероятность опасности</p>
                          <p className="mt-2 text-2xl font-bold text-orange-500">{Math.round((forecast3d.probability_danger || 0) * 100)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {forecast7d && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Прогноз на 7 дней</CardTitle>
                      <CardDescription>Дата прогноза: {forecast7d.forecast_date}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-primary/5 p-4">
                          <p className="text-sm text-muted-foreground">Прогнозный уровень</p>
                          <p className="mt-2 text-2xl font-bold">{forecast7d.predicted_level_cm} см</p>
                        </div>
                        <div className="rounded-lg bg-blue-500/5 p-4">
                          <p className="text-sm text-muted-foreground">Доверительный интервал</p>
                          <p className="mt-2 text-sm font-mono">{forecast7d.confidence_lower_cm} - {forecast7d.confidence_upper_cm} см</p>
                        </div>
                        <div className="rounded-lg bg-red-500/5 p-4">
                          <p className="text-sm text-muted-foreground">Вероятность критичности</p>
                          <p className="mt-2 text-2xl font-bold text-red-500">{Math.round((forecast7d.probability_danger || 0) * 100)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!forecast3d && !forecast7d && (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">Прогнозы не доступны</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="info" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Информация о посте</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Координаты</p>
                          <p className="font-mono text-sm">{selectedStation.lat.toFixed(4)}, {selectedStation.lng.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Площадь бассейна</p>
                          <p className="font-semibold">{selectedStation.basin_area_km2?.toLocaleString('ru-RU')} км²</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Нулевая отметка</p>
                          <p className="font-semibold">{selectedStation.zero_elevation_m} м</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Нормальный уровень</p>
                          <p className="font-semibold">{selectedStation.normal_level_cm} см</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Уровень предупреждения</p>
                          <p className="font-semibold">{selectedStation.warning_level_cm} см</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Опасный уровень</p>
                          <p className="font-semibold">{selectedStation.danger_level_cm} см</p>
                        </div>
                      </div>
                      {selectedStation.description && (
                        <div>
                          <p className="text-sm text-muted-foreground">Описание</p>
                          <p className="mt-1 text-sm">{selectedStation.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}
