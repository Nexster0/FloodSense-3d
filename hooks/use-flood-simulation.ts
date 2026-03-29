'use client'

import { useState, useMemo, useEffect } from 'react'
import type { Building, StationWithReading, RiverFeature } from '@/lib/types'
import { calculateBuildingFlood } from '@/lib/flood-calculator'
import { generateFloodZones, calculateAbsoluteWaterLevel, type FloodZone } from '@/lib/flood-model'

export function useFloodSimulation(
  buildings: Building[],
  stations: StationWithReading[],
  rivers: RiverFeature[] = []
) {
  // Real water level from the most critical station (Ilek - Aktobe)
  const realWaterLevelM = useMemo(() => {
    if (!stations.length) return 189 // Default Aktobe Ilek level
    
    // Find the main station (Ilek-Aktobe) or use the highest level
    const mainStation = stations.find(s => s.id === 'ilek-aktobe')
    if (mainStation?.latest_reading) {
      return calculateAbsoluteWaterLevel(mainStation)
    }
    
    return stations.reduce((max, s) => {
      if (!s.latest_reading) return max
      const abs = calculateAbsoluteWaterLevel(s)
      return Math.max(max, abs)
    }, 189)
  }, [stations])

  const [simulationOffset, setSimulationOffset] = useState(0) // -3 to +5 meters offset
  const [isSimulating, setIsSimulating] = useState(false)

  const effectiveWaterLevel = isSimulating
    ? realWaterLevelM + simulationOffset
    : realWaterLevelM

  // Generate flood zones based on station data and simulation offset
  const floodZones = useMemo(() => {
    return generateFloodZones(stations, isSimulating ? simulationOffset : 0)
  }, [stations, simulationOffset, isSimulating])

  // Calculate which buildings are flooded based on their location relative to flood zones
  const buildingCalculations = useMemo(() => {
    return buildings.map((b) => {
      // Check if building is in any flood zone
      const inFloodZone = floodZones.find((zone) => {
        return isPointInPolygon([b.lng, b.lat], zone.polygon)
      })

      if (inFloodZone && inFloodZone.waterDepth > 0) {
        // Building is flooded - calculate based on flood zone depth
        const foundationElev = b.foundation_elevation_m ?? 185
        const waterDepthAtBuilding = inFloodZone.waterDepth
        
        return {
          building_id: b.id,
          flooded_meters: waterDepthAtBuilding,
          flooded_floors: Math.ceil(waterDepthAtBuilding / 3),
          flood_percentage: Math.min(100, (waterDepthAtBuilding / ((b.floors || 2) * 3)) * 100),
          risk_level: waterDepthAtBuilding > 2 ? 'critical' as const :
            waterDepthAtBuilding > 1 ? 'high' as const :
            waterDepthAtBuilding > 0.5 ? 'medium' as const :
            waterDepthAtBuilding > 0 ? 'low' as const : 'none' as const,
        }
      }

      // Not in flood zone - use standard calculation with river proximity
      return calculateBuildingFlood(b, effectiveWaterLevel, rivers)
    })
  }, [buildings, floodZones, effectiveWaterLevel, rivers])

  // Calculate stats including flood zone information
  const stats = useMemo(() => {
    const flooded = buildingCalculations.filter((c) => c.risk_level !== 'none')
    
    // Calculate total flooded area based on flood zones
    const totalFloodedArea = floodZones.reduce((sum, zone) => {
      // Rough polygon area calculation
      return sum + calculatePolygonArea(zone.polygon)
    }, 0)

    return {
      total: buildings.length,
      flooded: flooded.length,
      critical: flooded.filter((c) => c.risk_level === 'critical').length,
      high: flooded.filter((c) => c.risk_level === 'high').length,
      medium: flooded.filter((c) => c.risk_level === 'medium').length,
      low: flooded.filter((c) => c.risk_level === 'low').length,
      floodedPercent: Math.round(
        (flooded.length / Math.max(buildings.length, 1)) * 100
      ),
      floodZoneCount: floodZones.length,
      totalFloodedAreaKm2: totalFloodedArea,
    }
  }, [buildingCalculations, buildings.length, floodZones])

  return {
    realWaterLevelM,
    effectiveWaterLevel,
    simulationOffset,
    setSimulationOffset,
    isSimulating,
    setIsSimulating,
    buildingCalculations,
    stats,
    floodZones,
  }
}

// Check if a point is inside a polygon using ray casting
function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  let inside = false
  const [x, y] = point

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

// Calculate polygon area in km²
function calculatePolygonArea(polygon: [number, number][]): number {
  if (polygon.length < 3) return 0
  
  let area = 0
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length
    area += polygon[i][0] * polygon[j][1]
    area -= polygon[j][0] * polygon[i][1]
  }
  
  // Convert from degrees² to km² (approximate at Aktobe latitude)
  const latFactor = Math.cos(50.28 * Math.PI / 180) * 111.32
  const lngFactor = 111.32
  
  return Math.abs(area / 2) * latFactor * lngFactor
}
