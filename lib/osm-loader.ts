const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

// Bounding box for Aktobe city
const AKTOBE_BBOX = {
  south: 50.18,
  west: 57.05,
  north: 50.38,
  east: 57.32,
}

export async function fetchAktobeBuildings() {
  const query = `
    [out:json][timeout:60];
    (
      way["building"](${AKTOBE_BBOX.south},${AKTOBE_BBOX.west},${AKTOBE_BBOX.north},${AKTOBE_BBOX.east});
      relation["building"](${AKTOBE_BBOX.south},${AKTOBE_BBOX.west},${AKTOBE_BBOX.north},${AKTOBE_BBOX.east});
    );
    out body;
    >;
    out skel qt;
  `

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: AbortSignal.timeout(90000),
  })

  if (!response.ok) throw new Error('Overpass API error')

  const data = await response.json()
  return parseOSMBuildings(data)
}

function parseOSMBuildings(osmData: any) {
  // Build node lookup
  const nodes: Record<number, { lat: number; lng: number }> = {}
  for (const el of osmData.elements) {
    if (el.type === 'node') nodes[el.id] = { lat: el.lat, lng: el.lon }
  }

  const buildings = []
  for (const el of osmData.elements) {
    if (el.type !== 'way' || !el.tags?.building) continue
    if (!el.nodes || el.nodes.length < 4) continue

    const coords = el.nodes
      .map((nid: number) => nodes[nid])
      .filter(Boolean)
    if (coords.length < 3) continue

    // Centroid
    const lat =
      coords.reduce((s: number, c: any) => s + c.lat, 0) / coords.length
    const lng =
      coords.reduce((s: number, c: any) => s + c.lng, 0) / coords.length

    const floors =
      parseInt(
        el.tags['building:levels'] ?? el.tags['levels'] ?? '2'
      ) || 2
    const buildingType =
      el.tags.building === 'yes' ? 'residential' : el.tags.building

    buildings.push({
      id: `osm-${el.id}`,
      osm_id: el.id,
      name_ru: el.tags['name:ru'] ?? el.tags.name ?? null,
      address: el.tags['addr:street']
        ? `${el.tags['addr:street']} ${el.tags['addr:housenumber'] ?? ''}`.trim()
        : null,
      district: el.tags['addr:district'] ?? guessDistrict(lat, lng),
      lat,
      lng,
      footprint: coords.map((c: any) => [c.lng, c.lat]),
      floors,
      building_type: buildingType,
      height_m: floors * 3.0,
    })
  }

  return buildings
}

function guessDistrict(lat: number, lng: number): string {
  if (lat > 50.3) return 'Астана'
  if (lng < 57.14) return 'Алматы'
  if (lat < 50.25) return 'Промышленный'
  return 'Центральный'
}
