'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { TrendingUp, Cloud, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from 'recharts'
import { GaugeStation, MLForecast } from '@/lib/types'

async function fetchStations() {
  const res = await fetch('/api/stations')
  if (!res.ok) throw new Error('Failed to fetch stations')
  return res.json()
}

async function fetchForecasts(stationId: string) {
  const res = await fetch(`/api/forecasts?station_id=${stationId}`)
  if (!res.ok) throw new Error('Failed to fetch forecasts')
  return res.json()
}

export default function ForecastPage() {
  const [selectedStationId, setSelectedStationId] = useState<string>('ilek-aktobe')
  const [selectedHorizon, setSelectedHorizon] = useState<3 | 7 | 14>(3)

  const { data: stationsData } = useSWR('forecast-stations', fetchStations)
  const { data: forecastsData } = useSWR(selectedStationId ? `forecasts-${selectedStationId}` : null, () => fetchForecasts(selectedStationId))

  const stations = (stationsData?.data || []) as GaugeStation[]
  const forecasts = (forecastsData?.data || []) as MLForecast[]
  const selectedStation = stations.find((s) => s.id === selectedStationId)
  const selectedForecast = forecasts.find((f) => f.horizon_days === selectedHorizon)

  // Mock forecast data for chart visualization
  const forecastChartData = [
    { day: 'День 1', predicted: 250, lower: 240, upper: 260, danger: 280 },
    { day: 'День 2', predicted: 290, lower: 275, upper: 305, danger: 280 },
    { day: 'День 3', predicted: 320, lower: 300, upper: 340, danger: 280 },
    { day: 'День 4', predicted: 310, lower: 290, upper: 330, danger: 280 },
    { day: 'День 5', predicted: 295, lower: 275, upper: 315, danger: 280 },
    { day: 'День 6', predicted: 270, lower: 250, upper: 290, danger: 280 },
    { day: 'День 7', predicted: 240, lower: 220, upper: 260, danger: 280 },
  ]

  const riskAssessmentData = [
    { level: 'Нормальный', probability: 15 },
    { level: 'Внимание', probability: 25 },
    { level: 'Предупреждение', probability: 40 },
    { level: 'Опасный', probability: 15 },
    { level: 'Критический', probability: 5 },
  ]

  const RiskIndicator = ({
    label,
    probability,
    color,
  }: {
    label: string
    probability: number
    color: string
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm font-bold">{probability}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/50">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${probability}%` }} />
      </div>
    </div>
  )

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Прогнозирование наводнений</h1>
        <p className="text-muted-foreground">Долгосрочные прогнозы уровня воды с использованием ML моделей</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Station Selector */}
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
            {/* Horizon Selector */}
            <div className="flex gap-2">
              {[3, 7, 14].map((horizon) => (
                <button
                  key={horizon}
                  onClick={() => setSelectedHorizon(horizon as 3 | 7 | 14)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedHorizon === horizon
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  {horizon} дней
                </button>
              ))}
            </div>

            {/* Forecast Summary */}
            {selectedForecast && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Прогнозный уровень</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">{selectedForecast.predicted_level_cm} см</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Доверительный интервал</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-mono text-sm">
                      {selectedForecast.confidence_lower_cm} - {selectedForecast.confidence_upper_cm} см
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Вероятность опасности</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      <span className="text-2xl font-bold text-orange-500">
                        {Math.round((selectedForecast.probability_danger || 0) * 100)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Charts */}
            <Tabs defaultValue="forecast" className="space-y-4">
              <TabsList>
                <TabsTrigger value="forecast">Прогноз уровня</TabsTrigger>
                <TabsTrigger value="risk">Оценка риска</TabsTrigger>
                <TabsTrigger value="factors">Факторы</TabsTrigger>
              </TabsList>

              <TabsContent value="forecast" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Прогноз уровня воды на {selectedHorizon} дней</CardTitle>
                    <CardDescription>Предсказанный уровень с доверительным интервалом</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecastChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="upper" fill="#0ea5e9" stroke="none" fillOpacity={0.1} name="Верхняя граница" />
                        <Area type="monotone" dataKey="lower" fill="#0ea5e9" stroke="none" fillOpacity={0.2} name="Нижняя граница" />
                        <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} name="Прогноз" />
                        <Line type="monotone" dataKey="danger" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} name="Опасный уровень" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risk" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Оценка рисков</CardTitle>
                    <CardDescription>Вероятность каждого уровня опасности</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <RiskIndicator label="Нормальный" probability={15} color="bg-green-500" />
                    <RiskIndicator label="Внимание" probability={25} color="bg-blue-500" />
                    <RiskIndicator label="Предупреждение" probability={40} color="bg-yellow-500" />
                    <RiskIndicator label="Опасный" probability={15} color="bg-orange-500" />
                    <RiskIndicator label="Критический" probability={5} color="bg-red-500" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Визуализация рисков</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={riskAssessmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="level" />
                        <YAxis />
                        <Tooltip />
                        <Area type="monotone" dataKey="probability" fill="#8b5cf6" stroke="#8b5cf6" name="Вероятность %" />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="factors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Входные факторы модели</CardTitle>
                    <CardDescription>Параметры, используемые для прогнозирования</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Текущий уровень воды</span>
                        <span className="font-mono text-sm">287 см</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Расход воды</span>
                        <span className="font-mono text-sm">45.2 м³/с</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Температура воды</span>
                        <span className="font-mono text-sm">12.5°C</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Осадки (прогноз)</span>
                        <span className="font-mono text-sm">2.3 мм</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Сезонность</span>
                        <span className="font-mono text-sm">Весна (паводок)</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Версия модели</span>
                        <span className="font-mono text-sm">v2.1 (XGBoost)</span>
                      </div>
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
