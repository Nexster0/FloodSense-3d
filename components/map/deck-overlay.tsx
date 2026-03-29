'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { Deck } from '@deck.gl/core'
import { PolygonLayer, PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { MapRef } from 'react-map-gl/maplibre'
import type { Building, FloodCalculation, GaugeStation, RiverFeature } from '@/lib/types'
import { getFloodColor, WATER_COLOR } from '@/lib/flood-calculator'
import { FLOOR_HEIGHT_M } from '@/lib/constants'

interface DeckOverlayProps {
  mapRef: React.RefObject<MapRef | null>
  buildings: Building[]
  calculations: FloodCalculation[]
  stations: GaugeStation[]
  rivers: RiverFeature[]
  effectiveWaterLevel: number
  layerToggles: { buildings: boolean; water: boolean; stations: boolean; rivers: boolean }
  onBuildingHover: (
    building: Building | null,
    calc: FloodCalculation | null,
    x: number,
    y: number
  ) => void
}

export function DeckOverlay({
  mapRef,
  buildings,
  calculations,
  stations,
  rivers,
  effectiveWaterLevel,
  layerToggles,
  onBuildingHover,
}: DeckOverlayProps) {
  const deckRef = useRef<Deck | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredRiverId, setHoveredRiverId] = useState<string | null>(null)

  // Build lookup map for calculations
  const calcMap = useMemo(
    () => new Map(calculations.map((c) => [c.building_id, c])),
    [calculations]
  )

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !containerRef.current) return

    const deck = new Deck({
      parent: containerRef.current,
      controller: false,
      style: { pointerEvents: 'none' },
      views: [],
      layers: [],
      getTooltip: null,
    })

    const syncViewState = () => {
      const center = map.getCenter()
      deck.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        },
      })
    }

    map.on('move', syncViewState)
    map.on('moveend', syncViewState)
    map.on('resize', syncViewState)
    map.on('pitch', syncViewState)
    map.on('rotate', syncViewState)
    syncViewState()

    deckRef.current = deck

    return () => {
      map.off('move', syncViewState)
      map.off('moveend', syncViewState)
      map.off('resize', syncViewState)
      map.off('pitch', syncViewState)
      map.off('rotate', syncViewState)
      deck.finalize()
      deckRef.current = null
    }
  }, [mapRef])

  useEffect(() => {
    if (!deckRef.current) return

    // Helper function to create flood corridor polygon around river path
    function createFloodCorridor(
      path: [number, number][],
      widthDeg: number  // corridor half-width in degrees
    ): [number, number][] {
      const left: [number, number][] = path.map(([lng, lat]) => [lng, lat + widthDeg])
      const right: [number, number][] = [...path].reverse().map(([lng, lat]) => [lng, lat - widthDeg])
      return [...left, ...right, left[0]]
    }

    const layers: (PolygonLayer | PathLayer | ScatterplotLayer)[] = []

    // River paths - main feature from fetched Overpass data
    if (layerToggles.rivers && rivers.length > 0) {
      // River centerlines
      layers.push(
        new PathLayer({
          id: 'rivers',
          data: rivers,
          getPath: (r: RiverFeature) => r.coordinates,
          getColor: (r: RiverFeature) => r.color,
          getWidth: (r: RiverFeature) => r.width,
          widthUnits: 'pixels',
          widthMinPixels: 2,
          widthMaxPixels: 20,
          capRounded: true,
          jointRounded: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 150],
          onHover: (info) => {
            if (info.object) {
              setHoveredRiverId((info.object as RiverFeature).id)
            } else {
              setHoveredRiverId(null)
            }
          },
        })
      )

      // River flood glow effect: animated pulsing line on top when water is high
      if (effectiveWaterLevel > 165) {
        const glowAlpha = Math.min(200, (effectiveWaterLevel - 165) * 3)
        layers.push(
          new PathLayer({
            id: 'rivers-flood-glow',
            data: rivers.filter((r) => r.width >= 5), // only main rivers
            getPath: (r: RiverFeature) => r.coordinates,
            getColor: [255, 100, 100, glowAlpha],
            getWidth: (r: RiverFeature) => r.width * 2.5,
            widthUnits: 'pixels',
            widthMinPixels: 3,
            widthMaxPixels: 25,
            capRounded: true,
            jointRounded: true,
            pickable: false,
          })
        )
      }
    }

    // Water surface flood corridor - follows river shape
    if (layerToggles.water && rivers.length > 0) {
      const floodCorridorWidth = 0.002 + Math.max(0, (effectiveWaterLevel - 162) * 0.0008)
      const floodAlpha = Math.min(140, 60 + Math.max(0, (effectiveWaterLevel - 162) * 15))
      
      const floodPolygons = rivers
        .filter(r => r.width >= 5)  // only main rivers flood significantly
        .map(r => ({
          polygon: createFloodCorridor(r.coordinates, floodCorridorWidth),
          river: r,
        }))

      layers.push(
        new PolygonLayer({
          id: 'water-surface',
          data: floodPolygons,
          getPolygon: (d: any) => d.polygon,
          getFillColor: [55, 138, 221, floodAlpha],
          getLineColor: [55, 138, 221, 180],
          lineWidthMinPixels: 1,
          extruded: false,
          pickable: false,
          updateTriggers: {
            getFillColor: [effectiveWaterLevel],
            getPolygon: [effectiveWaterLevel],
          },
        })
      )
    }

    // 3D buildings
    if (layerToggles.buildings && buildings.length > 0) {
      layers.push(
        new PolygonLayer({
          id: 'buildings-3d',
          data: buildings,
          getPolygon: (b: Building) => b.footprint,
          getFillColor: (b: Building) => {
            const calc = calcMap.get(b.id)
            return calc ? getFloodColor(calc) : [180, 180, 180, 200]
          },
          getElevation: (b: Building) => (b.floors ?? 2) * FLOOR_HEIGHT_M,
          extruded: true,
          wireframe: false,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 80],
          onHover: (info) => {
            const building = info.object as Building | undefined
            const calc = building ? calcMap.get(building.id) ?? null : null
            onBuildingHover(building ?? null, calc, info.x, info.y)
          },
          updateTriggers: {
            getFillColor: [calculations],
          },
        })
      )
    }

    // Station markers (as 3D pillars)
    if (layerToggles.stations) {
      layers.push(
        new ScatterplotLayer({
          id: 'stations-deck',
          data: stations,
          getPosition: (s: GaugeStation) => [s.lng, s.lat],
          getRadius: 50,
          getFillColor: [239, 68, 68, 220],
          getLineColor: [255, 255, 255, 200],
          lineWidthMinPixels: 2,
          stroked: true,
          pickable: false,
        })
      )
    }

    deckRef.current.setProps({ layers })
  }, [
    buildings,
    calculations,
    stations,
    rivers,
    layerToggles,
    effectiveWaterLevel,
    calcMap,
    onBuildingHover,
  ])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
