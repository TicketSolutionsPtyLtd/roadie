import { afterEach, beforeEach } from 'vitest'

import type { MapEngineInstance } from './engine'
import { testPalette } from './mapTestUtils'
import { type MaplibreEngineOptions, maplibreEngine } from './maplibreEngine'

// MapLibre's worker URL is one setting for the whole page, and stays once
// set, so each file that uses this mounts one map only.

const venue = { lat: -27.4575, lng: 153.0355 }

// A GeoJSON source is parsed in the worker, so the map needs it to draw.
const style = `data:application/json,${encodeURIComponent(
  JSON.stringify({
    version: 8,
    sources: {
      venue: {
        type: 'geojson',
        data: { type: 'Point', coordinates: [venue.lng, venue.lat] }
      }
    },
    layers: [{ id: 'venue', type: 'circle', source: 'venue' }]
  })
)}`

/**
 * Notes which workers load and answer, and which fail to load, while a map
 * from `maplibreEngine` is mounted.
 */
export function watchWorkers() {
  const NativeWorker = globalThis.Worker
  const workers = { answered: [] as string[], failed: [] as string[] }
  let container: HTMLDivElement
  let instance: MapEngineInstance | undefined

  beforeEach(() => {
    globalThis.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options)
        const name = String(url)
        this.addEventListener('message', () => workers.answered.push(name), {
          once: true
        })
        this.addEventListener('error', () => workers.failed.push(name), {
          once: true
        })
      }
    }
    container = document.createElement('div')
    container.style.cssText = 'position:relative;width:400px;height:300px'
    document.body.append(container)
  })

  afterEach(() => {
    globalThis.Worker = NativeWorker
    instance?.destroy()
    container.remove()
  })

  const mount = async (options: Omit<MaplibreEngineOptions, 'tiles'> = {}) => {
    instance = await maplibreEngine({
      ...options,
      tiles: { light: style, attribution: [] }
    }).mount(container, {
      center: venue,
      zoom: 14,
      label: 'Map',
      palette: testPalette
    })
  }

  return { workers, mount }
}
