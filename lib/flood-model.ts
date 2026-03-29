/**
 * Physically-based flood model for Aktobe region
 * Models water flowing from gauge stations along river paths
 * based on terrain elevation and hydrological data
 * 
 * Geographic data sources:
 * - Ilek River: flows from Mugodzhar Hills (51°30'N 53°22'E) westward through Aktobe (50°17'N 57°14'E)
 * - Khobda River: tributary, flows near Kandyagash (49°27'N 57°25'E)  
 * - Uil River: source at 49°32'N 56°48'E, mouth at 48°32'N 52°24'E
 */

import type { StationWithReading } from './types'

// River segment definition with path coordinates
export interface RiverSegment {
  id: string
  name: string
  stationId: string
  // Path coordinates [lng, lat, baseElevation][]
  path: [number, number, number][]
  // River width at this segment (meters)
  width: number
  // Bank elevation above river bed
  bankHeight: number
}

// Flood zone polygon with depth
export interface FloodZone {
  id: string
  stationId: string
  riverName: string
  // Polygon coordinates [lng, lat][]
  polygon: [number, number][]
  // Base terrain elevation (m)
  baseElevation: number
  // Current water depth above terrain (m)
  waterDepth: number
  // Flood severity
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Aktobe region rivers with accurate geographic coordinates
// Based on real geographic data from Wikipedia and mapping sources
// Coordinates format: [longitude, latitude, elevation_meters]
export const AKTOBE_RIVERS: RiverSegment[] = [
  {
    // Main Ilek River through Aktobe city
    // Aktobe city center: 50.2797°N, 57.2072°E
    // River flows generally west to east through the city
    id: 'ilek-aktobe',
    name: 'р. Илек (Ақтөбе)',
    stationId: 'ilek-aktobe',
    width: 60,
    bankHeight: 4.0,
    path: [
      // Upstream - west of city
      [57.08, 50.265, 198],
      [57.10, 50.270, 196],
      [57.12, 50.274, 194],
      [57.14, 50.277, 192],
      // Approaching city center
      [57.16, 50.279, 190],
      [57.17, 50.280, 189],
      // City center area - station location
      [57.18, 50.281, 188],
      [57.19, 50.282, 187],
      [57.20, 50.283, 186],
      [57.2072, 50.2797, 185], // Near Aktobe-Aktobe station
      // Downstream - east of city
      [57.22, 50.282, 184],
      [57.24, 50.284, 183],
      [57.26, 50.286, 182],
      [57.28, 50.288, 181],
      [57.30, 50.290, 180],
    ],
  },
  {
    // Ilek River upstream section (south approach)
    id: 'ilek-south',
    name: 'р. Илек (южный)',
    stationId: 'ilek-aktobe',
    width: 50,
    bankHeight: 3.5,
    path: [
      // Flowing from south/southeast toward city
      [57.15, 50.24, 205],
      [57.14, 50.25, 202],
      [57.12, 50.26, 199],
      [57.10, 50.265, 197],
      [57.08, 50.265, 196],
    ],
  },
  {
    // Ilek River near Ilek settlement (downstream, toward Russia)
    // Station at approximately 50.5167°N, 57.3833°E
    id: 'ilek-settlement',
    name: 'р. Илек (пос. Илек)',
    stationId: 'ilek-ilek',
    width: 80,
    bankHeight: 4.5,
    path: [
      [57.30, 50.45, 175],
      [57.32, 50.47, 173],
      [57.34, 50.49, 171],
      [57.36, 50.50, 169],
      [57.3833, 50.5167, 167], // Station location
      [57.40, 50.53, 165],
      [57.42, 50.55, 163],
      [57.44, 50.57, 161],
    ],
  },
  {
    // Khobda River near Kandyagash
    // Kandyagash coordinates: 49.4580°N, 57.4207°E
    id: 'khobda-main',
    name: 'р. Хобда',
    stationId: 'khobda-kandyag',
    width: 35,
    bankHeight: 2.8,
    path: [
      // Upstream - south of Kandyagash
      [57.35, 49.40, 180],
      [57.37, 49.42, 177],
      [57.39, 49.44, 174],
      [57.41, 49.45, 171],
      // Near Kandyagash
      [57.4207, 49.4580, 168], // Station location
      // Downstream - north toward Ilek confluence
      [57.44, 49.48, 165],
      [57.46, 49.50, 162],
      [57.48, 49.52, 159],
      [57.50, 49.54, 156],
    ],
  },
  {
    // Uil River - flows westward
    // Source: 49°32'N 56°48'E, Mouth: 48°32'N 52°24'E
    // Uil settlement station: approximately 49.0667°N, 54.6833°E
    id: 'uil-main',
    name: 'р. Уил',
    stationId: 'uil-uil',
    width: 30,
    bankHeight: 2.5,
    path: [
      // Upper section near source
      [56.80, 49.53, 220],
      [56.60, 49.45, 210],
      [56.40, 49.35, 200],
      [56.20, 49.25, 190],
      [56.00, 49.18, 180],
      // Middle section
      [55.80, 49.14, 170],
      [55.60, 49.11, 162],
      [55.40, 49.09, 155],
      [55.20, 49.08, 148],
      [55.00, 49.07, 142],
      // Near Uil settlement station
      [54.80, 49.068, 138],
      [54.6833, 49.0667, 135], // Station location
      [54.50, 49.05, 130],
      // Lower section toward mouth
      [54.20, 49.00, 120],
      [53.90, 48.90, 110],
      [53.60, 48.75, 100],
      [53.30, 48.60, 90],
      [53.00, 48.50, 80],
      [52.70, 48.45, 70],
      [52.40, 48.53, 60], // Mouth area
    ],
  },
  {
    // Small tributary in Aktobe city (Sazdinka stream)
    id: 'sazdinka',
    name: 'р. Сазды',
    stationId: 'aktobe-aktobe',
    width: 15,
    bankHeight: 1.5,
    path: [
      [57.22, 50.26, 195],
      [57.21, 50.27, 192],
      [57.20, 50.275, 190],
      [57.19, 50.278, 188],
      [57.18, 50.280, 186], // Confluence with Ilek
    ],
  },
]

// Calculate water level in meters above sea level from station reading
export function calculateAbsoluteWaterLevel(
  station: StationWithReading
): number {
  const levelCm = station.latest_reading?.level_cm ?? 0
  const zeroElevation = station.zero_elevation_m
  return zeroElevation + levelCm / 100
}

// Calculate flood overflow based on water level vs bank height
export function calculateFloodOverflow(
  waterLevelM: number,
  riverSegment: RiverSegment,
  simulationOffset: number = 0
): {
  isFlooding: boolean
  overflowDepth: number
  floodWidth: number
} {
  // Get average river bed elevation
  const avgBedElevation =
    riverSegment.path.reduce((sum, p) => sum + p[2], 0) / riverSegment.path.length

  // Bank top elevation
  const bankTopElevation = avgBedElevation + riverSegment.bankHeight

  // Effective water level with simulation offset
  const effectiveWaterLevel = waterLevelM + simulationOffset

  // Check if water exceeds bank
  const isFlooding = effectiveWaterLevel > bankTopElevation
  const overflowDepth = isFlooding ? effectiveWaterLevel - bankTopElevation : 0

  // Flood width expands based on depth and terrain
  // Uses square root for more realistic expansion
  const floodWidth = isFlooding
    ? riverSegment.width + Math.sqrt(overflowDepth) * 150
    : 0

  return { isFlooding, overflowDepth, floodWidth }
}

// Generate flood zone polygons based on station data
export function generateFloodZones(
  stations: StationWithReading[],
  simulationOffset: number = 0
): FloodZone[] {
  const floodZones: FloodZone[] = []

  for (const river of AKTOBE_RIVERS) {
    const station = stations.find((s) => s.id === river.stationId)
    if (!station) continue

    const waterLevel = calculateAbsoluteWaterLevel(station)
    const { isFlooding, overflowDepth, floodWidth } = calculateFloodOverflow(
      waterLevel,
      river,
      simulationOffset
    )

    if (!isFlooding && simulationOffset <= 0) continue

    // Generate flood polygon along river path
    // Convert meters to approximate degrees (1 degree ≈ 111km at equator, less at higher latitudes)
    const metersToDegreesLat = 1 / 111000
    const metersToDegreesLng = 1 / (111000 * Math.cos(50 * Math.PI / 180)) // Adjust for latitude ~50°N

    const halfWidthLat = (floodWidth / 2) * metersToDegreesLat
    const halfWidthLng = (floodWidth / 2) * metersToDegreesLng

    // Create polygon by buffering the river path
    const leftBank: [number, number][] = []
    const rightBank: [number, number][] = []

    for (let i = 0; i < river.path.length; i++) {
      const [lng, lat, elev] = river.path[i]

      // Calculate direction to next point for perpendicular offset
      let perpLng = 0
      let perpLat = 1

      if (i < river.path.length - 1) {
        const dx = river.path[i + 1][0] - lng
        const dy = river.path[i + 1][1] - lat
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
          // Perpendicular direction (rotate 90 degrees)
          perpLng = -dy / len
          perpLat = dx / len
        }
      } else if (i > 0) {
        // Use previous direction for last point
        const dx = lng - river.path[i - 1][0]
        const dy = lat - river.path[i - 1][1]
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
          perpLng = -dy / len
          perpLat = dx / len
        }
      }

      // Vary width slightly based on local elevation (wider in lower areas)
      const avgElev = river.path.reduce((s, p) => s + p[2], 0) / river.path.length
      const localWidthFactor = 1 + Math.max(0, (avgElev - elev) / 50)

      leftBank.push([
        lng + perpLng * halfWidthLng * localWidthFactor, 
        lat + perpLat * halfWidthLat * localWidthFactor
      ])
      rightBank.unshift([
        lng - perpLng * halfWidthLng * localWidthFactor, 
        lat - perpLat * halfWidthLat * localWidthFactor
      ])
    }

    // Close the polygon
    const polygon: [number, number][] = [...leftBank, ...rightBank]

    // Determine severity based on overflow depth
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (overflowDepth > 2) severity = 'critical'
    else if (overflowDepth > 1) severity = 'high'
    else if (overflowDepth > 0.5) severity = 'medium'

    floodZones.push({
      id: `flood-${river.id}`,
      stationId: river.stationId,
      riverName: river.name,
      polygon,
      baseElevation: river.path.reduce((sum, p) => sum + p[2], 0) / river.path.length,
      waterDepth: Math.max(0.1, overflowDepth), // Minimum depth for visibility
      severity,
    })
  }

  return floodZones
}

// Get flood color based on depth
export function getFloodColor(depth: number): [number, number, number, number] {
  if (depth <= 0) return [59, 130, 246, 0] // Transparent
  if (depth < 0.3) return [147, 197, 253, 120] // Very light blue
  if (depth < 0.5) return [96, 165, 250, 140] // Light blue
  if (depth < 1) return [59, 130, 246, 160] // Blue
  if (depth < 2) return [37, 99, 235, 180] // Medium blue
  if (depth < 3) return [29, 78, 216, 200] // Dark blue
  return [30, 64, 175, 220] // Very dark blue (critical)
}

// Calculate water surface elevation for a given point
export function getWaterElevationAtPoint(
  lng: number,
  lat: number,
  floodZones: FloodZone[]
): number | null {
  for (const zone of floodZones) {
    if (isPointInPolygon([lng, lat], zone.polygon)) {
      return zone.baseElevation + zone.waterDepth
    }
  }
  return null
}

// Point in polygon check using ray casting algorithm
function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  if (polygon.length < 3) return false
  
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

// Get all river paths for visualization
export function getRiverPaths(): { id: string; name: string; path: [number, number, number][] }[] {
  return AKTOBE_RIVERS.map(r => ({
    id: r.id,
    name: r.name,
    path: r.path,
  }))
}
