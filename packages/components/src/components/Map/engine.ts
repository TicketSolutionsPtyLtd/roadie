// The contract between Map and whatever draws it. Map and its parts only ever
// talk to an engine through these types, so an engine can be swapped without
// changing Map or the apps that use it. Every engine passes
// `engine.contract.browser.test.tsx`.

/** A place on the map, in degrees. */
export type LatLng = {
  lat: number
  lng: number
}

/** Where the map is looking. */
export type MapView = {
  center: LatLng
  /** Zoom level: 0 shows the world; each step doubles the scale. */
  zoom: number
}

/** A credit the map shows for its tiles. Links when it has an `href`. */
export type MapAttribution = {
  label: string
  href?: string
}

/**
 * The basemap's colours, as `rgb()`. Map reads them from the intent and mode
 * around it; an engine drawing its own style, or a cloud style, ignores them.
 */
export type MapPalette = {
  land: string
  park: string
  water: string
  building: string
  road: string
  roadMajor: string
  roadCasing: string
  rail: string
  border: string
  label: string
  labelHalo: string
}

/** A GeoJSON polygon or multipolygon, in `[lng, lat]` order as GeoJSON is. */
export type MapAreaGeometry =
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] }

/** An area the map highlights, with its colours resolved to `rgb()`. */
export type MapAreaLayer = {
  id: string
  geometry: MapAreaGeometry
  fill: string
  /** How opaque the fill is, from 0 to 1. */
  fillOpacity: number
  line: string
}

/** A point in the map's frame, in CSS pixels from its top left. */
export type MapPixel = {
  x: number
  y: number
}

export type MapViewOptions = {
  /**
   * Eases to the new view instead of jumping. Engines jump anyway when the
   * reader asks for reduced motion.
   */
  animate?: boolean
}

/**
 * A map drawn into a container. It follows the container's size: when that
 * changes, as when the map fills the window, it redraws to fit and fires
 * `move`, so pins sit on their places again.
 */
export interface MapEngineInstance {
  getView(): MapView
  /** Moves the map, at once unless `animate` is set. */
  setView(view: Partial<MapView>, options?: MapViewOptions): void
  project(place: LatLng): MapPixel
  unproject(pixel: MapPixel): LatLng
  /** Listens while the view changes. Returns a function that stops it. */
  on(event: 'move', listener: () => void): () => void
  /**
   * Listens for clicks and taps on the map itself, with the place under the
   * pointer. Returns a function that stops it.
   */
  on(event: 'click', listener: (place: LatLng) => void): () => void
  /** Redraws the basemap in these colours. */
  setPalette(palette: MapPalette): void
  /** Draws these areas over the basemap, replacing the ones before. */
  setAreas(areas: readonly MapAreaLayer[]): void
  /**
   * Turns cooperative gestures on or off. On, as every map starts, one
   * finger and a plain scroll move the page, and two fingers or Ctrl or ⌘
   * move the map. Off, as on a map filling the window, one finger pans and a
   * plain scroll zooms. Map does nothing when an engine leaves this out.
   */
  setCooperativeGestures?(cooperative: boolean): void
  /** Removes the map and everything it added to the container. */
  destroy(): void
}

/** What a map starts with when it mounts. */
export type MapMountOptions = MapView & {
  /** The map's name, for the engine's focusable canvas. */
  label: string
  /** The basemap's colours at first. */
  palette: MapPalette
}

/**
 * What draws a map. `mount` loads the engine's code, so nothing heavy runs
 * until a map is on screen.
 */
export interface MapEngine {
  /** Credits for the tiles, shown on every map. */
  readonly attribution: readonly MapAttribution[]
  /**
   * Draws a map into `container`. Resolves once it's ready, or rejects.
   * When `signal` aborts first, it stops loading, removes what it added, and
   * rejects with the signal's reason.
   */
  mount(
    container: HTMLElement,
    init: MapMountOptions,
    signal?: AbortSignal
  ): Promise<MapEngineInstance>
}
