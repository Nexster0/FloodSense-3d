export type StationStatus = 'NORMAL' | 'WATCH' | 'WARNING' | 'DANGER' | 'CRITICAL'
export type FloodForecast = 'rising' | 'falling' | 'stable'
export type AlertSeverity = 'WARNING' | 'DANGER' | 'CRITICAL'
export type Language = 'ru' | 'kz' | 'en'

// Database Tables
export interface GaugeStation {
  id: string
  name_ru: string
  name_kz?: string
  river: string
  lat: number
  lng: number
  zero_elevation_m: number
  danger_level_cm: number
  warning_level_cm: number
  normal_level_cm: number
  basin_area_km2?: number
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface GaugeReading {
  id: string
  station_id: string
  level_cm: number
  change_cm: number
  flow_rate_m3s?: number | null
  water_temp_c?: number | null
  ice_thickness_cm?: number | null
  status: StationStatus
  forecast: FloodForecast
  notes?: string | null
  source?: string
  bulletin_week?: number | null
  bulletin_year?: number | null
  recorded_at: string
  created_at?: string
}

export interface MLForecast {
  id: string
  station_id: string
  forecast_date: string
  horizon_days: 3 | 7 | 14
  predicted_level_cm: number
  confidence_lower_cm: number
  confidence_upper_cm: number
  probability_danger?: number
  probability_warning?: number
  model_version: string
  input_features?: Record<string, unknown>
  created_at?: string
}

export interface Alert {
  id: string
  station_id: string
  severity: AlertSeverity
  level_cm: number
  threshold_cm: number
  message_ru: string
  message_kz?: string
  is_active: boolean
  acknowledged_by?: string | null
  acknowledged_at?: string | null
  created_at?: string
  resolved_at?: string | null
}

export interface Subscription {
  id: string
  email?: string | null
  telegram_username?: string | null
  telegram_chat_id?: string | null
  phone?: string | null
  station_ids: string[]
  notify_warning?: boolean
  notify_danger?: boolean
  notify_critical?: boolean
  notify_forecast?: boolean
  language?: Language
  is_active?: boolean
  verified_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface BulletinCache {
  id: string
  week_number: number
  year: number
  pdf_url?: string
  file_name?: string
  raw_json: Record<string, unknown>
  general_situation?: string
  dangerous_sections?: string[]
  ice_situation?: string
  forecast_text?: string
  parsed_by?: string
  parse_confidence?: number
  parsed_at: string
  created_at?: string
  updated_at?: string
}

export interface Building {
  id: string
  osm_id?: number
  name_ru?: string | null
  name_kz?: string | null
  address?: string | null
  district?: string | null
  lat: number
  lng: number
  footprint?: Record<string, unknown>
  floors?: number
  building_type?: string
  height_m?: number | null
  foundation_elevation_m?: number | null
  population_estimate?: number | null
  is_critical_infrastructure?: boolean
  created_at?: string
  updated_at?: string
}

export interface AdminUser {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'superadmin'
  last_login_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface ExternalDataCache {
  id: string
  source: 'glofas' | 'modis' | 'era5' | 'openmeteo'
  station_id?: string
  data_date: string
  data_json: Record<string, unknown>
  expires_at: string
  created_at?: string
}

// Composite types
export interface StationWithReading extends GaugeStation {
  latest_reading?: GaugeReading | null
  latest_forecast?: MLForecast | null
  active_alert?: Alert | null
}

export interface FloodCalculation {
  building_id: string
  flooded_meters: number
  flooded_floors: number
  flood_percentage: number
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical'
}
