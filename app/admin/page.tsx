'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Download,
  RefreshCw,
  ChevronDown,
  Building2,
  AlertTriangle,
  BarChart3,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'

interface ParseResult {
  success: boolean
  data?: {
    general_situation: string
    dangerous_sections: string[]
    stations: Array<{
      name: string
      river: string
      level_cm: number
      change_cm: number
      status: string
      forecast: string
    }>
    bulletin_date: string
    week_number: number
  }
  validation?: {
    valid: boolean
    errors: string[]
  }
  error?: string
}

interface APIHealthStatus {
  active: boolean
  latency?: number
  error?: string
}

export default function AdminPage() {
  const [loadingBuildings, setLoadingBuildings] = useState(false)
  const [buildingsCount, setBuildingsCount] = useState<number | null>(null)
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null)

  // PDF Parsing state
  const [pdfUrl, setPdfUrl] = useState('')
  const [parsingPdf, setParsingPdf] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [apiHealth, setApiHealth] = useState<APIHealthStatus | null>(null)
  const [checkingApiHealth, setCheckingApiHealth] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Kazhydromet sync state
  const [syncingKazhydromet, setSyncingKazhydromet] = useState(false)
  const [kazhydrometStatus, setKazhydrometStatus] = useState<{
    active: boolean
    source?: string
    inserted?: string[]
  } | null>(null)

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    buildings: true,
    bulletin: true,
    kazhydromet: true,
    stats: true,
  })

  // Fetch building counts and API health on mount
  useEffect(() => {
    fetchBuildingsCount()
    checkClaudeAPIHealth()
  }, [])

  async function fetchBuildingsCount() {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      setBuildingsCount(data.buildings || 0)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  async function checkClaudeAPIHealth() {
    setCheckingApiHealth(true)
    try {
      const res = await fetch('/api/parse-bulletin')
      const data = await res.json()
      setApiHealth({
        active: data.status === 'healthy',
        error: data.error,
      })
    } catch (error) {
      setApiHealth({ active: false, error: (error as Error).message })
    } finally {
      setCheckingApiHealth(false)
    }
  }

  async function handleSyncBuildings() {
    setLoadingBuildings(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/sync-buildings', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        setSyncResult(data)
        await fetchBuildingsCount()
        toast.success(
          `Загружено ${data.saved_to_db} зданий с данными рельефа`
        )
      } else {
        toast.error(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      toast.error(`Ошибка синхронизации: ${(error as Error).message}`)
    } finally {
      setLoadingBuildings(false)
    }
  }

  async function handleParsePdfUrl() {
    if (!pdfUrl.trim()) {
      toast.error('Введите URL PDF файла')
      return
    }

    setParsingPdf(true)
    setParseResult(null)
    try {
      const res = await fetch('/api/parse-bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl }),
      })
      const data = await res.json()
      setParseResult(data)

      if (data.success) {
        toast.success('Бюллетень успешно распознан')
      } else {
        toast.error(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      toast.error(`Ошибка парсинга: ${(error as Error).message}`)
      setParseResult({ success: false, error: (error as Error).message })
    } finally {
      setParsingPdf(false)
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Пожалуйста, выберите PDF файл')
      return
    }

    setParsingPdf(true)
    setParseResult(null)

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // Remove data:application/pdf;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/parse-bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64 }),
      })
      const data = await res.json()
      setParseResult(data)

      if (data.success) {
        toast.success('Бюллетень успешно распознан')
      } else {
        toast.error(`Ошибка: ${data.error}`)
      }
    } catch (error) {
      toast.error(`Ошибка парсинга: ${(error as Error).message}`)
      setParseResult({ success: false, error: (error as Error).message })
    } finally {
      setParsingPdf(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  async function handleSyncKazhydromet() {
    setSyncingKazhydromet(true)
    try {
      const res = await fetch('/api/kazhydromet', { method: 'POST' })
      const data = await res.json()

      setKazhydrometStatus({
        active: data.apiHealth?.active ?? false,
        source: data.source,
        inserted: data.inserted,
      })

      if (data.success) {
        toast.success(`Синхронизировано ${data.inserted?.length || 0} показаний`)
      } else {
        toast.error(`Ошибка: ${data.errors?.join(', ') || data.error}`)
      }
    } catch (error) {
      toast.error(`Ошибка синхронизации: ${(error as Error).message}`)
    } finally {
      setSyncingKazhydromet(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-6">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Панель администратора
            </h1>
            <p className="mt-1 text-muted-foreground">
              Управление данными системы АктобеФлудСенс
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">← На главную</Link>
          </Button>
        </div>

        {/* Section: Building Sync */}
        <Card className="mb-6 overflow-hidden border border-border bg-card">
          <div
            className="flex cursor-pointer items-center justify-between bg-muted/50 p-4 hover:bg-muted"
            onClick={() => toggleSection('buildings')}
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Загрузка зданий
              </h2>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                expandedSections.buildings ? 'rotate-180' : ''
              }`}
            />
          </div>

          {expandedSections.buildings && (
            <div className="space-y-4 border-t border-border p-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">Статус базы</p>
                <p className="text-2xl font-bold text-foreground">
                  {buildingsCount ?? 0} зданий
                </p>
              </div>

              <Button
                onClick={handleSyncBuildings}
                disabled={loadingBuildings}
                className="w-full"
              >
                {loadingBuildings ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Загружаем здания...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Загрузить здания из OSM
                  </>
                )}
              </Button>

              {syncResult && !loadingBuildings && (
                <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    ✓ Успешно загружено
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {(syncResult as { saved_to_db?: number }).saved_to_db} зданий из {(syncResult as { total_from_osm?: number }).total_from_osm} найденных
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Section: PDF Bulletin Parsing */}
        <Card className="mb-6 overflow-hidden border border-border bg-card">
          <div
            className="flex cursor-pointer items-center justify-between bg-muted/50 p-4 hover:bg-muted"
            onClick={() => toggleSection('bulletin')}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Парсинг PDF бюллетеня (Claude AI)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {checkingApiHealth ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : apiHealth?.active ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  expandedSections.bulletin ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {expandedSections.bulletin && (
            <div className="space-y-4 border-t border-border p-4">
              {/* API Health Status */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Claude API:</span>
                  {apiHealth?.active ? (
                    <span className="flex items-center gap-1 text-sm text-green-500">
                      <CheckCircle2 className="h-4 w-4" /> Активен
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-red-500">
                      <XCircle className="h-4 w-4" /> Недоступен
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkClaudeAPIHealth}
                  disabled={checkingApiHealth}
                >
                  <RefreshCw className={`h-4 w-4 ${checkingApiHealth ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  URL PDF бюллетеня
                </label>
                <div className="flex gap-2">
                  <Input
                    value={pdfUrl}
                    onChange={(e) => setPdfUrl(e.target.value)}
                    placeholder="https://kazhydromet.kz/..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleParsePdfUrl}
                    disabled={parsingPdf || !apiHealth?.active}
                  >
                    {parsingPdf ? <Spinner className="h-4 w-4" /> : 'Парсить'}
                  </Button>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Или загрузите PDF файл
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsingPdf || !apiHealth?.active}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать PDF файл
                </Button>
              </div>

              {/* Parsing Progress */}
              {parsingPdf && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    Claude AI анализирует PDF бюллетень...
                  </span>
                </div>
              )}

              {/* Parse Result */}
              {parseResult && !parsingPdf && (
                <div
                  className={`rounded-lg border p-4 ${
                    parseResult.success
                      ? 'border-green-500/50 bg-green-500/10'
                      : 'border-red-500/50 bg-red-500/10'
                  }`}
                >
                  {parseResult.success ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-700 dark:text-green-400">
                          Бюллетень успешно распознан
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="text-muted-foreground">
                          <strong>Дата:</strong> {parseResult.data?.bulletin_date}
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Неделя:</strong> {parseResult.data?.week_number}
                        </p>
                        <p className="text-muted-foreground">
                          <strong>Станций распознано:</strong>{' '}
                          {parseResult.data?.stations?.length || 0}
                        </p>
                      </div>

                      {parseResult.data?.stations && parseResult.data.stations.length > 0 && (
                        <div className="mt-3 rounded border border-border bg-background/50 p-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Распознанные станции:
                          </p>
                          <div className="space-y-1">
                            {parseResult.data.stations.map((station, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-foreground">{station.name}</span>
                                <span className="text-muted-foreground">
                                  {station.level_cm} см ({station.status})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {parseResult.validation && !parseResult.validation.valid && (
                        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                          Предупреждения: {parseResult.validation.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-red-700 dark:text-red-400">
                        Ошибка: {parseResult.error}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Section: Kazhydromet Sync */}
        <Card className="mb-6 overflow-hidden border border-border bg-card">
          <div
            className="flex cursor-pointer items-center justify-between bg-muted/50 p-4 hover:bg-muted"
            onClick={() => toggleSection('kazhydromet')}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Синхронизация Kazhydromet
              </h2>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                expandedSections.kazhydromet ? 'rotate-180' : ''
              }`}
            />
          </div>

          {expandedSections.kazhydromet && (
            <div className="space-y-4 border-t border-border p-4">
              {kazhydrometStatus && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Kazhydromet:</span>
                    <span
                      className={`text-sm ${
                        kazhydrometStatus.active ? 'text-green-500' : 'text-yellow-500'
                      }`}
                    >
                      {kazhydrometStatus.active ? 'Активен' : 'Недоступен (mock)'}
                    </span>
                  </div>
                  {kazhydrometStatus.source && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Источник: {kazhydrometStatus.source}
                    </p>
                  )}
                  {kazhydrometStatus.inserted && kazhydrometStatus.inserted.length > 0 && (
                    <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                      Обновлено: {kazhydrometStatus.inserted.join(', ')}
                    </p>
                  )}
                </div>
              )}

              <Button
                onClick={handleSyncKazhydromet}
                disabled={syncingKazhydromet}
                className="w-full"
              >
                {syncingKazhydromet ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Синхронизация...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Синхронизировать данные
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Получает данные уровней воды с API Kazhydromet и сохраняет в БД.
                При недоступности API используются тестовые данные.
              </p>
            </div>
          )}
        </Card>

        {/* Section: Database Statistics */}
        <Card className="overflow-hidden border border-border bg-card">
          <div
            className="flex cursor-pointer items-center justify-between bg-muted/50 p-4 hover:bg-muted"
            onClick={() => toggleSection('stats')}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-semibold text-foreground">
                Статистика БД
              </h2>
            </div>
            <ChevronDown
              className={`h-5 w-5 transition-transform ${
                expandedSections.stats ? 'rotate-180' : ''
              }`}
            />
          </div>

          {expandedSections.stats && (
            <div className="border-t border-border p-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Зданий</p>
                  <p className="text-2xl font-bold text-foreground">
                    {buildingsCount ?? '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Показания
                  </p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Бюллетени
                  </p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Алерты</p>
                  <p className="text-2xl font-bold text-foreground">—</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
