'use client'

import { useRef, useCallback, useState } from 'react'
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  FullscreenControl,
  type MapRef,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

import { AKTOBE_CENTER, MAP_DEFAULTS, STATUS_COLORS, STATUS_LABELS_RU } from '@/lib/constants'
import type { StationWithReading, StationStatus, Building, FloodCalculation, RiverFeature } from '@/lib/types'
import { DeckOverlay } from './deck-overlay'
import { BuildingTooltip } from './building-tooltip'
import { FloodSlider } from '@/components/controls/flood-slider'
import { LayerToggles } from '@/components/controls/layer-toggles'

interface FloodMapProps {
  stations: StationWithReading[]
  buildings: Building[]
  calculations: FloodCalculation[]
  rivers?: RiverFeature[]
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

export function FloodMap({
  stations,
  buildings,
  calculations,
  rivers = [],
  floodSimulation,
  onStationSelect,
}: FloodMapProps) {
  const mapRef = useRef<MapRef>(null)
  const [selectedStation, setSelectedStation] = useState<StationWithReading | null>(null)
  const [hoveredBuilding, setHoveredBuilding] = useState<{
    building: Building | null
    calc: FloodCalculation | null
    x: number
    y: number
  }>({ building: null, calc: null, x: 0, y: 0 })

  const [layerToggles, setLayerToggles] = useState({
    buildings: true,
    water: true,
    stations: true,
    rivers: true,
  })

  const handleMarkerClick = useCallback(
    (station: StationWithReading) => {
      setSelectedStation(station)
      onStationSelect?.(station)
      mapRef.current?.flyTo({
        center: [station.lng, station.lat],
        zoom: 13,
        duration: 1000,
      })
    },
    [onStationSelect]
  )

  const handlePopupClose = useCallback(() => {
    setSelectedStation(null)
  }, [])

  const handleBuildingHover = useCallback(
    (building: Building | null, calc: FloodCalculation | null, x: number, y: number) => {
      setHoveredBuilding({ building, calc, x, y })
    },
    []
  )

  const handleLayerToggle = useCallback(
    (layer: 'buildings' | 'water' | 'stations', enabled: boolean) => {
      setLayerToggles((prev) => ({ ...prev, [layer]: enabled }))
    },
    []
  )

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: AKTOBE_CENTER.lng,
          latitude: AKTOBE_CENTER.lat,
          zoom: MAP_DEFAULTS.zoom,
          pitch: MAP_DEFAULTS.pitch,
          bearing: MAP_DEFAULTS.bearing,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        maxPitch={85}
        minZoom={8}
        maxZoom={18}
        dragRotate={true}
        touchZoomRotate={true}
        touchPitch={true}
        keyboard={true}
      >
        <NavigationControl position="top-left" visualizePitch={true} showCompass={true} />
        <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <ScaleControl position="bottom-left" />

        {/* Deck.gl 3D Overlay */}
          <DeckOverlay
            mapRef={mapRef}
            buildings={buildings}
            calculations={calculations}
            stations={stations}
            rivers={rivers}
            effectiveWaterLevel={floodSimulation.effectiveWaterLevel}
            layerToggles={layerToggles}
            onBuildingHover={(building, calc, x, y) =>
              setHoveredBuilding({ building, calc, x, y })
            }
          />

        {/* Station markers (2D for interactivity) */}
        {layerToggles.stations &&
          stations.map((station) => {
            const status = station.latest_reading?.status || 'NORMAL'
            const color = STATUS_COLORS[status as StationStatus]

            return (
              <Marker
                key={station.id}
                longitude={station.lng}
                latitude={station.lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  handleMarkerClick(station)
                }}
              >
                <div
                  className="relative cursor-pointer"
                  style={{
                    width: 24,
                    height: 24,
                  }}
                >
                  {/* Pulsing ring for warning+ statuses */}
                  {['WARNING', 'DANGER', 'CRITICAL'].includes(status) && (
                    <div
                      className="absolute inset-0 animate-ping rounded-full opacity-75"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  {/* Main marker */}
                  <div
                    className="absolute inset-0 rounded-full border-2 border-background shadow-lg transition-transform hover:scale-125"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </Marker>
            )
          })}

        {selectedStation && (
          <Popup
            longitude={selectedStation.lng}
            latitude={selectedStation.lat}
            anchor="bottom"
            onClose={handlePopupClose}
            closeButton={true}
            closeOnClick={false}
            className="flood-popup"
          >
            <div className="min-w-[200px] p-2">
              <h3 className="text-sm font-semibold text-foreground">
                {selectedStation.name_ru}
              </h3>
              <p className="text-xs text-muted-foreground">{selectedStation.river}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">
                  {selectedStation.latest_reading?.level_cm ?? '—'} см
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{
                    backgroundColor:
                      STATUS_COLORS[
                        (selectedStation.latest_reading?.status || 'NORMAL') as StationStatus
                      ],
                  }}
                >
                  {STATUS_LABELS_RU[
                    (selectedStation.latest_reading?.status || 'NORMAL') as StationStatus
                  ]}
                </span>
              </div>
            </div>
          </Popup>
        )}
      </Map>

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
    </div>
  )
}
