'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { AKTOBE_CENTER, MAP_DEFAULTS, STATUS_COLORS } from '@/lib/constants'
import { generateFloodZones, AKTOBE_RIVERS, type FloodZone } from '@/lib/flood-model'
import type { StationWithReading, StationStatus, Building, FloodCalculation } from '@/lib/types'
import { FloodSlider } from '@/components/controls/flood-slider'
import { LayerToggles } from '@/components/controls/layer-toggles'
import { BuildingTooltip } from './building-tooltip'

// Configure Cesium to use CDN for static assets
if (typeof window !== 'undefined') {
  (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = 
    'https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/'
  
  // Suppress ALL unhandled rejection errors from Cesium
  const originalHandler = window.onunhandledrejection
  window.onunhandledrejection = (event) => {
    // Check if it's a Cesium-related error
    const reason = event.reason
    const isObjectError = reason && typeof reason === 'object'
    const isCesiumError = 
      reason?.message?.includes?.('Cesium') ||
      reason?.message?.includes?.('Ion') ||
      reason?.message?.includes?.('tileset') ||
      reason?.message?.includes?.('terrain') ||
      reason?.toString?.()?.includes?.('RuntimeError') ||
      reason?.toString?.()?.includes?.('[object Object]') ||
      isObjectError
    
    if (isCesiumError) {
      event.preventDefault()
      return true
    }
    
    if (originalHandler) {
      return originalHandler.call(window, event)
    }
    return false
  }
}

interface CesiumViewerProps {
  stations: StationWithReading[]
  buildings: Building[]
  calculations: FloodCalculation[]
  floodSimulation: {
    realWaterLevelM: number
    effectiveWaterLevel: number
    simulationOffset: number
    isSimulating: boolean
    stats: {
      total: number
      flooded: number
      critical: number
      high: number
      medium: number
      low: number
      floodedPercent: number
    }
    setSimulationOffset: (offset: number) => void
    setIsSimulating: (enabled: boolean) => void
  }
  onStationSelect?: (station: StationWithReading) => void
}

export function CesiumViewer({
  stations,
  buildings,
  calculations,
  floodSimulation,
  onStationSelect,
}: CesiumViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<unknown>(null)
  const cesiumRef = useRef<typeof import('cesium') | null>(null)
  const floodEntitiesRef = useRef<unknown[]>([])
  const riverEntitiesRef = useRef<unknown[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [layerToggles, setLayerToggles] = useState({
    buildings: true,
    water: true,
    stations: true,
  })
  const [hoveredBuilding, setHoveredBuilding] = useState<{
    building: Building | null
    calc: FloodCalculation | null
    x: number
    y: number
  }>({ building: null, calc: null, x: 0, y: 0 })

  // Generate flood zones based on station data and simulation
  const floodZones = useMemo(() => {
    return generateFloodZones(stations, floodSimulation.simulationOffset)
  }, [stations, floodSimulation.simulationOffset])

  // Client-side mount check
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize Cesium viewer
  useEffect(() => {
    if (!isMounted || !containerRef.current || viewerRef.current) return

    let mounted = true
    let handler: unknown = null

    const initViewer = async () => {
      try {
        // Check for Cesium token first
        const cesiumToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN || ''
        if (!cesiumToken) {
          throw new Error('NEXT_PUBLIC_CESIUM_TOKEN not configured')
        }

        const Cesium = await import('cesium')
        
        if (!mounted || !containerRef.current) return
        
        cesiumRef.current = Cesium
        Cesium.Ion.defaultAccessToken = cesiumToken

        // Load CSS from CDN
        if (!document.getElementById('cesium-css')) {
          const link = document.createElement('link')
          link.id = 'cesium-css'
          link.rel = 'stylesheet'
          link.href = 'https://cesium.com/downloads/cesiumjs/releases/1.124/Build/Cesium/Widgets/widgets.css'
          document.head.appendChild(link)
        }

        // Create viewer with minimal settings first
        const viewer = new Cesium.Viewer(containerRef.current, {
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          vrButton: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: document.createElement('div'),
          // Enable high-quality rendering
          msaaSamples: 4,
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity,
        })

        if (!mounted) {
          viewer.destroy()
          return
        }

        // Configure globe for better visualization
        const globe = viewer.scene.globe
        globe.enableLighting = true
        globe.depthTestAgainstTerrain = true // Important for water rendering
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0a0a')
        
        // Enable terrain with detailed elevation (non-blocking)
        Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
          requestVertexNormals: true,
          requestWaterMask: true,
        }).then((terrain) => {
          if (mounted && viewer && !viewer.isDestroyed()) {
            viewer.terrainProvider = terrain
          }
        }).catch(() => {
          // Terrain unavailable - continue with default ellipsoid
        })

        // Add OSM 3D buildings with textures (non-blocking)
        Cesium.createOsmBuildingsAsync().then((osmBuildings) => {
          if (mounted && viewer && !viewer.isDestroyed()) {
            try {
              osmBuildings.style = new Cesium.Cesium3DTileStyle({
                color: {
                  conditions: [
                    ["${feature['building']} === 'residential'", "color('#e8d4b0')"],
                    ["${feature['building']} === 'commercial'", "color('#c9d4e8')"],
                    ["${feature['building']} === 'industrial'", "color('#d4d4d4')"],
                    ["${feature['building']} === 'hospital'", "color('#ffe4e4')"],
                    ["${feature['building']} === 'school'", "color('#e4ffe4')"],
                    ["${feature['building']} === 'university'", "color('#e4e4ff')"],
                    ['true', "color('#d8cfc0')"],
                  ],
                },
              })
            } catch {}
            viewer.scene.primitives.add(osmBuildings)
          }
        }).catch(() => {
          // OSM Buildings unavailable - continue without
        })

        // Set initial camera - tilted 3D view of Aktobe
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(
            AKTOBE_CENTER.lng,
            AKTOBE_CENTER.lat - 0.02,
            5000 // Lower altitude for more detail
          ),
          orientation: {
            heading: Cesium.Math.toRadians(MAP_DEFAULTS.bearing + 180),
            pitch: Cesium.Math.toRadians(-35), // More tilted for 3D view
            roll: 0,
          },
        })

        // Add river polylines to show where water flows
        AKTOBE_RIVERS.forEach((river) => {
          const positions = river.path.map(([lng, lat, _]) => 
            Cesium.Cartesian3.fromDegrees(lng, lat)
          )
          
          const riverEntity = viewer.entities.add({
            polyline: {
              positions,
              width: 8,
              material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.2,
                color: Cesium.Color.fromCssColorString('#2563eb').withAlpha(0.8),
              }),
              clampToGround: true,
            },
            properties: {
              isRiver: true,
              riverId: river.id,
              riverName: river.name,
            },
          })
          riverEntitiesRef.current.push(riverEntity)
        })

        viewerRef.current = viewer
        setIsLoading(false)

        // Setup click handler
        handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
        ;(handler as Cesium.ScreenSpaceEventHandler).setInputAction(
          (movement: { position: { x: number; y: number } }) => {
            const pickedObject = viewer.scene.pick(movement.position)
            if (Cesium.defined(pickedObject)) {
              if (pickedObject.id?.properties?.stationId) {
                const stationId = pickedObject.id.properties.stationId.getValue()
                const station = stations.find((s) => s.id === stationId)
                if (station) onStationSelect?.(station)
              }
            }
          },
          Cesium.ScreenSpaceEventType.LEFT_CLICK
        )
      } catch (err) {
        console.error('[v0] Cesium init error:', err)
        if (mounted) {
          setIsLoading(false)
          const errorMsg = (err as Error)?.message || ''
          if (errorMsg.includes('TOKEN') || errorMsg.includes('token')) {
            setError('Требуется токен Cesium Ion. Добавьте NEXT_PUBLIC_CESIUM_TOKEN в настройках.')
          } else {
            setError('Не удалось загрузить 3D карту. Используйте 2D режим.')
          }
        }
      }
    }

    initViewer()

    return () => {
      mounted = false
      if (handler && typeof (handler as { destroy?: () => void }).destroy === 'function') {
        (handler as { destroy: () => void }).destroy()
      }
      const viewer = viewerRef.current as { isDestroyed?: () => boolean; destroy?: () => void } | null
      if (viewer && typeof viewer.isDestroyed === 'function' && !viewer.isDestroyed()) {
        viewer.destroy?.()
        viewerRef.current = null
      }
    }
  }, [isMounted, stations, onStationSelect])

  // Update flood zones visualization
  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !layerToggles.water) return

    const Cesium = cesiumRef.current
    const viewer = viewerRef.current as import('cesium').Viewer

    // Remove existing flood entities
    floodEntitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity as import('cesium').Entity)
    })
    floodEntitiesRef.current = []

    if (!floodSimulation.isSimulating && floodZones.length === 0) return

    // Add flood zone polygons with realistic water appearance
    floodZones.forEach((zone) => {
      if (zone.waterDepth <= 0) return

      const positions = zone.polygon.map(([lng, lat]) =>
        Cesium.Cartesian3.fromDegrees(lng, lat)
      )

      // Water color based on depth
      let waterColor = Cesium.Color.fromCssColorString('#3b82f6').withAlpha(0.4)
      if (zone.severity === 'critical') {
        waterColor = Cesium.Color.fromCssColorString('#1e3a5f').withAlpha(0.7)
      } else if (zone.severity === 'high') {
        waterColor = Cesium.Color.fromCssColorString('#1d4ed8').withAlpha(0.6)
      } else if (zone.severity === 'medium') {
        waterColor = Cesium.Color.fromCssColorString('#2563eb').withAlpha(0.5)
      }

      // Create water surface polygon - clamped to ground with extrusion for depth
      const waterEntity = viewer.entities.add({
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: waterColor,
          // Height 0 means on ground, extruded height is the water depth
          height: 0,
          extrudedHeight: Math.min(zone.waterDepth, 10), // Cap at 10m for visual clarity
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#1e40af').withAlpha(0.8),
          outlineWidth: 1,
          // Clamp to ground so water follows terrain
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          extrudedHeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          classificationType: Cesium.ClassificationType.BOTH, // Show on terrain and buildings
        },
        properties: {
          isFloodZone: true,
          zoneId: zone.id,
          depth: zone.waterDepth,
          severity: zone.severity,
        },
      })

      floodEntitiesRef.current.push(waterEntity)

      // Add depth label for significant flooding
      if (zone.waterDepth > 0.5) {
        const center = zone.polygon.reduce(
          (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
          [0, 0]
        )
        center[0] /= zone.polygon.length
        center[1] /= zone.polygon.length

        const labelEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(center[0], center[1]),
          label: {
            text: `${zone.riverName}\n${zone.waterDepth.toFixed(1)}м`,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#1e3a8a').withAlpha(0.8),
            backgroundPadding: new Cesium.Cartesian2(8, 4),
          },
        })
        floodEntitiesRef.current.push(labelEntity)
      }
    })
  }, [floodZones, floodSimulation.isSimulating, layerToggles.water])

  // Add station markers
  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !layerToggles.stations) return

    const Cesium = cesiumRef.current
    const viewer = viewerRef.current as import('cesium').Viewer

    // Remove existing station entities
    const existingStations = viewer.entities.values.filter(
      (e) => e.properties?.isStation?.getValue() === true
    )
    existingStations.forEach((e) => viewer.entities.remove(e))

    // Add station markers with water level info
    stations.forEach((station) => {
      const status = station.latest_reading?.status || 'NORMAL'
      const color = Cesium.Color.fromCssColorString(STATUS_COLORS[status as StationStatus])
      const levelCm = station.latest_reading?.level_cm ?? 0
      const changeCm = station.latest_reading?.change_cm ?? 0
      const changeSign = changeCm >= 0 ? '+' : ''

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(station.lng, station.lat, 20),
        billboard: {
          image: createStationMarkerCanvas(status, Cesium),
          width: 32,
          height: 32,
          heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${station.name_ru}\n${levelCm}см (${changeSign}${changeCm})`,
          font: '12px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          pixelOffset: new Cesium.Cartesian2(0, 20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: color.withAlpha(0.8),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
        },
        properties: {
          isStation: true,
          stationId: station.id,
        },
      })
    })
  }, [stations, layerToggles.stations])

  const handleLayerToggle = useCallback(
    (layer: 'buildings' | 'water' | 'stations', enabled: boolean) => {
      setLayerToggles((prev) => ({ ...prev, [layer]: enabled }))

      if (layer === 'buildings' && viewerRef.current) {
        const viewer = viewerRef.current as import('cesium').Viewer
        const primitives = viewer.scene.primitives as { _primitives?: unknown[] }
        primitives._primitives?.forEach((p: unknown) => {
          if ((p as { isCesium3DTileset?: boolean })?.isCesium3DTileset) {
            ;(p as { show: boolean }).show = enabled
          }
        })
      }
    },
    []
  )

  // Don't render anything on server
  if (!isMounted) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Инициализация...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">Используйте 2D режим карты</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Загрузка 3D карты...</p>
          </div>
        </div>
      )}

      {/* Cesium container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Building hover tooltip */}
      <BuildingTooltip
        building={hoveredBuilding.building}
        calculation={hoveredBuilding.calc}
        x={hoveredBuilding.x}
        y={hoveredBuilding.y}
      />

      {/* Layer toggles - top right */}
      <div className="absolute right-4 top-4 z-10">
        <LayerToggles toggles={layerToggles} onToggle={handleLayerToggle} />
      </div>

      {/* Flood simulation slider - bottom right */}
      <div className="absolute bottom-8 right-4 z-10">
        <FloodSlider
          realWaterLevelM={floodSimulation.realWaterLevelM}
          effectiveWaterLevel={floodSimulation.effectiveWaterLevel}
          simulationOffset={floodSimulation.simulationOffset}
          isSimulating={floodSimulation.isSimulating}
          stats={floodSimulation.stats}
          onOffsetChange={floodSimulation.setSimulationOffset}
          onSimulationToggle={floodSimulation.setIsSimulating}
        />
      </div>

      {/* Flood zones legend */}
      {floodZones.length > 0 && (
        <div className="absolute bottom-8 left-4 z-10 rounded-lg bg-card/90 p-3 backdrop-blur-md">
          <h4 className="mb-2 text-xs font-medium text-foreground">Зоны затопления</h4>
          <div className="space-y-1">
            {floodZones.map((zone) => (
              <div key={zone.id} className="flex items-center gap-2 text-xs">
                <div 
                  className="h-3 w-3 rounded"
                  style={{
                    backgroundColor: zone.severity === 'critical' ? '#1e3a5f' :
                      zone.severity === 'high' ? '#1d4ed8' :
                      zone.severity === 'medium' ? '#2563eb' : '#3b82f6',
                    opacity: 0.8,
                  }}
                />
                <span className="text-muted-foreground">
                  {zone.riverName}: {zone.waterDepth.toFixed(1)}м
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Create station marker canvas image
function createStationMarkerCanvas(
  status: StationStatus,
  Cesium: typeof import('cesium')
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!

  const color = STATUS_COLORS[status]

  // Draw outer circle
  ctx.beginPath()
  ctx.arc(16, 16, 14, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw inner wave icon
  ctx.beginPath()
  ctx.moveTo(8, 16)
  ctx.quadraticCurveTo(12, 12, 16, 16)
  ctx.quadraticCurveTo(20, 20, 24, 16)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()

  return canvas
}
