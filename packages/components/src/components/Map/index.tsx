// Subpath entry for `@oztix/roadie-components/map`.
//
// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { MapArea } from './MapArea'
import { MapClusters } from './MapClusters'
import { MapMarker } from './MapMarker'
import { MapPicker } from './MapPicker'
import { MapRoot } from './MapRoot'
import { MapSearch } from './MapSearch'
import { MapToolbar } from './MapToolbar'

// Shadows the global `Map` in this module only; apps that need both can
// import it as another name.
const Map = MapRoot as typeof MapRoot & {
  Root: typeof MapRoot
  Area: typeof MapArea
  Clusters: typeof MapClusters
  Marker: typeof MapMarker
  Picker: typeof MapPicker
  Search: typeof MapSearch
  Toolbar: typeof MapToolbar
}

Map.Root = MapRoot
Map.Area = MapArea
Map.Clusters = MapClusters
Map.Marker = MapMarker
Map.Picker = MapPicker
Map.Search = MapSearch
Map.Toolbar = MapToolbar

export { Map }
export type { MapActions, MapRootProps as MapProps } from './MapRoot'
export type { MapAreaProps } from './MapArea'
export type { MapClusterPoint, MapClustersProps } from './MapClusters'
export type { MapMarkerProps } from './MapMarker'
export type { MapPickerProps } from './MapPicker'
export type { MapSearchProps } from './MapSearch'
export type { MapToolbarProps } from './MapToolbar'
export type { MapPinLook } from './MapPin'
export type { Place } from './place'
export type { MapTone } from './palette'
export { MapProvider, type MapProviderProps } from './MapProvider'
export {
  maplibreEngine,
  type MaplibreEngineOptions,
  type MaplibreEngineTiles
} from './maplibreEngine'
export type {
  LatLng,
  MapAreaGeometry,
  MapAreaLayer,
  MapAttribution,
  MapBounds,
  MapEngine,
  MapEngineInstance,
  MapMountOptions,
  MapPalette,
  MapPixel,
  MapView,
  MapViewOptions
} from './engine'
