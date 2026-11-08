import type {
  LatLng,
  MapAreaLayer,
  MapAttribution,
  MapEngine,
  MapEngineInstance,
  MapMountOptions,
  MapPalette
} from './engine'
import { roadieStyle } from './roadieStyle'

export type MaplibreEngineTiles = {
  /** The address of a MapLibre style for light mode. */
  light: string
  /** Credits the tiles' licence asks for. */
  attribution: readonly MapAttribution[]
}

export type MaplibreEngineOptions = {
  /**
   * A MapLibre style of your own, with its credits. Without it, the map draws
   * Roadie's style on OpenFreeMap's tiles, in the colours around the map.
   */
  tiles?: MaplibreEngineTiles
  /**
   * Where MapLibre's worker file is served. Next.js, webpack and Vite serve
   * it with the app without this. With another bundler, copy
   * `maplibre-gl/dist/maplibre-gl-worker.mjs` into the app and pass its URL.
   */
  workerUrl?: string
}

// Webpack, Turbopack (which Next.js uses) and Vite read this pattern and
// serve the worker file as part of the app. An app that set its own worker URL
// with MapLibre's `setWorkerUrl` keeps it.
const defaultWorkerUrl = () =>
  new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href

const OPENFREEMAP_ATTRIBUTION: readonly MapAttribution[] = [
  { label: 'OpenFreeMap', href: 'https://openfreemap.org' },
  { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  {
    label: '© OpenStreetMap contributors',
    href: 'https://www.openstreetmap.org/copyright'
  }
]

const AREAS = 'roadie-areas'

const areaData = (areas: readonly MapAreaLayer[]) => ({
  type: 'FeatureCollection' as const,
  features: areas.map(({ id, geometry, fill, fillOpacity, line }) => ({
    type: 'Feature' as const,
    id,
    geometry,
    properties: { fill, fillOpacity, line }
  }))
})

const areaLayers = [
  {
    id: `${AREAS}-fill`,
    type: 'fill',
    source: AREAS,
    paint: {
      'fill-color': ['get', 'fill'],
      'fill-opacity': ['get', 'fillOpacity']
    }
  },
  {
    id: `${AREAS}-line`,
    type: 'line',
    source: AREAS,
    paint: { 'line-color': ['get', 'line'], 'line-width': 2 }
  }
] as const

type StyleSpecification = import('maplibre-gl').StyleSpecification
type AddLayerObject = import('maplibre-gl').AddLayerObject
// MapLibre spreads a failed tile onto its error event.
type MaplibreError = import('maplibre-gl').ErrorEvent & { tile?: unknown }

const toLngLat = ({ lat, lng }: LatLng): [number, number] => [lng, lat]

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The built-in engine: MapLibre GL, with OpenFreeMap tiles unless given
 * others. MapLibre loads when the first map mounts.
 */
export function maplibreEngine(options: MaplibreEngineOptions = {}): MapEngine {
  const { tiles, workerUrl } = options

  return {
    attribution: tiles?.attribution ?? OPENFREEMAP_ATTRIBUTION,
    async mount(
      container,
      init: MapMountOptions,
      signal?: AbortSignal
    ): Promise<MapEngineInstance> {
      const { Map, getWorkerUrl, setWorkerUrl } = await import('maplibre-gl')
      signal?.throwIfAborted()
      // MapLibre 6 draws tiles in a worker loaded from its own file.
      if (workerUrl) setWorkerUrl(workerUrl)
      else if (!getWorkerUrl()) setWorkerUrl(defaultWorkerUrl())
      let areas: readonly MapAreaLayer[] = []
      // Roadie's style carries the areas, so restyling keeps them.
      const styled = (palette: MapPalette) => {
        const style = roadieStyle(palette)
        return {
          ...style,
          sources: {
            ...style.sources,
            [AREAS]: { type: 'geojson', data: areaData(areas) }
          },
          layers: [...style.layers, ...areaLayers]
        } as unknown as StyleSpecification
      }
      const map = new Map({
        container,
        style: tiles ? tiles.light : styled(init.palette),
        center: toLngLat(init.center),
        zoom: init.zoom,
        // Roadie draws its own credits and controls.
        attributionControl: false,
        // Scrolling the page never zooms the map; Ctrl or ⌘ does.
        cooperativeGestures: true
      })
      // The canvas takes focus for keyboard panning. Roadie's frame is the
      // landmark, so the canvas is a named picture of the map inside it.
      const canvas = map.getCanvas()
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-roledescription', 'map')
      canvas.setAttribute('aria-label', init.label)
      // Roadie's overlay and text style for the hint shown when the page
      // scrolls across the map. map.css places and fades it. MapLibre makes
      // the hint afresh each time cooperative gestures turn on.
      const styleHint = () =>
        container
          .querySelector('.maplibregl-cooperative-gesture-screen')
          ?.classList.add('emphasis-overlay', 'text-display-ui-6')
      styleHint()

      await new Promise<void>((resolve, reject) => {
        const stop = () => {
          map.off('error', fail)
          map.off('style.load', ready)
          signal?.removeEventListener('abort', abort)
        }
        const fail = (event: MaplibreError) => {
          // A tile that fails leaves a gap, not a broken map: MapLibre
          // still loads, so only the style or the engine failing counts.
          if (event.tile) return
          stop()
          map.remove()
          reject(
            event.error instanceof Error
              ? event.error
              : new Error(event.error?.message ?? 'The map failed to load')
          )
        }
        const abort = () => {
          stop()
          map.remove()
          reject(signal?.reason)
        }
        const ready = () => {
          stop()
          resolve()
        }
        // Ready once the style is in, not when every first tile has drawn:
        // MapLibre's 'load' waits on tiles and a rendered frame, which an
        // idle page may never paint, and the map is usable without them.
        map.once('style.load', ready)
        map.on('error', fail)
        signal?.addEventListener('abort', abort, { once: true })
      })

      // A style of the app's own gets the area layers once it loads.
      const addAreaLayers = () => {
        if (map.getSource(AREAS)) return
        map.addSource(AREAS, { type: 'geojson', data: areaData(areas) })
        for (const layer of areaLayers)
          map.addLayer(layer as unknown as AddLayerObject)
      }
      if (tiles) {
        addAreaLayers()
        map.on('style.load', addAreaLayers)
      }
      let removed = false

      return {
        setPalette: (palette) => {
          if (!tiles) map.setStyle(styled(palette), { diff: true })
        },
        setCooperativeGestures: (cooperative) => {
          if (removed) return
          if (cooperative) {
            map.cooperativeGestures.enable()
            styleHint()
          } else {
            map.cooperativeGestures.disable()
          }
        },
        setAreas: (next) => {
          areas = next
          const source = map.getSource(AREAS) as
            | { setData(data: ReturnType<typeof areaData>): void }
            | undefined
          source?.setData(areaData(next))
        },
        getView: () => {
          const { lat, lng } = map.getCenter()
          return { center: { lat, lng }, zoom: map.getZoom() }
        },
        setView: ({ center, zoom }, { animate = false } = {}) => {
          const camera = {
            ...(center && { center: toLngLat(center) }),
            ...(zoom !== undefined && { zoom })
          }
          if (animate && !prefersReducedMotion()) map.easeTo(camera)
          else map.jumpTo(camera)
        },
        project: (place) => {
          const { x, y } = map.project(toLngLat(place))
          return { x, y }
        },
        unproject: ({ x, y }) => {
          const { lat, lng } = map.unproject([x, y])
          return { lat, lng }
        },
        on: ((event: 'move' | 'click', listener: (place?: LatLng) => void) => {
          if (event === 'click') {
            const click = ({ lngLat }: { lngLat: LatLng }) =>
              listener({ lat: lngLat.lat, lng: lngLat.lng })
            map.on('click', click)
            return () => {
              map.off('click', click)
            }
          }
          const move = () => listener()
          map.on('move', move)
          return () => {
            map.off('move', move)
          }
        }) as MapEngineInstance['on'],
        destroy: () => {
          removed = true
          map.remove()
        }
      }
    }
  }
}
