# АктобеФлудСенс - Flood Monitoring System

## Overview

АктобеФлудСенс is a comprehensive real-time flood monitoring and forecasting system for Aktobe Region, Kazakhstan. It provides 3D visualization, real-time water level monitoring, ML-based forecasting, and emergency alerts for hydrological stations across major rivers.

## Features

### Core Features
- **3D Map Visualization**: Interactive CesiumJS-based 3D map with building footprints and flood risk visualization
- **Real-Time Monitoring**: Live water level data from 5+ hydrological stations
- **Gauge Network**: Detailed information on each monitoring station with historical data
- **ML Forecasting**: Machine learning-based water level predictions (3, 7, 14-day horizons)
- **Risk Analytics**: Comprehensive flood risk assessment and statistics
- **Data Export**: CSV and GeoJSON export capabilities for GIS integration

### Dashboard Features
- Live status of all monitoring stations
- Alert management and notification system
- Multi-language support (Russian, Kazakh)
- Mobile-responsive design
- Admin panel for system management

## Technology Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **3D Visualization**: CesiumJS for interactive 3D maps
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Data Fetching**: SWR for client-side state management
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS with custom design tokens

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **ORM**: Direct SQL queries with Supabase client
- **Real-time**: Supabase real-time subscriptions

### Data & AI
- **Forecasting**: XGBoost-based ML models
- **External Data**: Kazhydromet API integration
- **Data Storage**: PostgreSQL with Row Level Security
- **Caching**: Supabase with TTL policies

## Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout with navigation
│   ├── page.tsx               # 3D map main page
│   ├── analytics/             # Analytics dashboard
│   ├── gauges/                # Hydrological stations detail
│   ├── forecasts/             # ML-based forecasting
│   ├── admin/                 # Administration panel
│   └── api/                   # Backend API routes
│       ├── stations/          # Station endpoints
│       ├── readings/          # Reading data endpoints
│       ├── alerts/            # Alert management
│       ├── forecasts/         # Forecast endpoints
│       ├── subscriptions/     # Alert subscriptions
│       ├── buildings/         # Building data endpoints
│       ├── analytics/         # Analytics endpoints
│       ├── admin/stats        # Admin statistics
│       ├── export-csv/        # CSV export
│       └── export-geojson/    # GeoJSON export
├── components/
│   ├── navigation.tsx         # Main navigation bar
│   ├── map/                   # Map components
│   ├── alerts/                # Alert components
│   └── ui/                    # shadcn/ui components
├── lib/
│   ├── types.ts              # TypeScript type definitions
│   ├── supabase/             # Supabase client setup
│   └── constants.ts          # Constants and mock data
├── hooks/
│   └── use-flood-simulation/ # Flood risk calculation hooks
├── scripts/
│   └── setup-db.js          # Database initialization
└── public/
    └── assets/              # Images and static files
```

## Database Schema

### Core Tables
- **gauge_stations**: Hydrological monitoring stations
- **gauge_readings**: Water level and flow measurements
- **ml_forecasts**: ML-generated forecasts
- **alerts**: Active flood warnings
- **subscriptions**: User notification subscriptions
- **buildings**: Building footprints and metadata
- **bulletin_cache**: Cached PDF bulletins
- **admin_users**: Admin access control

## API Endpoints

### Stations & Readings
- `GET /api/stations` - List all stations
- `GET /api/readings?station_id=X&days=30` - Station readings
- `POST /api/readings` - Add new reading

### Forecasts
- `GET /api/forecasts?station_id=X&horizon=7` - Get forecasts
- `POST /api/forecasts` - Create forecast

### Alerts
- `GET /api/alerts?station_id=X&active=true` - Get alerts
- `POST /api/alerts` - Create alert
- `PATCH /api/alerts` - Update alert

### Data Export
- `GET /api/export-csv` - Export as CSV
- `GET /api/export-geojson` - Export as GeoJSON

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/buildings?bounds=...` - Buildings in area

## Setup & Installation

### Prerequisites
- Node.js 18+
- pnpm
- Supabase project
- Vercel deployment (optional)

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd flood-sense
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Initialize database**
```bash
pnpm run setup-db
```

5. **Start development server**
```bash
pnpm dev
```

Visit `http://localhost:3000`

## Key Pages

| Page | Route | Purpose |
|------|-------|---------|
| 3D Map | `/` | Interactive map with real-time data |
| Analytics | `/analytics` | Statistical analysis and charts |
| Gauges | `/gauges` | Detailed station information |
| Forecasts | `/forecasts` | ML-based flood predictions |
| Admin | `/admin` | System management |

## Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public API key
SUPABASE_SERVICE_ROLE_KEY         # Service role (server-only)
CESIUM_ION_DEFAULT_ACCESS_TOKEN   # CesiumJS token
KAZHYDROMET_API_URL               # Optional: External API
```

### Flood Risk Levels
- **NORMAL**: < 150 cm
- **WATCH**: 150-280 cm
- **WARNING**: 280-320 cm
- **DANGER**: 320-350 cm
- **CRITICAL**: > 350 cm

## Data Sources

1. **Hydrological Stations**: Real-time measurements from monitoring network
2. **Kazhydromet API**: National hydrological service data
3. **Building Data**: OpenStreetMap (OSM)
4. **Weather**: Integration with meteorological services
5. **ML Forecasts**: Internal XGBoost models

## Performance Optimization

- Next.js 16 with Turbopack bundler
- React Compiler for automatic optimization
- SWR data fetching with cache invalidation
- CesiumJS LOD optimization for large datasets
- Supabase real-time subscriptions
- CDN-optimized asset delivery

## Deployment

### Vercel Deployment
```bash
vercel deploy
```

### Docker (Optional)
```bash
docker build -t flood-sense .
docker run -p 3000:3000 flood-sense
```

## Security

- Row-Level Security (RLS) policies on all tables
- Authentication via Supabase Auth
- Service role key restricted to backend
- Input validation on all API endpoints
- CORS protection
- Environment variable management

## Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Commit changes: `git commit -m 'Add amazing feature'`
3. Push to branch: `git push origin feature/amazing-feature`
4. Open Pull Request

## Monitoring & Alerts

The system provides multiple notification channels:
- Email alerts for subscribed users
- Real-time dashboard notifications
- Telegram bot integration (optional)
- SMS alerts for critical events
- Archive of historical alerts

## Troubleshooting

### Database Connection Issues
- Verify Supabase credentials in `.env.local`
- Check network connectivity to Supabase
- Ensure service role key has proper permissions

### 3D Map Not Loading
- Verify CesiumJS token is set
- Check browser console for CORS errors
- Fall back to 2D map if needed

### Data Not Updating
- Check API rate limits
- Verify Supabase table permissions
- Restart development server

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please open an issue on GitHub or contact support@floodsense.kz

## Changelog

### v1.0.0
- Initial release with full flood monitoring system
- Real-time data integration
- ML-based forecasting
- Multi-page dashboard
- 3D visualization
