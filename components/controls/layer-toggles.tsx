import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Building2, Waves, MapPin, Droplets } from 'lucide-react'

interface LayerTogglesProps {
  toggles: {
    buildings: boolean
    water: boolean
    stations: boolean
    rivers: boolean
  }
  onToggle: (layer: 'buildings' | 'water' | 'stations' | 'rivers', enabled: boolean) => void
}

export function LayerToggles({ toggles, onToggle }: LayerTogglesProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-md">
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="toggle-buildings"
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            3D Здания
          </Label>
          <Switch
            id="toggle-buildings"
            checked={toggles.buildings}
            onCheckedChange={(checked) => onToggle('buildings', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="toggle-rivers"
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <Droplets className="h-3.5 w-3.5 text-blue-500" />
            Реки
          </Label>
          <Switch
            id="toggle-rivers"
            checked={toggles.rivers}
            onCheckedChange={(checked) => onToggle('rivers', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="toggle-water"
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <Waves className="h-3.5 w-3.5 text-blue-400" />
            Вода
          </Label>
          <Switch
            id="toggle-water"
            checked={toggles.water}
            onCheckedChange={(checked) => onToggle('water', checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="toggle-stations"
            className="flex cursor-pointer items-center gap-2 text-xs"
          >
            <MapPin className="h-3.5 w-3.5 text-red-400" />
            Станции
          </Label>
          <Switch
            id="toggle-stations"
            checked={toggles.stations}
            onCheckedChange={(checked) => onToggle('stations', checked)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
