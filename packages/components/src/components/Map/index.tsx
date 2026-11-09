// Subpath entry for `@oztix/roadie-components/map`.
//
// NO `'use client'`: server-safe property-assignment layer.
// See docs/contributing/COMPOUND_PATTERNS.md.
import { MapRoot } from './MapRoot'
import { MapToolbar } from './MapToolbar'

// Shadows the global `Map` in this module only; apps that need both can
// import it as another name.
const Map = MapRoot as typeof MapRoot & {
  Root: typeof MapRoot
  Toolbar: typeof MapToolbar
}

Map.Root = MapRoot
Map.Toolbar = MapToolbar

export { Map }
export type { MapActions, MapRootProps as MapProps } from './MapRoot'
export type { MapToolbarProps } from './MapToolbar'
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
