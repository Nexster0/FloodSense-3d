// Open-Elevation API — free, no key needed
const ELEVATION_API = 'https://api.open-elevation.com/api/v1/lookup'
const BATCH_SIZE = 100 // API limit per request

export async function getElevationBatch(
  points: Array<{ lat: number; lng: number }>
): Promise<number[]> {
  const locations = points.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }))

  const response = await fetch(ELEVATION_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) throw new Error('Elevation API error')

  const data = await response.json()
  return data.results.map((r: any) => r.elevation as number)
}

export async function enrichBuildingsWithElevation(buildings: any[]): Promise<any[]> {
  const result = []

  // Process in batches of BATCH_SIZE
  for (let i = 0; i < buildings.length; i += BATCH_SIZE) {
    const batch = buildings.slice(i, i + BATCH_SIZE)

    try {
      const elevations = await getElevationBatch(
        batch.map((b) => ({ lat: b.lat, lng: b.lng }))
      )

      for (let j = 0; j < batch.length; j++) {
        result.push({
          ...batch[j],
          foundation_elevation_m: elevations[j] ?? null,
        })
      }
    } catch {
      // If elevation fails, push without it
      for (const b of batch) result.push({ ...b, foundation_elevation_m: null })
    }

    // Rate limiting
    if (i + BATCH_SIZE < buildings.length) {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }

  return result
}
