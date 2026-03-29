# Database Setup Instructions

The database tables for АктобеФлудСенс need to be created in Supabase. Follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `001_create_tables.sql` into the editor
5. Click **Run**

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

## Table Structure

The schema creates 4 main tables:

- **gauge_stations**: Master data for all monitoring stations
- **gauge_readings**: Time-series data for water levels
- **bulletin_cache**: Cached flood bulletins with parsed data
- **alerts**: Active alerts for dangerous water levels

All tables have Row Level Security (RLS) enabled with public read access policies.

## Verification

After running the SQL, you can verify the tables were created by checking the **Tables** section in the Supabase dashboard.

All tables should appear under `public` schema.
