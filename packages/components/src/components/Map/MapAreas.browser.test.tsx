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

import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { MapEngineContext } from './MapEngineContext'
import blankStyle from './fixtures/blank-style.json?url'
import { Map, type MapActions, type MapAreaInView } from './index'
import { maplibreEngine } from './maplibreEngine'
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
const data = [
  { id: '4000', value: 30, label: '4000 Brisbane' },
  { id: '4101', value: 10 },
  { id: '3000', value: 60 }
]

let removeStylesheet: () => void
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function renderAreas(shapes = areas, values = data) {
  const actions = createRef<MapActions>()
  const seen: MapAreaInView[][] = []
  render(
    <div style={{ width: 480 }}>
      <MapEngineContext value={engine}>
        <Map
          defaultCenter={{ lat: -27.46, lng: 153.03 }}
          defaultZoom={9}
          actionsRef={actions}
        >
          <Map.Areas
            areas={shapes}
            data={values}
            label='Total'
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

describe('Map.Areas', () => {
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
