import type { GaugeStation, GaugeReading, StationStatus, FloodForecast } from './types'

export const AKTOBE_CENTER = { lat: 50.30, lng: 57.20 }
export const MAP_DEFAULTS = { zoom: 12, pitch: 50, bearing: -20 }

export const STATUS_COLORS: Record<StationStatus, string> = {
  NORMAL: '#22c55e',
  WATCH: '#eab308',
  WARNING: '#f97316',
  DANGER: '#ef4444',
  CRITICAL: '#7f1d1d',
}

export const STATUS_LABELS_RU: Record<StationStatus, string> = {
  NORMAL: 'Норма',
  WATCH: 'Наблюдение',
  WARNING: 'Предупреждение',
  DANGER: 'Опасность',
  CRITICAL: 'Критично',
}

export const FORECAST_LABELS_RU: Record<FloodForecast, string> = {
  rising: 'рост',
  falling: 'спад',
  stable: 'стабильно',
}

export const FLOOR_HEIGHT_M = 3.0

export const RIVER_PATHS = {
  ilek: {
    id: 'ilek-main',
    nameRu: 'р. Илек',
    name: 'Ilek',
    width: 10,
    color: [55, 138, 221, 220] as [number, number, number, number],
    // Ilek river: enters Aktobe from EAST, flows WEST
    // Runs along the southern edge of the city center
    // Curves through the industrial zone then exits west
    coordinates: [
      [57.3480, 50.2780],  // entry from east
      [57.3320, 50.2760],
      [57.3150, 50.2730],
      [57.2980, 50.2700],
      [57.2820, 50.2680],
      [57.2680, 50.2660],  // approaching city center south
      [57.2530, 50.2640],
      [57.2400, 50.2620],
      [57.2280, 50.2600],
      [57.2180, 50.2590],
      [57.2080, 50.2580],  // city center south - bridge area
      [57.1980, 50.2570],
      [57.1880, 50.2560],
      [57.1780, 50.2550],
      [57.1680, 50.2540],
      [57.1560, 50.2530],
      [57.1440, 50.2520],  // western industrial zone
      [57.1300, 50.2510],
      [57.1160, 50.2500],
      [57.1020, 50.2490],
      [57.0880, 50.2480],  // exits city to west
    ] as [number, number][]
  },

  khobda: {
    id: 'khobda-main', 
    nameRu: 'р. Хобда',
    name: 'Khobda',
    width: 5,
    color: [70, 155, 235, 180] as [number, number, number, number],
    // Khobda: flows from south, joins Ilek near industrial district
    coordinates: [
      [57.2300, 50.2200],  // south entry
      [57.2280, 50.2320],
      [57.2260, 50.2420],
      [57.2240, 50.2510],
      [57.2220, 50.2580],
      [57.2180, 50.2590],  // confluence with Ilek
    ] as [number, number][]
  },

  aktobe_river: {
    id: 'aktobe-river',
    nameRu: 'р. Актобе',
    name: 'Aktobe',
    width: 3,
    color: [90, 165, 240, 160] as [number, number, number, number],
    // Small stream through northern residential area
    coordinates: [
      [57.2100, 50.3200],
      [57.2050, 50.3100],
      [57.2000, 50.3000],
      [57.1980, 50.2900],
      [57.1960, 50.2800],
      [57.1950, 50.2700],
      [57.1940, 50.2620],
      [57.1920, 50.2570],  // joins Ilek
    ] as [number, number][]
  }
} as const

export const FLOOD_RISK_COLORS = {
  none: '#22c55e22',
  low: '#eab30866',
  medium: '#f9731666',
  high: '#ef444499',
  critical: '#7f1d1dcc',
}

export const STATION_IDS = [
  'ilek-aktobe',
  'ilek-ilek',
  'sazdinka-aktobe',
  'kargaly-aktobe',
  'aktobe-center',
]

// Mock gauge stations data - positioned along actual river courses
export const MOCK_STATIONS: GaugeStation[] = [
  {
    id: 'ilek-aktobe',
    name_ru: 'Илек - Актобе (верхний)',
    river: 'р. Илек',
    lat: 50.32,
    lng: 57.08,
    zero_elevation_m: 185.5,
    danger_level_cm: 400,
    warning_level_cm: 350,
    normal_level_cm: 200,
  },
  {
    id: 'ilek-ilek',
    name_ru: 'Илек - пос. Илек',
    river: 'р. Илек',
    lat: 50.275,
    lng: 57.33,
    zero_elevation_m: 178.2,
    danger_level_cm: 380,
    warning_level_cm: 320,
    normal_level_cm: 180,
  },
  {
    id: 'sazdinka-aktobe',
    name_ru: 'Саздинка - Актобе',
    river: 'р. Саздинка',
    lat: 50.34,
    lng: 57.14,
    zero_elevation_m: 190.2,
    danger_level_cm: 250,
    warning_level_cm: 200,
    normal_level_cm: 120,
  },
  {
    id: 'kargaly-aktobe',
    name_ru: 'Каргалы - Актобе',
    river: 'р. Каргалы',
    lat: 50.31,
    lng: 57.26,
    zero_elevation_m: 186.5,
    danger_level_cm: 220,
    warning_level_cm: 180,
    normal_level_cm: 100,
  },
  {
    id: 'aktobe-center',
    name_ru: 'Актобе - центр города',
    river: 'р. Илек (центр)',
    lat: 50.285,
    lng: 57.21,
    zero_elevation_m: 188.0,
    danger_level_cm: 300,
    warning_level_cm: 250,
    normal_level_cm: 150,
  },
]

// Generate mock historical readings for sparklines
function generateHistoricalReadings(
  stationId: string,
  currentLevel: number,
  currentChange: number,
  status: StationStatus,
  forecast: FloodForecast
): GaugeReading[] {
  const readings: GaugeReading[] = []
  let level = currentLevel - currentChange * 6

  for (let i = 6; i >= 0; i--) {
    const dayChange = i === 0 ? currentChange : Math.round((Math.random() - 0.3) * 15)
    level = i === 0 ? currentLevel : level + dayChange

    readings.push({
      id: `${stationId}-${i}`,
      station_id: stationId,
      level_cm: Math.max(50, level),
      change_cm: dayChange,
      flow_rate_m3s: null,
      status: i === 0 ? status : 'NORMAL',
      forecast: i === 0 ? forecast : 'stable',
      notes: null,
      bulletin_week: 15,
      bulletin_year: 2024,
      recorded_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  return readings
}

// Mock readings data (realistic April 2024 Aktobe flood peak)
export const MOCK_READINGS: Array<{
  station_id: string
  level_cm: number
  change_cm: number
  status: StationStatus
  forecast: FloodForecast
}> = [
  { station_id: 'ilek-aktobe', level_cm: 421, change_cm: 18, status: 'DANGER', forecast: 'rising' },
  { station_id: 'ilek-ilek', level_cm: 395, change_cm: 12, status: 'WARNING', forecast: 'rising' },
  { station_id: 'sazdinka-aktobe', level_cm: 187, change_cm: 5, status: 'WATCH', forecast: 'stable' },
  { station_id: 'kargaly-aktobe', level_cm: 142, change_cm: -3, status: 'NORMAL', forecast: 'falling' },
  { station_id: 'aktobe-center', level_cm: 234, change_cm: 22, status: 'CRITICAL', forecast: 'rising' },
]

// Generate full mock data with stations and readings
export function getMockStationsWithReadings() {
  return MOCK_STATIONS.map((station) => {
    const mockReading = MOCK_READINGS.find((r) => r.station_id === station.id)!
    const historicalReadings = generateHistoricalReadings(
      station.id,
      mockReading.level_cm,
      mockReading.change_cm,
      mockReading.status,
      mockReading.forecast
    )

    return {
      ...station,
      latest_reading: historicalReadings[historicalReadings.length - 1],
      readings_history: historicalReadings,
    }
  })
}

export const MOCK_GENERAL_SITUATION = `По данным Казгидромета на 15 апреля 2024 года, на территории Актюбинской области наблюдается паводковая ситуация. 
Уровень воды в реке Илек в районе города Актобе превышает опасную отметку. 
Рекомендуется соблюдать осторожность жителям прибрежных районов.`
