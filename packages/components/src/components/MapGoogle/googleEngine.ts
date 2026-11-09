// A map engine on Google Maps. Google's terms put Places and Geocoding
// results on a Google map, so an app showing them uses this engine. Each map
// load counts against the app's Google Maps Platform billing.
//
// Only the parts of the Maps JavaScript API this engine calls are typed here,
// so Roadie needs no Google packages.
import type {
  LatLng,
  MapAreaLayer,
  MapEngine,
  MapEngineInstance,
  MapMountOptions,
  MapPalette
} from '../Map/engine'

type GoogleLatLng = { lat(): number; lng(): number }
type GooglePoint = { x: number; y: number }
type Listener = { remove(): void }
type DataFeature = { getProperty(name: string): unknown }
type DataLayer = {
  addGeoJson(collection: object): DataFeature[]
  remove(feature: DataFeature): void
  forEach(callback: (feature: DataFeature) => void): void
  setStyle(style: (feature: DataFeature) => object): void
}
type GoogleMap = {
  getCenter(): GoogleLatLng | undefined
  getZoom(): number | undefined
  moveCamera(camera: { center?: LatLng; zoom?: number }): void
  panTo(center: LatLng): void
  setZoom(zoom: number): void
  fitBounds(
    bounds: { south: number; west: number; north: number; east: number },
    padding?: number
  ): void
  setOptions(options: object): void
  data: DataLayer
  addListener(event: string, handler: (event?: unknown) => void): Listener
}
type Projection = {
  fromLatLngToContainerPixel(place: GoogleLatLng): GooglePoint | null
  fromContainerPixelToLatLng(pixel: GooglePoint): GoogleLatLng | null
}
type Overlay = {
  onAdd: () => void
  draw: () => void
  onRemove: () => void
  setMap(map: GoogleMap | null): void
  getProjection(): Projection | undefined
}
type GoogleMaps = {
  Map: new (container: HTMLElement, options: object) => GoogleMap
  LatLng: new (lat: number, lng: number) => GoogleLatLng
  Point: new (x: number, y: number) => GooglePoint
  OverlayView: new () => Overlay
  importLibrary(name: 'maps'): Promise<unknown>
}
type GoogleGlobal = {
  google?: { maps?: GoogleMaps }
  __roadieGoogleMapsReady?: () => void
}

export type GoogleEngineOptions = {
  /**
   * A Maps JavaScript API key, restricted to the app's domains. It's sent to
   * the browser, so never use an unrestricted key.
   */
  apiKey: string
  /** A map ID from Google Cloud, which sets the map's cloud style. */
  mapId?: string
}

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

let loading: Promise<GoogleMaps> | undefined

function loadGoogleMaps(apiKey: string): Promise<GoogleMaps> {
  const page = globalThis as GoogleGlobal
  if (page.google?.maps?.Map) return Promise.resolve(page.google.maps)
  loading ??= new Promise<GoogleMaps>((resolve, reject) => {
    const callback = '__roadieGoogleMapsReady'
    page.__roadieGoogleMapsReady = () => {
      delete page.__roadieGoogleMapsReady
      if (page.google?.maps) resolve(page.google.maps)
      else reject(new Error('Google Maps loaded without its API'))
    }
    const script = document.createElement('script')
    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams(
      { key: apiKey, v: 'weekly', loading: 'async', callback }
    )}`
    script.onerror = () => {
      loading = undefined
      script.remove()
      reject(new Error('Google Maps failed to load'))
    }
    document.head.append(script)
  })
  return loading
}

// Google's style rules for a map without a cloud map ID, from the palette.
const googleStyles = (palette: MapPalette) => [
  { elementType: 'geometry', stylers: [{ color: palette.land }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }, { color: palette.park }]
  },
  { featureType: 'water', stylers: [{ color: palette.water }] },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [{ color: palette.road }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: palette.roadCasing }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.fill',
    stylers: [{ color: palette.roadMajor }]
  },
  { featureType: 'transit.line', stylers: [{ color: palette.rail }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: palette.border }]
  },
  { elementType: 'labels.text.fill', stylers: [{ color: palette.label }] },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: palette.labelHalo }]
  },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
]

const areaCollection = (areas: readonly MapAreaLayer[]) => ({
  type: 'FeatureCollection',
  features: areas.map(({ id, geometry, fill, fillOpacity, line }) => ({
    type: 'Feature',
    id,
    geometry,
    properties: { fill, fillOpacity, line }
  }))
})

const toLatLng = (place: GoogleLatLng | null | undefined): LatLng =>
  place ? { lat: place.lat(), lng: place.lng() } : { lat: 0, lng: 0 }

/**
 * Google Maps as Map's engine. Google draws its own logo and terms, which
 * must stay on the map, so Roadie shows no credits of its own.
 */
export function googleEngine({
  apiKey,
  mapId
}: GoogleEngineOptions): MapEngine {
  return {
    attribution: [],
    async mount(
      container,
      init: MapMountOptions,
      signal?: AbortSignal
    ): Promise<MapEngineInstance> {
      const maps = await loadGoogleMaps(apiKey)
      await maps.importLibrary('maps')
      signal?.throwIfAborted()

      const surface = document.createElement('div')
      surface.style.cssText = 'position:absolute;inset:0'
      surface.setAttribute('aria-label', init.label)
      container.append(surface)
      const map = new maps.Map(surface, {
        center: init.center,
        zoom: init.zoom,
        mapId,
        // Without a cloud map ID, the map takes Roadie's colours.
        ...(!mapId && { styles: googleStyles(init.palette) }),
        // Roadie draws its own controls.
        disableDefaultUI: true,
        // Scrolling the page never zooms the map; Ctrl or ⌘ does.
        gestureHandling: 'cooperative',
        clickableIcons: false
      })

      map.data.setStyle((feature) => ({
        fillColor: feature.getProperty('fill'),
        fillOpacity: feature.getProperty('fillOpacity'),
        strokeColor: feature.getProperty('line'),
        strokeWeight: 2,
        clickable: false
      }))

      // An empty overlay gives Google's projection between places and pixels.
      const overlay = new maps.OverlayView()
      overlay.onAdd = () => {}
      overlay.draw = () => {}
      overlay.onRemove = () => {}
      overlay.setMap(map)

      const remove = () => {
        overlay.setMap(null)
        surface.remove()
      }

      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          idle.remove()
          remove()
          reject(signal?.reason)
        }
        const idle = map.addListener('idle', () => {
          idle.remove()
          signal?.removeEventListener('abort', abort)
          resolve()
        })
        signal?.addEventListener('abort', abort, { once: true })
      })

      const projection = () => overlay.getProjection()
      // A fit's zoom cap, waiting for the fit to settle. A newer move drops
      // it, so it can't pull a later zoom back.
      let capping: Listener | undefined
      const stopCapping = () => {
        capping?.remove()
        capping = undefined
      }

      return {
        setPalette: (palette) => {
          if (!mapId) map.setOptions({ styles: googleStyles(palette) })
        },
        setAreas: (areas) => {
          map.data.forEach((feature) => map.data.remove(feature))
          map.data.addGeoJson(areaCollection(areas))
        },
        setCooperativeGestures: (cooperative) =>
          map.setOptions({
            gestureHandling: cooperative ? 'cooperative' : 'greedy'
          }),
        getView: () => ({
          center: toLatLng(map.getCenter()),
          zoom: map.getZoom() ?? init.zoom
        }),
        setView: ({ center, zoom }, { animate = false } = {}) => {
          stopCapping()
          if (animate && !prefersReducedMotion()) {
            if (center) map.panTo(center)
            if (zoom !== undefined) map.setZoom(zoom)
          } else {
            map.moveCamera({ center, zoom })
          }
        },
        // Google eases a fit as it sees fit, so `animate` doesn't change it.
        fitBounds: (
          { southWest, northEast },
          { padding = 0, maxZoom } = {}
        ) => {
          stopCapping()
          map.fitBounds(
            {
              south: southWest.lat,
              west: southWest.lng,
              north: northEast.lat,
              east: northEast.lng
            },
            padding
          )
          // Google has no maxZoom for a fit, so the zoom comes back after.
          if (maxZoom === undefined) return
          capping = map.addListener('idle', () => {
            stopCapping()
            if ((map.getZoom() ?? 0) > maxZoom) map.setZoom(maxZoom)
          })
        },
        project: (place) =>
          projection()?.fromLatLngToContainerPixel(
            new maps.LatLng(place.lat, place.lng)
          ) ?? { x: 0, y: 0 },
        unproject: ({ x, y }) =>
          toLatLng(
            projection()?.fromContainerPixelToLatLng(new maps.Point(x, y))
          ),
        on: ((
          event: 'move' | 'moveend' | 'click',
          listener: (place?: LatLng) => void
        ) => {
          const handle =
            event === 'click'
              ? map.addListener('click', (clicked) =>
                  listener(
                    toLatLng((clicked as { latLng?: GoogleLatLng }).latLng)
                  )
                )
              : map.addListener(
                  // Google's idle comes once a move has settled.
                  event === 'moveend' ? 'idle' : 'bounds_changed',
                  () => listener()
                )
          return () => handle.remove()
        }) as MapEngineInstance['on'],
        destroy: () => {
          stopCapping()
          remove()
        }
      }
    }
  }
}
