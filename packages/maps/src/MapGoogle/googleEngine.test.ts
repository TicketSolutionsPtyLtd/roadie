import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LatLng, MapEngineInstance } from '../Map/engine'
import { testPalette as palette } from '../Map/mapTestUtils'
import { googleEngine } from './googleEngine'

// A stand-in for the parts of the Maps JavaScript API the engine calls, so
// these run without a key. engine.contract.browser.test.tsx runs the real
// thing when VITE_GOOGLE_MAPS_KEY is set.

type Style = { stylers: { color?: string }[] }
type Options = { mapId?: string; styles?: Style[] }
type Feature = { getProperty: (name: string) => unknown }
type AreaStyle = (feature: Feature) => Record<string, unknown>

class FakeMap {
  static made: FakeMap[] = []
  options: Options
  styles: Style[] | undefined
  center: LatLng
  zoom: number
  handlers: Record<string, Set<() => void>> = {}
  areaStyle: AreaStyle | undefined
  features: Feature[] = []
  data = {
    setStyle: (style: AreaStyle) => {
      this.areaStyle = style
    },
    addGeoJson: (collection: {
      features: { properties: Record<string, unknown> }[]
    }) => {
      this.features = collection.features.map(({ properties }) => ({
        getProperty: (name) => properties[name]
      }))
      return this.features
    },
    remove() {},
    forEach() {}
  }

  constructor(
    surface: HTMLElement,
    options: Options & { center: LatLng; zoom: number }
  ) {
    // Google's own focusable map, as it draws it.
    const focusable = document.createElement('div')
    focusable.tabIndex = 0
    focusable.setAttribute('role', 'region')
    focusable.setAttribute('aria-label', 'Map')
    surface.append(focusable)
    this.options = options
    this.styles = options.styles
    this.center = options.center
    this.zoom = options.zoom
    FakeMap.made.push(this)
    this.settle()
  }

  // Google says it's idle a moment after each change.
  settle() {
    setTimeout(() => this.handlers.idle?.forEach((handler) => handler()))
  }

  getCenter() {
    const { lat, lng } = this.center
    return { lat: () => lat, lng: () => lng }
  }
  getZoom() {
    return this.zoom
  }
  moveCamera({ center, zoom }: { center?: LatLng; zoom?: number }) {
    if (center) this.center = center
    if (zoom !== undefined) this.zoom = zoom
    this.settle()
  }
  setZoom(zoom: number) {
    this.moveCamera({ zoom })
  }
  fitBounds() {}
  setOptions(options: Options) {
    if (options.styles) this.styles = options.styles
  }
  addListener(event: string, handler: () => void) {
    ;(this.handlers[event] ??= new Set()).add(handler)
    return { remove: () => this.handlers[event]?.delete(handler) }
  }
}

class FakeOverlay {
  onAdd = () => {}
  draw = () => {}
  onRemove = () => {}
  setMap() {}
  getProjection() {
    return undefined
  }
}

const colours = (styles: Style[] | undefined) =>
  (styles ?? []).flatMap(({ stylers }) =>
    stylers.flatMap(({ color }) => (color ? [color] : []))
  )

describe('googleEngine', () => {
  let container: HTMLDivElement
  let instance: MapEngineInstance | undefined

  beforeEach(() => {
    FakeMap.made = []
    vi.stubGlobal('google', {
      maps: {
        Map: FakeMap,
        LatLng: class {},
        Point: class {},
        OverlayView: FakeOverlay,
        importLibrary: async () => ({})
      }
    })
    container = document.createElement('div')
    document.body.append(container)
  })

  afterEach(() => {
    instance?.destroy()
    instance = undefined
    container.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const mount = async (mapId?: string) => {
    instance = await googleEngine({ apiKey: 'test', mapId }).mount(container, {
      center: { lat: -27.4575, lng: 153.0355 },
      zoom: 14,
      label: 'Where Kazoo Hollow Room is',
      palette
    })
    return { map: instance, google: FakeMap.made[0]! }
  }

  it('styles the map in the palette’s colours, as the hex Google reads', async () => {
    const { google } = await mount()

    expect(colours(google.styles)).not.toHaveLength(0)
    for (const colour of colours(google.styles))
      expect(colour).toMatch(/^#[0-9a-f]{6}$/)
    // The land, from rgb(244, 244, 244).
    expect(colours(google.styles)[0]).toBe('#f4f4f4')
  })

  it('restyles in hex when the palette changes', async () => {
    const { map, google } = await mount()
    map.setPalette({ ...palette, land: 'rgb(10, 20, 30)' })

    expect(colours(google.styles)[0]).toBe('#0a141e')
  })

  it('keeps the cloud style of a map ID', async () => {
    const { map, google } = await mount('a-map-id')
    map.setPalette(palette)

    expect(google.options.mapId).toBe('a-map-id')
    expect(google.styles).toBeUndefined()
  })

  it('outlines each area at its own width, or 2px when it gives none', async () => {
    const { map, google } = await mount()
    const area = {
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [153.03, -27.46],
            [153.04, -27.46],
            [153.04, -27.45],
            [153.03, -27.46]
          ] as [number, number][]
        ]
      },
      fill: 'rgb(0, 0, 0)',
      fillOpacity: 0.5,
      line: 'rgb(0, 0, 0)'
    }
    map.setAreas([
      { ...area, id: 'thin', lineWidth: 0.5 },
      { ...area, id: 'plain' }
    ])

    expect(
      google.features.map((feature) => google.areaStyle!(feature).strokeWeight)
    ).toEqual([0.5, 2])
  })

  it('names Google’s focusable map with the label, inside Roadie’s landmark', async () => {
    await mount()
    const focusable = container.querySelector('[tabindex="0"]')!

    expect(focusable.getAttribute('aria-label')).toBe(
      'Where Kazoo Hollow Room is'
    )
    expect(focusable.getAttribute('role')).not.toBe('region')
  })

  it('eases a move frame by frame, and ends it once it arrives', async () => {
    const { map, google } = await mount()
    vi.useFakeTimers({
      toFake: ['setTimeout', 'requestAnimationFrame', 'cancelAnimationFrame']
    })
    const ends: number[] = []
    map.on('moveend', () => ends.push(map.getView().zoom))
    map.setView({ zoom: 16 }, { animate: true })

    // Partway, the map is between, and Google's idle between frames isn't
    // the end of the move.
    await vi.advanceTimersByTimeAsync(100)
    expect(map.getView().zoom).toBeGreaterThan(14)
    expect(map.getView().zoom).toBeLessThan(16)
    expect(ends).toEqual([])

    await vi.advanceTimersByTimeAsync(500)
    expect(map.getView().zoom).toBe(16)
    expect(ends).toEqual([16])

    // An idle from a frame, arriving late, isn't a second end.
    google.settle()
    await vi.advanceTimersByTimeAsync(10)
    expect(ends).toEqual([16])
  })

  it('stops an eased move for a newer one', async () => {
    const { map } = await mount()
    vi.useFakeTimers({
      toFake: ['setTimeout', 'requestAnimationFrame', 'cancelAnimationFrame']
    })
    map.setView({ zoom: 18 }, { animate: true })
    await vi.advanceTimersByTimeAsync(100)
    map.setView({ zoom: 12 })
    await vi.advanceTimersByTimeAsync(500)

    expect(map.getView().zoom).toBe(12)
  })

  it('stops an eased move when someone drags the map', async () => {
    const { map, google } = await mount()
    vi.useFakeTimers({
      toFake: ['setTimeout', 'requestAnimationFrame', 'cancelAnimationFrame']
    })
    map.setView({ zoom: 18 }, { animate: true })
    await vi.advanceTimersByTimeAsync(100)
    google.handlers.dragstart?.forEach((handler) => handler())
    const held = map.getView().zoom
    await vi.advanceTimersByTimeAsync(500)

    expect(map.getView().zoom).toBe(held)
  })
})
