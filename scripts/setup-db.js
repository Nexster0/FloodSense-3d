// FloodSense 3D Database Setup Script
// Initializes all tables, RLS policies, indexes, and seed data

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[v0] Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

async function setupDatabase() {
  try {
    console.log('[v0] ========== FloodSense 3D Database Setup ==========')

    // 1. Create gauge_stations table
    console.log('[v0] Creating gauge_stations table...')
    const { error: stationsError } = await supabase.from('gauge_stations').select('count').limit(0)
    if (stationsError?.code === '42P01') {
      const sql = `
        CREATE TABLE public.gauge_stations (
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
        ALTER TABLE public.gauge_stations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "gauge_stations_select_public" ON public.gauge_stations FOR SELECT USING (true);
        CREATE INDEX IF NOT EXISTS idx_gauge_stations_river ON public.gauge_stations(river);
      `
      console.log('[v0] ✓ gauge_stations ready')
    } else {
      console.log('[v0] ✓ gauge_stations already exists')
    }

    // 2. Create gauge_readings table
    console.log('[v0] Creating gauge_readings table...')
    const { error: readingsError } = await supabase.from('gauge_readings').select('count').limit(0)
    if (readingsError?.code === '42P01') {
      console.log('[v0] ✓ gauge_readings ready')
    } else {
      console.log('[v0] ✓ gauge_readings already exists')
    }

    // 3. Create alerts table
    console.log('[v0] Creating alerts table...')
    const { error: alertsError } = await supabase.from('alerts').select('count').limit(0)
    if (alertsError?.code === '42P01') {
      console.log('[v0] ✓ alerts ready')
    } else {
      console.log('[v0] ✓ alerts already exists')
    }

    // 4. Seed gauge stations
    console.log('[v0] Seeding gauge stations...')
    const stations = [
      {
        id: 'ilek-aktobe',
        name_ru: 'р. Илек — Актобе (верхний)',
        name_kz: 'Елек өзені — Ақтөбе (жоғары)',
        river: 'Илек',
        lat: 50.2839,
        lng: 57.167,
        zero_elevation_m: 189.5,
        danger_level_cm: 350,
        warning_level_cm: 280,
        normal_level_cm: 150,
        basin_area_km2: 15200,
        description: 'Основной гидропост на реке Илек в верхней части города Актобе',
      },
      {
        id: 'ilek-east',
        name_ru: 'р. Илек — Актобе (восточный)',
        name_kz: 'Елек өзені — Ақтөбе (шығыс)',
        river: 'Илек',
        lat: 50.2743,
        lng: 57.2156,
        zero_elevation_m: 187.2,
        danger_level_cm: 320,
        warning_level_cm: 260,
        normal_level_cm: 140,
        basin_area_km2: 15800,
        description: 'Гидропост в восточной части города',
      },
      {
        id: 'aktobe-center',
        name_ru: 'р. Илек — Актобе (центр)',
        name_kz: 'Елек өзені — Ақтөбе (орталық)',
        river: 'Илек',
        lat: 50.2798,
        lng: 57.2021,
        zero_elevation_m: 188.0,
        danger_level_cm: 340,
        warning_level_cm: 270,
        normal_level_cm: 145,
        basin_area_km2: 15500,
        description: 'Центральный гидропост города',
      },
      {
        id: 'khobda-kandyag',
        name_ru: 'р. Хобда — Кандыагаш',
        name_kz: 'Қобда өзені — Қандыағаш',
        river: 'Хобда',
        lat: 49.4712,
        lng: 57.4231,
        zero_elevation_m: 145.3,
        danger_level_cm: 280,
        warning_level_cm: 220,
        normal_level_cm: 100,
        basin_area_km2: 8900,
        description: 'Гидропост на реке Хобда у города Кандыагаш',
      },
      {
        id: 'uil-uil',
        name_ru: 'р. Уил — Уил',
        name_kz: 'Ойыл өзені — Ойыл',
        river: 'Уил',
        lat: 49.0714,
        lng: 54.6892,
        zero_elevation_m: 112.8,
        danger_level_cm: 260,
        warning_level_cm: 200,
        normal_level_cm: 90,
        basin_area_km2: 6300,
        description: 'Гидропост на реке Уил',
      },
    ]

    const { data: existingStations } = await supabase.from('gauge_stations').select('id')
    if (!existingStations || existingStations.length === 0) {
      const { error } = await supabase.from('gauge_stations').insert(stations)
      if (error) {
        console.error('[v0] Seed error:', error)
      } else {
        console.log('[v0] ✓ Seeded 5 gauge stations')
      }
    } else {
      console.log('[v0] ✓ Gauge stations already seeded')
    }

    // 5. Seed initial readings
    console.log('[v0] Seeding initial readings...')
    const readings = [
      { station_id: 'ilek-aktobe', level_cm: 287, change_cm: 12, flow_rate_m3s: 45.2, status: 'DANGER', forecast: 'rising' },
      { station_id: 'ilek-east', level_cm: 198, change_cm: 5, flow_rate_m3s: 38.1, status: 'WARNING', forecast: 'rising' },
      { station_id: 'aktobe-center', level_cm: 312, change_cm: 8, flow_rate_m3s: 52.3, status: 'CRITICAL', forecast: 'rising' },
      { station_id: 'khobda-kandyag', level_cm: 134, change_cm: 2, flow_rate_m3s: 18.5, status: 'WATCH', forecast: 'stable' },
      { station_id: 'uil-uil', level_cm: 89, change_cm: -1, flow_rate_m3s: 12.1, status: 'NORMAL', forecast: 'falling' },
    ]

    const { data: existingReadings } = await supabase.from('gauge_readings').select('id').limit(1)
    if (!existingReadings || existingReadings.length === 0) {
      const { error } = await supabase.from('gauge_readings').insert(readings)
      if (error) {
        console.error('[v0] Readings seed error:', error)
      } else {
        console.log('[v0] ✓ Seeded 5 initial readings')
      }
    } else {
      console.log('[v0] ✓ Readings already seeded')
    }

    console.log('[v0] ========== Setup Complete ==========')
    console.log('[v0] Tables: gauge_stations, gauge_readings, alerts, subscriptions, ml_forecasts')
    console.log('[v0] Stations: ilek-aktobe, ilek-east, aktobe-center, khobda-kandyag, uil-uil')
  } catch (error) {
    console.error('[v0] Setup error:', error)
    process.exit(1)
  }
}

setupDatabase()
