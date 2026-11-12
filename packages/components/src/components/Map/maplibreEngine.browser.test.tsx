import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MapEngineInstance } from './engine'
import blankStyle from './fixtures/blank-style.json?url'
import { testPalette } from './mapTestUtils'
import { maplibreEngine } from './maplibreEngine'

const venue = { lat: -27.4575, lng: 153.0355 }

// A style served inline, so the suite never reaches the network.
const inlineStyle = (style: object) =>
  `data:application/json,${encodeURIComponent(JSON.stringify(style))}`

describe('maplibreEngine', () => {
  let container: HTMLDivElement
  let instance: MapEngineInstance | undefined

  beforeEach(() => {
    container = document.createElement('div')
    container.style.cssText = 'position:relative;width:400px;height:300px'
    document.body.append(container)
  })

  afterEach(() => {
    instance?.destroy()
    instance = undefined
    container.remove()
  })

  const mount = (style: string) =>
    maplibreEngine({ tiles: { light: style, attribution: [] } }).mount(
      container,
      { center: venue, zoom: 14, label: 'Map', palette: testPalette }
    )

  it(
    'gives an area its active look, and keeps it when the style loads again',
    { timeout: 15_000 },
    async () => {
      const { Map: MaplibreMap } = await import('maplibre-gl')
      // The engine keeps its map to itself, so the spy hands it over.
      const lit = vi.spyOn(MaplibreMap.prototype, 'setFeatureState')
      try {
        const engine = (instance = await mount(blankStyle))
        engine.setAreas([
          {
            id: 'valley',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [153.03, -27.46],
                  [153.04, -27.46],
                  [153.04, -27.45],
                  [153.03, -27.46]
                ]
              ]
            },
            fill: 'rgb(0, 0, 0)',
            fillOpacity: 0.5,
            line: 'rgb(0, 0, 0)'
          }
        ])
        engine.setActiveAreas!(['valley'])
        const map = lit.mock.contexts[0] as InstanceType<typeof MaplibreMap>
        const state = () =>
          map.getFeatureState({ source: 'roadie-areas', id: 'valley' })
        expect(state()).toEqual({ active: true })

        const loaded = new Promise((resolve) => map.once('style.load', resolve))
        map.setStyle(blankStyle, { diff: false })
        await loaded

        expect(state()).toEqual({ active: true })
      } finally {
        lit.mockRestore()
      }
    }
  )

  // Ready means drivable: the style is in. Tiles arrive when they arrive,
  // and waiting on them also waits on a rendered frame, which an idle page
  // may not paint (docs/solutions/test-failures/map-ready-before-tiles.md).
  it(
    'is ready once its style loads, before any tile arrives',
    { timeout: 5_000 },
    async () => {
      const { addProtocol, removeProtocol } = await import('maplibre-gl')
      // Tiles from this protocol never answer.
      addProtocol('never', () => new Promise(() => {}))
      try {
        instance = await mount(
          inlineStyle({
            version: 8,
            sources: {
              roads: { type: 'vector', tiles: ['never://{z}/{x}/{y}.pbf'] }
            },
            layers: [
              {
                id: 'roads',
                type: 'line',
                source: 'roads',
                'source-layer': 'roads'
              }
            ]
          })
        )
        expect(container.querySelector('canvas')).not.toBeNull()
      } finally {
        removeProtocol('never')
      }
    }
  )

  it(
    'hints in Roadie’s style, and holds a plain scroll, once gestures are cooperative again',
    { timeout: 15_000 },
    async () => {
      const map = (instance = await mount(blankStyle))
      const canvas = container.querySelector('canvas')!
      const scroll = () =>
        canvas.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -100,
            bubbles: true,
            cancelable: true,
            clientX: 200,
            clientY: 150
          })
        )
      const hint = () =>
        container.querySelector('.maplibregl-cooperative-gesture-screen')

      // Zooming on a plain scroll once they aren't is in the contract.
      map.setCooperativeGestures!(false)
      expect(hint()).toBeNull()

      map.setCooperativeGestures!(true)
      expect(hint()).toHaveClass('emphasis-overlay', 'text-display-ui-6')
      const zoom = map.getView().zoom
      const shown = new Promise<void>((resolve) => {
        const watcher = new MutationObserver(() => {
          if (!hint()!.classList.contains('maplibregl-show')) return
          watcher.disconnect()
          resolve()
        })
        watcher.observe(hint()!, { attributes: true })
      })
      scroll()
      await shown
      expect(map.getView().zoom).toBe(zoom)
    }
  )

  it('still loads when its tiles fail', { timeout: 15_000 }, async () => {
    const style = inlineStyle({
      version: 8,
      sources: {
        roads: {
          type: 'vector',
          // Nothing listens on port 1, so every tile fails at once. A 404
          // wouldn't do: MapLibre treats it as an empty tile.
          tiles: ['http://127.0.0.1:1/{z}/{x}/{y}.pbf']
        }
      },
      layers: [
        { id: 'background', type: 'background' },
        {
          id: 'roads',
          type: 'line',
          source: 'roads',
          'source-layer': 'roads'
        }
      ]
    })

    instance = await mount(style)
    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it(
    'rejects, leaving nothing behind, when its style can’t load',
    { timeout: 15_000 },
    async () => {
      await expect(
        mount(`${location.origin}/__missing-map-style__.json`)
      ).rejects.toBeInstanceOf(Error)
      expect(container.querySelector('canvas')).toBeNull()
    }
  )
})
