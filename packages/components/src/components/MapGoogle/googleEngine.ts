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

// An animated move takes Roadie's --duration-slower, easing out.
const EASE_MS = 400
const easeOut = (t: number) => 1 - (1 - t) ** 3

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

// Google's styles read only `#rrggbb`, and the palette's colours are `rgb()`.
// Google ignores a colour it can't read, so the map would keep its own.
function hex(color: string) {
  if (color.startsWith('#')) return color
  const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number)
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`
}

// Google's style rules for a map without a cloud map ID, from the palette.
const googleStyles = (colors: MapPalette) => {
  const palette = Object.fromEntries(
    Object.entries(colors).map(([name, color]) => [name, hex(color)])
  ) as MapPalette
  return [
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
}

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
      container.append(surface)
      const map = new maps.Map(surface, {
        center: init.center,
        zoom: init.zoom,
        mapId,
        // Without a cloud map ID, the map takes Roadie's colours.
        ...(!mapId && { styles: googleStyles(init.palette) }),
        // Roadie draws its own controls.
        disableDefaultUI: true,
        // Fits fill the frame, and eased moves pass between zoom levels.
        isFractionalZoomEnabled: true,
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

      // Google's focusable map is a region named "Map". Roadie's frame is the
      // landmark, so it becomes a named picture of the map, as MapLibre's
      // canvas is.
      const focusable = surface.querySelector<HTMLElement>('[tabindex="0"]')
      focusable?.setAttribute('role', 'img')
      focusable?.setAttribute('aria-label', init.label)

      const projection = () => overlay.getProjection()
      const view = () => ({
        center: toLatLng(map.getCenter()),
        zoom: map.getZoom() ?? init.zoom
      })
      // Google's own animations report where they end straight away, so pins
      // would jump ahead of the map. Eased moves step the camera each frame
      // instead, and a move ends only once they arrive.
      let easing: number | undefined
      const stopEasing = () => {
        if (easing !== undefined) cancelAnimationFrame(easing)
        easing = undefined
      }
      const ease = (to: { center?: LatLng; zoom?: number }) => {
        const from = toLatLng(map.getCenter())
        const fromZoom = map.getZoom() ?? init.zoom
        const center = to.center ?? from
        const zoom = to.zoom ?? fromZoom
        // The short way round, across the date line if it's nearer.
        const lngDelta = ((center.lng - from.lng + 540) % 360) - 180
        let start: number | undefined
        const step = (now: number) => {
          start ??= now
          const t = Math.min(1, (now - start) / EASE_MS)
          const k = easeOut(t)
          easing = t < 1 ? requestAnimationFrame(step) : undefined
          map.moveCamera({
            center: {
              lat: from.lat + (center.lat - from.lat) * k,
              lng: from.lng + lngDelta * k
            },
            zoom: fromZoom + (zoom - fromZoom) * k
          })
        }
        easing = requestAnimationFrame(step)
      }
      // Google's idle comes once a move has settled, but also between the
      // frames of an eased move, and late from one after it arrives. A move
      // ends once, where it arrived.
      const endsOfMoves = (listener: () => void) => {
        let ended: string | undefined
        return map.addListener('idle', () => {
          if (easing !== undefined) return
          const where = JSON.stringify(view())
          if (where === ended) return
          ended = where
          listener()
        })
      }
      // Someone moving the map takes over from an eased move.
      const dragging = map.addListener('dragstart', stopEasing)
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
        getView: view,
        setView: ({ center, zoom }, { animate = false } = {}) => {
          stopCapping()
          stopEasing()
          if (animate && !prefersReducedMotion()) ease({ center, zoom })
          else map.moveCamera({ center, zoom })
        },
        // Google eases a fit as it sees fit, so `animate` doesn't change it.
        fitBounds: (
          { southWest, northEast },
          { padding = 0, maxZoom } = {}
        ) => {
          stopCapping()
          stopEasing()
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
              : event === 'moveend'
                ? endsOfMoves(listener)
                : map.addListener('bounds_changed', () => listener())
          return () => handle.remove()
        }) as MapEngineInstance['on'],
        destroy: () => {
          stopCapping()
          stopEasing()
          dragging.remove()
          remove()
        }
      }
    }
  }
}
