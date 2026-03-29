const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Bounding box covering Aktobe city + surrounding river areas
const AKTOBE_RIVER_BBOX = {
  south: 50.10,
  west: 56.80,
  north: 50.45,
  east: 57.50,
}

export interface RiverFeature {
  id: string
  name: string
  nameRu: string
  coordinates: [number, number][] // [lng, lat] pairs
  width: number // approximate width in meters for display
  color: [number, number, number, number]
}

// Import correct river paths
import { RIVER_PATHS } from './constants'

// Fallback rivers using satellite-verified coordinates
const FALLBACK_RIVERS = Object.values(RIVER_PATHS)

export async function fetchAktobeRivers(): Promise<RiverFeature[]> {
  try {
    const { south, west, north, east } = AKTOBE_RIVER_BBOX

    const query = `
      [out:json][timeout:60];
      (
        way["waterway"="river"](${south},${west},${north},${east});
        way["waterway"="stream"](${south},${west},${north},${east});
      );
      out body;
      >;
      out skel qt;
    `

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) throw new Error('Overpass API error: ' + response.status)

    const data = await response.json()
    const parsed = parseRivers(data)
    
    // Use parsed results if available, otherwise fall back to verified coordinates
    return parsed.length > 0 ? parsed : FALLBACK_RIVERS
  } catch (error) {
    console.error('[v0] Overpass API failed, using fallback rivers:', error)
    return FALLBACK_RIVERS
  }
}

function parseRivers(osmData: any): RiverFeature[] {
  // Build node coordinate lookup
  const nodes: Record<number, [number, number]> = {}
  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes[el.id] = [el.lon, el.lat] // GeoJSON order: [lng, lat]
    }
  }

  const rivers: RiverFeature[] = []

  for (const el of osmData.elements) {
    if (el.type !== 'way') continue
    if (!el.tags?.waterway) continue

    const name = el.tags['name:ru'] ?? el.tags.name ?? ''
    if (!name) continue

    // Only keep the main rivers relevant to Aktobe flooding
    const isRelevant = [
      'Илек',
      'Ilek',
      'Елек',
      'Хобда',
      'Khobda',
      'Актобе',
      'Aktobe',
      'Уил',
      'Uil',
    ].some((n) => name.includes(n))

    if (!isRelevant && el.tags.waterway !== 'river') continue

    let coords = (el.nodes ?? [])
      .map((nid: number) => nodes[nid])
      .filter(Boolean)

    if (coords.length < 2) continue

    // Sort nodes along river direction (west to east for Ilek, north to south for tributaries)
    const lngSpan = Math.abs(coords[0]?.[0] - coords[coords.length - 1]?.[0]) || 0
    const latSpan = Math.abs(coords[0]?.[1] - coords[coords.length - 1]?.[1]) || 0
    
    if (lngSpan > latSpan) {
      // Primarily east-west river: sort by longitude (east to west = decreasing lng)
      coords.sort((a, b) => b[0] - a[0])
    } else if (latSpan > 0) {
      // Primarily north-south river: sort by latitude (north to south = decreasing lat)
      coords.sort((a, b) => b[1] - a[1])
    }

    // Determine display properties by river name
    const { width, color } = getRiverStyle(name, el.tags.waterway)

    rivers.push({
      id: `river-${el.id}`,
      name: el.tags.name ?? name,
      nameRu: el.tags['name:ru'] ?? name,
      coordinates: coords,
      width,
      color,
    })
  }

  // Merge segments of the same river into longer paths
  return mergeRiverSegments(rivers)
}

function getRiverStyle(
  name: string,
  waterway: string
): { width: number; color: [number, number, number, number] } {
  // Илек — main river, widest, flows through city center
  if (name.includes('Илек') || name.includes('Ilek') || name.includes('Елек')) {
    return { width: 8, color: [55, 138, 221, 200] }
  }
  // Хобда — medium tributary
  if (name.includes('Хобда') || name.includes('Khobda')) {
    return { width: 5, color: [70, 150, 230, 180] }
  }
  // Актобе river (small urban stream)
  if (name.includes('Актобе') || name.includes('Aktobe')) {
    return { width: 4, color: [85, 160, 235, 170] }
  }
  // Уил
  if (name.includes('Уил') || name.includes('Uil')) {
    return { width: 4, color: [70, 145, 225, 160] }
  }
  // Other streams
  if (waterway === 'river') return { width: 6, color: [55, 138, 221, 180] }
  return { width: 2, color: [100, 170, 240, 140] }
}

// Merge OSM way segments that belong to the same river into continuous polylines
function mergeRiverSegments(rivers: RiverFeature[]): RiverFeature[] {
  // Group by nameRu
  const byName: Record<string, RiverFeature[]> = {}
  for (const r of rivers) {
    const key = r.nameRu || r.name
    if (!byName[key]) byName[key] = []
    byName[key].push(r)
  }

  const merged: RiverFeature[] = []
  for (const [name, segments] of Object.entries(byName)) {
    if (segments.length === 1) {
      merged.push(segments[0])
      continue
    }
    // Try to chain segments end-to-end
    const chained = chainSegments(segments)
    for (const chain of chained) {
      merged.push({
        id: `river-merged-${name}-${merged.length}`,
        name: segments[0].name,
        nameRu: segments[0].nameRu,
        coordinates: chain,
        width: segments[0].width,
        color: segments[0].color,
      })
    }
  }
  return merged
}

function chainSegments(segments: RiverFeature[]): [number, number][][] {
  if (segments.length === 0) return []
  const result: [number, number][][] = []
  const used = new Set<string>()

  for (const start of segments) {
    if (used.has(start.id)) continue
    used.add(start.id)
    let chain = [...start.coordinates]

    let changed = true
    while (changed) {
      changed = false
      for (const seg of segments) {
        if (used.has(seg.id)) continue
        const chainEnd = chain[chain.length - 1]
        const chainStart = chain[0]
        const segStart = seg.coordinates[0]
        const segEnd = seg.coordinates[seg.coordinates.length - 1]

        const dist = (a: [number, number], b: [number, number]) =>
          Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])

        if (dist(chainEnd, segStart) < 0.0001) {
          chain = [...chain, ...seg.coordinates.slice(1)]
          used.add(seg.id)
          changed = true
        } else if (dist(chainEnd, segEnd) < 0.0001) {
          chain = [...chain, ...[...seg.coordinates].reverse().slice(1)]
          used.add(seg.id)
          changed = true
        } else if (dist(chainStart, segEnd) < 0.0001) {
          chain = [...seg.coordinates, ...chain.slice(1)]
          used.add(seg.id)
          changed = true
        }
      }
    }
    result.push(chain)
  }
  return result
}
