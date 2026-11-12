import { createRef } from 'react'

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Map, type MapActions } from '../Map'
import { MapEngineContext } from '../Map/MapEngineContext'
import type { MapAreaLayer, MapEngine } from '../Map/engine'
import blankStyle from '../Map/fixtures/blank-style.json?url'
import { maplibreEngine } from '../Map/maplibreEngine'
import { useStylesheet } from '../testUtils'
import { type MapAreaInView, MapAreas } from './MapAreas'
import type { MapAreaCollection } from './topology'

const engine = maplibreEngine({
  tiles: { light: blankStyle, attribution: [{ label: 'Fixture' }] }
})

const square = (west: number, south: number, size: number) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [west, south],
      [west + size, south],
      [west + size, south + size],
      [west, south + size],
      [west, south]
    ] as [number, number][]
  ]
})

// One area round the map's middle, a smaller one beside it, and one a
// thousand kilometres south.
const areas: MapAreaCollection = {
  type: 'FeatureCollection',
  features: [
    { id: '4000', geometry: square(152.98, -27.51, 0.1) },
    { id: '4101', geometry: square(153.1, -27.51, 0.05) },
    { id: '3000', geometry: square(144.9, -37.85, 0.1) }
  ]
}
// Not in order of value, so the order reported is the map's.
const data = [
  { id: '4101', value: 10 },
  { id: '4000', value: 30, label: '4000 Brisbane' },
  { id: '3000', value: 60 }
]
// One area that covers the whole map.
const everywhere: MapAreaCollection = {
  type: 'FeatureCollection',
  features: [{ id: '4000', geometry: square(152, -28.5, 2) }]
}

let removeStylesheet: () => void
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark')
})

async function renderAreas(
  shapes = areas,
  values = data,
  {
    width = 480,
    legend = false,
    drawnBy = engine
  }: { width?: number; legend?: boolean; drawnBy?: MapEngine } = {}
) {
  const actions = createRef<MapActions>()
  const seen: MapAreaInView[][] = []
  render(
    <div style={{ width }}>
      <MapEngineContext value={drawnBy}>
        <Map
          defaultCenter={{ lat: -27.46, lng: 153.03 }}
          defaultZoom={9}
          actionsRef={actions}
        >
          <MapAreas
            areas={shapes}
            data={values}
            label='Total'
            legend={legend}
            onAreasChange={(inView) => seen.push(inView)}
          />
        </Map>
      </MapEngineContext>
    </div>
  )
  const frame = screen.getByRole('region', { name: 'Map' })
  await waitFor(() => expect(frame).toHaveAttribute('data-status', 'ready'), {
    timeout: 10_000
  })
  return { frame, actions, seen }
}

describe('MapAreas', () => {
  it(
    'lists the areas on the map, largest first, as the map settles',
    { timeout: 20_000 },
    async () => {
      const { actions, seen } = await renderAreas()
      await waitFor(() =>
        expect(seen.at(-1)?.map(({ id }) => id)).toEqual(['4000', '4101'])
      )
      expect(seen.at(-1)![0]).toEqual({
        id: '4000',
        label: '4000 Brisbane',
        value: 30,
        share: 0.3
      })

      actions.current!.flyTo({ center: { lat: -37.8, lng: 144.95 } })
      await waitFor(
        () => expect(seen.at(-1)?.map(({ id }) => id)).toEqual(['3000']),
        { timeout: 10_000 }
      )
    }
  )

  it(
    'names the area under the pointer, with its value and share',
    { timeout: 20_000 },
    async () => {
      const { frame } = await renderAreas()
      await userEvent.hover(frame, { position: { x: 240, y: 20 } })
      expect(
        document.querySelector('[data-slot="map-areas-tip"]')
      ).not.toBeInTheDocument()

      const { height } = frame.getBoundingClientRect()
      await userEvent.hover(frame, {
        position: { x: 240, y: Math.round(height / 2) + 8 }
      })
      await waitFor(() =>
        expect(
          document.querySelector('[data-slot="map-areas-tip"]')
        ).toHaveTextContent('4000 BrisbaneTotal: 30, 30% of all')
      )
    }
  )

  it(
    'keeps the label inside the map beside any of its edges',
    { timeout: 20_000 },
    async () => {
      const { frame } = await renderAreas(everywhere, [
        { id: '4000', value: 30, label: '4000 Brisbane' }
      ])
      const tip = () =>
        document.querySelector<HTMLElement>('[data-slot="map-areas-tip"]')
      const map = frame.getBoundingClientRect()

      await userEvent.hover(frame, { position: { x: 20, y: 20 } })
      await waitFor(() => expect(tip()).toBeInTheDocument())
      // With room, below and to the right of the pointer.
      expect(tip()!.getBoundingClientRect().left).toBeGreaterThan(map.left + 20)
      expect(tip()!.getBoundingClientRect().top).toBeGreaterThan(map.top + 20)

      // By the right edge, it sits left of the pointer.
      const right = { x: map.width - 20, y: Math.round(map.height / 2) }
      await userEvent.hover(frame, { position: right })
      await waitFor(() =>
        expect(tip()!.getBoundingClientRect().right).toBeLessThan(
          map.left + right.x
        )
      )
      expect(tip()!.getBoundingClientRect().left).toBeGreaterThan(map.left)

      // By the bottom edge, above it.
      const bottom = { x: Math.round(map.width / 2), y: map.height - 12 }
      await userEvent.hover(frame, { position: bottom })
      await waitFor(() =>
        expect(tip()!.getBoundingClientRect().bottom).toBeLessThan(
          map.top + bottom.y
        )
      )
      expect(tip()!.getBoundingClientRect().top).toBeGreaterThan(map.top)
    }
  )

  it(
    'keys each colour’s range on a wide map, and the least and most on a small one',
    { timeout: 30_000 },
    async () => {
      const key = () =>
        document.querySelector<HTMLElement>('[data-slot="map-cluster-legend"]')!
      await renderAreas(areas, data, { legend: true })
      await waitFor(() => expect(key()).toBeInTheDocument())
      const ranges = () => key().querySelector('ul')!
      const ends = () => key().querySelector(':scope > div')!

      expect(ranges()).toBeVisible()
      expect(ranges()).toHaveTextContent('603010')
      expect(ends()).not.toBeVisible()

      cleanup()
      await renderAreas(areas, data, { legend: true, width: 320 })
      await waitFor(() => expect(key()).toBeInTheDocument())

      expect(ends()).toBeVisible()
      expect(ends()).toHaveTextContent('1060')
      expect(ranges()).not.toBeVisible()
    }
  )

  it(
    'draws the areas again in the mode’s colours when the mode changes',
    { timeout: 20_000 },
    async () => {
      let drawn: readonly MapAreaLayer[] = []
      // The engine's own instance, saying what it was asked to draw.
      const recording: MapEngine = {
        attribution: engine.attribution,
        mount: async (...mounting) => {
          const instance = await engine.mount(...mounting)
          return {
            ...instance,
            setAreas: (layers) => {
              drawn = layers
              instance.setAreas(layers)
            }
          }
        }
      }
      await renderAreas(areas, data, { drawnBy: recording })
      await waitFor(() => expect(drawn).toHaveLength(3))
      const light = drawn.map(({ fill }) => fill)

      document.documentElement.classList.add('dark')

      await waitFor(() => {
        expect(drawn).toHaveLength(3)
        for (const [index, { fill }] of drawn.entries())
          expect(fill).not.toBe(light[index])
      })
    }
  )

  it(
    'lists an area in a corner of a turned map',
    { timeout: 20_000 },
    async () => {
      const { Map: MaplibreMap } = await import('maplibre-gl')
      // The engine keeps its map to itself, so the spy hands it over.
      const mounted = vi.spyOn(MaplibreMap.prototype, 'getCanvas')
      try {
        // North of the map's middle, by about 100px.
        const north: MapAreaCollection = {
          type: 'FeatureCollection',
          features: [{ id: '4051', geometry: square(153, -27.36, 0.05) }]
        }
        const { frame, seen } = await renderAreas(north, [
          { id: '4051', value: 20 }
        ])
        await waitFor(() =>
          expect(seen.at(-1)?.map(({ id }) => id)).toEqual(['4051'])
        )
        const map = mounted.mock.contexts[0] as InstanceType<typeof MaplibreMap>
        const { width, height } = frame.getBoundingClientRect()
        // Turned so the frame's top-left and bottom-right corners sit due
        // west and east of its middle: the area is in the top-right corner,
        // north of both.
        // MapLibre tells its listeners before this returns.
        map.setBearing((-Math.atan(height / width) * 180) / Math.PI)

        expect(seen.at(-1)!.map(({ id }) => id)).toEqual(['4051'])
      } finally {
        mounted.mockRestore()
      }
    }
  )
})
