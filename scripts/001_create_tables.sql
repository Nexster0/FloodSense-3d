-- FloodSense 3D - Database Schema for Aktobe Flood Monitoring
-- Create tables without dropping to avoid permission issues

CREATE TABLE IF NOT EXISTS public.gauge_stations (
  id TEXT PRIMARY KEY,
  name_ru TEXT NOT NULL,
  name_kz TEXT,
  river TEXT NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  zero_elevation_m DECIMAL(8, 2) NOT NULL DEFAULT 0,
  danger_level_cm INTEGER NOT NULL,
  warning_level_cm INTEGER NOT NULL,
  normal_level_cm INTEGER NOT NULL,
  basin_area_km2 DECIMAL(12, 2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gauge_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES public.gauge_stations(id) ON DELETE CASCADE,
  level_cm INTEGER NOT NULL,
  change_cm INTEGER NOT NULL DEFAULT 0,
  flow_rate_m3s DECIMAL(10, 2),
  water_temp_c DECIMAL(5, 2),
  ice_thickness_cm INTEGER,
  status TEXT NOT NULL CHECK (status IN ('NORMAL', 'WATCH', 'WARNING', 'DANGER', 'CRITICAL')) DEFAULT 'NORMAL',
  forecast TEXT NOT NULL CHECK (forecast IN ('rising', 'falling', 'stable')) DEFAULT 'stable',
  notes TEXT,
  source TEXT DEFAULT 'manual',
  bulletin_week INTEGER,
  bulletin_year INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id, recorded_at)
);

CREATE TABLE IF NOT EXISTS public.ml_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES public.gauge_stations(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  horizon_days INTEGER NOT NULL CHECK (horizon_days IN (3, 7, 14)),
  predicted_level_cm INTEGER NOT NULL,
  confidence_lower_cm INTEGER NOT NULL,
  confidence_upper_cm INTEGER NOT NULL,
  probability_danger DECIMAL(5, 4) CHECK (probability_danger >= 0 AND probability_danger <= 1),
  probability_warning DECIMAL(5, 4) CHECK (probability_warning >= 0 AND probability_warning <= 1),
  model_version TEXT NOT NULL DEFAULT 'v1.0',
  input_features JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id, forecast_date, horizon_days)
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT NOT NULL REFERENCES public.gauge_stations(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('WARNING', 'DANGER', 'CRITICAL')),
  level_cm INTEGER NOT NULL,
  threshold_cm INTEGER NOT NULL,
  message_ru TEXT NOT NULL,
  message_kz TEXT,
  is_active BOOLEAN DEFAULT true,
  acknowledged_by TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  telegram_username TEXT,
  telegram_chat_id TEXT,
  phone TEXT,
  station_ids TEXT[] NOT NULL DEFAULT '{}',
  notify_warning BOOLEAN DEFAULT true,
  notify_danger BOOLEAN DEFAULT true,
  notify_critical BOOLEAN DEFAULT true,
  notify_forecast BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ru' CHECK (language IN ('ru', 'kz', 'en')),
  is_active BOOLEAN DEFAULT true,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT email_or_telegram CHECK (email IS NOT NULL OR telegram_username IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.bulletin_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  pdf_url TEXT,
  file_name TEXT,
  raw_json JSONB NOT NULL,
  general_situation TEXT,
  dangerous_sections TEXT[] DEFAULT ARRAY[]::TEXT[],
  ice_situation TEXT,
  forecast_text TEXT,
  parsed_by TEXT DEFAULT 'claude',
  parse_confidence DECIMAL(5, 4),
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(week_number, year)
);

CREATE TABLE IF NOT EXISTS public.buildings (
  id TEXT PRIMARY KEY,
  osm_id BIGINT,
  name_ru TEXT,
  name_kz TEXT,
  address TEXT,
  district TEXT,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  footprint JSONB,
  floors INTEGER DEFAULT 2,
  building_type TEXT,
  height_m DECIMAL(8, 2),
  foundation_elevation_m DECIMAL(8, 2),
  population_estimate INTEGER,
  is_critical_infrastructure BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.external_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('glofas', 'modis', 'era5', 'openmeteo')),
  station_id TEXT REFERENCES public.gauge_stations(id) ON DELETE CASCADE,
  data_date DATE NOT NULL,
  data_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source, station_id, data_date)
);

ALTER TABLE public.gauge_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gauge_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_data_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "gauge_stations_select_public" ON public.gauge_stations;
CREATE POLICY "gauge_stations_select_public" ON public.gauge_stations FOR SELECT USING (true);

DROP POLICY IF EXISTS "gauge_readings_select_public" ON public.gauge_readings;
CREATE POLICY "gauge_readings_select_public" ON public.gauge_readings FOR SELECT USING (true);

DROP POLICY IF EXISTS "ml_forecasts_select_public" ON public.ml_forecasts;
CREATE POLICY "ml_forecasts_select_public" ON public.ml_forecasts FOR SELECT USING (true);

DROP POLICY IF EXISTS "alerts_select_public" ON public.alerts;
CREATE POLICY "alerts_select_public" ON public.alerts FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "bulletin_cache_select_public" ON public.bulletin_cache;
CREATE POLICY "bulletin_cache_select_public" ON public.bulletin_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "buildings_select_public" ON public.buildings;
CREATE POLICY "buildings_select_public" ON public.buildings FOR SELECT USING (true);

DROP POLICY IF EXISTS "external_data_cache_select_public" ON public.external_data_cache;
CREATE POLICY "external_data_cache_select_public" ON public.external_data_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscriptions_insert_public" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_public" ON public.subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_users_select_authenticated" ON public.admin_users;
CREATE POLICY "admin_users_select_authenticated" ON public.admin_users FOR SELECT USING (auth.uid() = id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gauge_readings_station_id ON public.gauge_readings(station_id);
CREATE INDEX IF NOT EXISTS idx_gauge_readings_recorded_at ON public.gauge_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_gauge_readings_status ON public.gauge_readings(status);
CREATE INDEX IF NOT EXISTS idx_ml_forecasts_station_date ON public.ml_forecasts(station_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_ml_forecasts_horizon ON public.ml_forecasts(horizon_days);
CREATE INDEX IF NOT EXISTS idx_alerts_station_id ON public.alerts(station_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON public.alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_bulletin_cache_week_year ON public.bulletin_cache(week_number, year);
CREATE INDEX IF NOT EXISTS idx_buildings_district ON public.buildings(district);
CREATE INDEX IF NOT EXISTS idx_buildings_type ON public.buildings(building_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON public.subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_external_data_source ON public.external_data_cache(source, data_date);

-- Seed data
INSERT INTO public.gauge_stations (id, name_ru, name_kz, river, lat, lng, zero_elevation_m, danger_level_cm, warning_level_cm, normal_level_cm, basin_area_km2, description)
VALUES 
  ('ilek-aktobe', 'р. Илек — Актобе (верхний)', 'Елек өзені — Ақтөбе (жоғары)', 'Илек', 50.2839, 57.1670, 189.5, 350, 280, 150, 15200, 'Основной гидропост на реке Илек в верхней части города Актобе'),
  ('ilek-east', 'р. Илек — Актобе (восточный)', 'Елек өзені — Ақтөбе (шығыс)', 'Илек', 50.2743, 57.2156, 187.2, 320, 260, 140, 15800, 'Гидропост в восточной части города'),
  ('aktobe-center', 'р. Илек — Актобе (центр)', 'Елек өзені — Ақтөбе (орталық)', 'Илек', 50.2798, 57.2021, 188.0, 340, 270, 145, 15500, 'Центральный гидропост города'),
  ('khobda-kandyag', 'р. Хобда — Кандыагаш', 'Қобда өзені — Қандыағаш', 'Хобда', 49.4712, 57.4231, 145.3, 280, 220, 100, 8900, 'Гидропост на реке Хобда у города Кандыагаш'),
  ('uil-uil', 'р. Уил — Уил', 'Ойыл өзені — Ойыл', 'Уил', 49.0714, 54.6892, 112.8, 260, 200, 90, 6300, 'Гидропост на реке Уил')
ON CONFLICT (id) DO UPDATE SET
  name_ru = EXCLUDED.name_ru,
  name_kz = EXCLUDED.name_kz,
  danger_level_cm = EXCLUDED.danger_level_cm,
  warning_level_cm = EXCLUDED.warning_level_cm,
  normal_level_cm = EXCLUDED.normal_level_cm,
  updated_at = now();

-- Demo readings
INSERT INTO public.gauge_readings (station_id, level_cm, change_cm, flow_rate_m3s, status, forecast, recorded_at)
VALUES 
  ('ilek-aktobe', 287, 12, 45.2, 'DANGER', 'rising', now() - interval '1 hour'),
  ('ilek-east', 198, 5, 38.1, 'WARNING', 'rising', now() - interval '1 hour'),
  ('aktobe-center', 312, 8, 52.3, 'CRITICAL', 'rising', now() - interval '1 hour'),
  ('khobda-kandyag', 134, 2, 18.5, 'WATCH', 'stable', now() - interval '1 hour'),
  ('uil-uil', 89, -1, 12.1, 'NORMAL', 'falling', now() - interval '1 hour')
ON CONFLICT (station_id, recorded_at) DO NOTHING;
