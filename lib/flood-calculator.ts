import type { Building, GaugeStation, GaugeReading, FloodCalculation, RiverFeature } from './types'
import { FLOOR_HEIGHT_M, RIVER_PATHS } from './constants'

// Convert station reading to absolute water elevation
export function getAbsoluteWaterLevel(
  station: GaugeStation,
  reading: GaugeReading
): number {
  return station.zero_elevation_m + reading.level_cm / 100
}

// Helper: get minimum distance from building to rivers (in degrees)
function getMinDistanceToRivers(
  lng: number,
  lat: number,
  rivers?: RiverFeature[]
): number {
  if (!rivers || rivers.length === 0) return Infinity
  
  let minDist = Infinity
  for (const river of rivers) {
    for (const [rlng, rlat] of river.coordinates) {
      const d = Math.sqrt((lng - rlng) ** 2 + (lat - rlat) ** 2)
      if (d < minDist) minDist = d
    }
  }
  return minDist
}

// Calculate flood impact on a single building
export function calculateBuildingFlood(
  building: Building,
  absoluteWaterLevelM: number,
  riverPaths?: RiverFeature[]
): FloodCalculation {
  const foundationElevation = building.foundation_elevation_m ?? 205 // Aktobe avg
  let floodedMeters = Math.max(0, absoluteWaterLevelM - foundationElevation)

  // If we have river paths, attenuate flood by distance from river
  // Buildings far from the river flood less than buildings right on the bank
  if (riverPaths && riverPaths.length > 0 && floodedMeters > 0) {
    const minDistDeg = getMinDistanceToRivers(building.lng, building.lat, riverPaths)
    // Roughly: 0.001 deg ≈ 100m. Flood attenuates with distance.
    if (minDistDeg < Infinity) {
      const distanceM = minDistDeg * 111000
      // Full flooding up to 500m from river, then attenuates over 2km
      const attenuationFactor = Math.max(0, 1 - Math.max(0, distanceM - 500) / 2000)
      floodedMeters = floodedMeters * attenuationFactor
    }
  }

  const totalHeightM = (building.floors ?? 2) * FLOOR_HEIGHT_M
  const floodedFloors = floodedMeters / FLOOR_HEIGHT_M
  const floodPercentage = Math.min(100, (floodedMeters / totalHeightM) * 100)

  let riskLevel: FloodCalculation['risk_level'] = 'none'
  if (floodedMeters > 0.05) riskLevel = 'low'
  if (floodedMeters > 1.0) riskLevel = 'medium'
  if (floodedMeters > 2.5) riskLevel = 'high'
  if (floodedMeters > 5.0) riskLevel = 'critical'

  return {
    building_id: building.id,
    flooded_meters: Math.round(floodedMeters * 100) / 100,
    flooded_floors: Math.round(floodedFloors * 10) / 10,
    flood_percentage: Math.round(floodPercentage),
    risk_level: riskLevel,
  }
}

// Get building extrusion color based on flood risk
export function getFloodColor(
  calc: FloodCalculation
): [number, number, number, number] {
  switch (calc.risk_level) {
    case 'none':
      return [180, 180, 180, 200]
    case 'low':
      return [234, 179, 8, 220]
    case 'medium':
      return [249, 115, 22, 230]
    case 'high':
      return [239, 68, 68, 240]
    case 'critical':
      return [127, 29, 29, 255]
    default:
      return [120, 120, 120, 180]
  }
}

// Flood water surface color
export const WATER_COLOR: [number, number, number, number] = [55, 138, 221, 120]
