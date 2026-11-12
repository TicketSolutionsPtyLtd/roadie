import { useState } from 'react'

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Map } from '../Map'
import type { MapAreaLayer } from '../Map/engine'
import { fakeEngine, renderMap } from '../Map/mapTestUtils'
import { type MapAreaInView, MapAreas } from './MapAreas'
import {
  type MapAreaCollection,
  type MapAreaTopology,
  areaFeatures
} from './topology'

// Two squares side by side that share their middle edge, stored once.
const topology: MapAreaTopology = {
  type: 'Topology',
  transform: { scale: [0.5, 0.5], translate: [150, -30] },
  arcs: [
    // The shared edge, (2,0) up to (2,2).
    [
      [2, 0],
      [0, 2]
    ],
    // The left square's other three sides, (2,2) round to (2,0).
    [
      [2, 2],
      [-2, 0],
      [0, -2],
      [2, 0]
    ],
    // The right square's other three sides, (2,0) round to (2,2).
    [
      [2, 0],
      [2, 0],
      [0, 2],
      [-2, 0]
    ]
  ],
  objects: {
    postcodes: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', id: '4000', arcs: [[0, 1]] },
        { type: 'Polygon', id: '4001', arcs: [[2, ~0]] },
        { type: null, id: '9494' }
      ]
    }
  }
}

describe('areaFeatures', () => {
  it('reads TopoJSON, joining shared edges and leaving out empty areas', () => {
    const [left, right, ...rest] = areaFeatures(topology)

    expect(rest).toEqual([])
    expect(left).toEqual({
      id: '4000',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [151, -30],
            [151, -29],
            [150, -29],
            [150, -30],
            [151, -30]
          ]
        ]
      }
    })
    // The shared edge runs backwards to close the right square.
    expect(right!.geometry.coordinates).toEqual([
      [
        [151, -30],
        [152, -30],
        [152, -29],
        [151, -29],
        [151, -30]
      ]
    ])
  })

  it('reads GeoJSON ids from a property when given one', () => {
    const square = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [150, -30],
          [151, -30],
          [151, -29],
          [150, -30]
        ] as [number, number][]
      ]
    }
    const collection: MapAreaCollection = {
      type: 'FeatureCollection',
      features: [
        { properties: { POA_CODE21: '4000' }, geometry: square },
        { properties: { POA_CODE21: '9797' }, geometry: null },
        { properties: {}, geometry: square }
      ]
    }

    expect(areaFeatures(collection, { idProperty: 'POA_CODE21' })).toEqual([
      { id: '4000', geometry: square }
    ])
  })

  it('reads a TopoJSON area in several parts, such as a postcode with islands', () => {
    const [both, ...rest] = areaFeatures({
      ...topology,
      objects: {
        postcodes: {
          type: 'GeometryCollection',
          geometries: [
            { type: 'MultiPolygon', id: '4000', arcs: [[[0, 1]], [[2, ~0]]] }
          ]
        }
      }
    })

    expect(rest).toEqual([])
    expect(both).toEqual({
      id: '4000',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [151, -30],
              [151, -29],
              [150, -29],
              [150, -30],
              [151, -30]
            ]
          ],
          [
            [
              [151, -30],
              [152, -30],
              [152, -29],
              [151, -29],
              [151, -30]
            ]
          ]
        ]
      }
    })
  })

  it('reads TopoJSON ids from a property when given one', () => {
    const named: MapAreaTopology = {
      ...topology,
      objects: {
        postcodes: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'Polygon',
              arcs: [[0, 1]],
              properties: { POA_CODE21: '4000' }
            },
            { type: 'Polygon', id: 7, arcs: [[2, ~0]], properties: null }
          ]
        }
      }
    }

    expect(
      areaFeatures(named, { idProperty: 'POA_CODE21' }).map(({ id }) => id)
    ).toEqual(['4000'])
    expect(areaFeatures(named).map(({ id }) => id)).toEqual(['7'])
  })

  it('takes a topology typed with plain arrays, as a TopoJSON library types it', () => {
    // No tuples: a point is a `number[]`, as `topojson-specification` has it.
    const loose: {
      type: 'Topology'
      arcs: number[][][]
      transform: { scale: number[]; translate: number[] }
      objects: {
        postcodes: {
          type: 'GeometryCollection'
          geometries: { type: 'Polygon'; id: string; arcs: number[][] }[]
        }
      }
    } = {
      type: 'Topology',
      arcs: [
        [
          [0, 0],
          [2, 0],
          [0, 2],
          [-2, -2]
        ]
      ],
      transform: { scale: [0.5, 0.5], translate: [150, -30] },
      objects: {
        postcodes: {
          type: 'GeometryCollection',
          geometries: [{ type: 'Polygon', id: '4000', arcs: [[0]] }]
        }
      }
    }

    expect(areaFeatures(loose)[0]!.geometry.coordinates).toEqual([
      [
        [150, -30],
        [151, -30],
        [151, -29],
        [150, -30]
      ]
    ])
  })
})

const drawn = (setAreas: ReturnType<typeof vi.fn>) =>
  (setAreas.mock.lastCall?.[0] ?? []) as MapAreaLayer[]

// The two squares, with a value each.
const squares = {
  areas: topology,
  data: [
    { id: '4000', value: 12 },
    { id: '4001', value: 30 }
  ],
  label: 'Total'
}
// The left square's middle.
const left = { lat: -29.5, lng: 150.5 }
// The fake map's frame has no size, so its view is the point a fifth of a
// degree west and 0.15 north of its centre: here, inside the left square.
const inLeft = { lat: -29.65, lng: 150.7 }
// The map itself, under its parts, which is where a pointer hovers areas.
const surface = () =>
  document.querySelector<HTMLElement>('[data-slot="map-surface"]')!
const tip = () =>
  document.querySelector<HTMLElement>('[data-slot="map-areas-tip"]')

describe('MapAreas', () => {
  it('draws the areas that have values, as one set', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 0 },
          { id: '9999', value: 40 }
        ]}
        label='Total'
      />
    )

    const layers = drawn(vi.mocked(fake.instance.setAreas))
    expect(layers).toHaveLength(1)
    expect(layers[0]!.geometry).toEqual(areaFeatures(topology)[0]!.geometry)
  })

  it('lights highlighted areas through the engine without redrawing them', async () => {
    const fake = fakeEngine()
    const setActiveAreas = vi.fn()
    fake.instance.setActiveAreas = setActiveAreas
    const data = [
      { id: '4000', value: 12 },
      { id: '4001', value: 30 }
    ]
    const { rerenderMap } = await renderMap(
      fake.engine,
      <MapAreas areas={topology} data={data} label='Total' />
    )
    const draws = vi.mocked(fake.instance.setAreas).mock.calls.length

    await rerenderMap(
      <MapAreas areas={topology} data={data} label='Total' highlight='4001' />
    )

    const [ids] = setActiveAreas.mock.lastCall!
    const layers = drawn(vi.mocked(fake.instance.setAreas))
    expect(ids).toEqual([layers[1]!.id])
    expect(vi.mocked(fake.instance.setAreas).mock.calls).toHaveLength(draws)
  })

  it('redraws highlighted areas strengthened on an engine that can’t light them', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
        highlight={['4001']}
      />
    )

    const [quiet, lit] = drawn(vi.mocked(fake.instance.setAreas))
    expect(lit!.fillOpacity).toBeGreaterThan(quiet!.fillOpacity)
    expect(lit!.lineWidth).toBeGreaterThan(quiet!.lineWidth!)
  })

  it('keys each colour’s range, leaving out a colour with no areas', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
        formatValue={(value) => `$${value}`}
        legend
      />
    )

    const key = document.querySelector('[data-slot="map-cluster-legend"]')
    // Many areas sharing a value leave some colours with nothing in them.
    expect(key?.textContent).toBe('Total$12$30$30$12')
    expect(screen.queryByText('Total')).toBe(key?.firstElementChild)
  })

  it('keeps what is drawn when the same values arrive in a new array', async () => {
    const fake = fakeEngine()
    const areas = () => (
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
      />
    )
    const { rerenderMap } = await renderMap(fake.engine, areas())
    const draws = vi.mocked(fake.instance.setAreas).mock.calls.length

    await rerenderMap(areas())

    expect(vi.mocked(fake.instance.setAreas).mock.calls).toHaveLength(draws)
  })

  it('reports the areas in view only when they change', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
        onAreasChange={onAreasChange}
      />
    )
    // The fake map's frame has no size, so its view is the point a fifth of
    // a degree west and 0.15 north of its centre: inside the left square.
    await fake.pan({ lat: -29.65, lng: 150.7 })
    await fake.pan({ lat: -29.64, lng: 150.7 })

    const reported = onAreasChange.mock.calls.map(([inView]) =>
      inView.map(({ id }) => id)
    )
    expect(reported).toEqual([[], ['4000']])
  })

  it('settles when an app builds data while rendering and keeps the areas in view', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn()
    function Totals() {
      const [, setInView] = useState<MapAreaInView[]>([])
      return (
        <MapAreas
          areas={topology}
          data={[
            { id: '4000', value: 12 },
            { id: '4001', value: 30 }
          ]}
          label='Total'
          onAreasChange={(inView) => {
            onAreasChange(inView)
            // Stops a map that reports on every render, which never settles.
            if (onAreasChange.mock.calls.length > 50)
              throw new Error('MapAreas reported without end')
            setInView(inView)
          }}
        />
      )
    }
    await renderMap(fake.engine, <Totals />)

    expect(onAreasChange).toHaveBeenCalledTimes(1)
  })

  it('draws and fits a shape of several hundred thousand points', async () => {
    const fake = fakeEngine()
    const points = 300_000
    const ring = Array.from({ length: points }, (_, i): [number, number] => {
      const turn = (i / points) * 2 * Math.PI
      return [151 + Math.cos(turn), -29 + Math.sin(turn)]
    })
    ring.push(ring[0]!)
    const detailed: MapAreaCollection = {
      type: 'FeatureCollection',
      features: [
        { id: '4000', geometry: { type: 'Polygon', coordinates: [ring] } }
      ]
    }
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <MapAreas
          areas={detailed}
          data={[{ id: '4000', value: 12 }]}
          label='Total'
        />
      </>
    )

    expect(drawn(vi.mocked(fake.instance.setAreas))).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    const [bounds] = vi.mocked(fake.instance.fitBounds).mock.lastCall!
    expect(bounds.southWest.lng).toBeCloseTo(150)
    expect(bounds.northEast.lat).toBeCloseTo(-28)
  })

  it('opens a map with defaultFit on its areas, as Show all would', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar fit />
        <MapAreas {...squares} />
      </>,
      { defaultFit: true }
    )

    const fitBounds = vi.mocked(fake.instance.fitBounds)
    expect(fitBounds).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(fitBounds).toHaveBeenCalledTimes(2)
    const [opened] = fitBounds.mock.calls[0]!
    const [shown] = fitBounds.mock.calls[1]!
    expect(opened).toEqual(shown)
    expect(opened.southWest.lng).toBeLessThan(left.lng)
    expect(opened.northEast.lng).toBeGreaterThan(left.lng)
  })

  it('lights the area under the pointer once, however far the pointer moves in it', async () => {
    const fake = fakeEngine()
    const setActiveAreas = vi.fn()
    fake.instance.setActiveAreas = setActiveAreas
    await renderMap(fake.engine, <MapAreas {...squares} />)
    // The left square's middle is the map's.
    await fake.pan(left)

    fireEvent.pointerMove(surface(), { clientX: 200, clientY: 150 })
    const [leftLayer] = drawn(vi.mocked(fake.instance.setAreas))
    await waitFor(() =>
      expect(setActiveAreas).toHaveBeenLastCalledWith([leftLayer!.id])
    )
    const lit = setActiveAreas.mock.calls.length
    const placed = tip()!.style.transform
    fireEvent.pointerMove(surface(), { clientX: 210, clientY: 160 })
    await waitFor(() => expect(tip()!.style.transform).not.toBe(placed))
    // Lets a second lighting, if there were one, reach the engine.
    await act(async () => {})

    expect(setActiveAreas.mock.calls).toHaveLength(lit)
  })

  it('names a tapped area with its value and share, until a tap elsewhere or a move', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <MapAreas {...squares} />)

    await fake.click(left)
    expect(tip()).toHaveTextContent('4000Total: 12, 29% of all')

    await fake.click({ lat: 0, lng: 0 })
    expect(tip()).not.toBeInTheDocument()

    await fake.click(left)
    expect(tip()).toBeInTheDocument()
    await fake.pan({ lat: -29.4, lng: 150.5 })
    expect(tip()).not.toBeInTheDocument()
  })

  it('leaves a finger moving over the map, and a pointer over a control, without a label', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <>
        <Map.Toolbar />
        <MapAreas {...squares} />
      </>
    )
    await fake.pan(left)

    fireEvent.pointerMove(surface(), {
      pointerType: 'touch',
      clientX: 200,
      clientY: 150
    })
    // The label waits a frame for the pointer, so one has to pass.
    await act(() => new Promise(requestAnimationFrame))
    expect(tip()).not.toBeInTheDocument()

    fireEvent.pointerMove(surface(), { clientX: 200, clientY: 150 })
    await waitFor(() => expect(tip()).toBeInTheDocument())
    fireEvent.pointerMove(screen.getByRole('button', { name: 'Zoom in' }), {
      clientX: 200,
      clientY: 150
    })
    await waitFor(() => expect(tip()).not.toBeInTheDocument())
  })

  it('takes the label away when the pointer leaves the map', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <MapAreas {...squares} />)
    await fake.pan(left)
    fireEvent.pointerMove(surface(), { clientX: 200, clientY: 150 })
    await waitFor(() => expect(tip()).toBeInTheDocument())

    fireEvent.pointerLeave(surface().parentElement!)

    expect(tip()).not.toBeInTheDocument()
  })

  it('gives each area its share of every value in data, with a boundary or not', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 30 },
          { id: '9999', value: 70 }
        ]}
        label='Total'
        onAreasChange={onAreasChange}
      />
    )
    await fake.pan(inLeft)

    expect(onAreasChange).toHaveBeenLastCalledWith([
      { id: '4000', label: '4000', value: 30, share: 0.3 }
    ])
    await fake.click(left)
    expect(tip()).toHaveTextContent('Total: 30, 30% of all')
  })

  it('adds up rows that share an id, and leaves out values that aren’t amounts', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 10 },
          { id: '4000', value: 20, label: 'Brisbane City' },
          { id: '4000', value: -5 },
          { id: '4001', value: Infinity },
          { id: '9999', value: 70 }
        ]}
        label='Total'
        onAreasChange={onAreasChange}
      />
    )
    await fake.pan(inLeft)

    expect(drawn(vi.mocked(fake.instance.setAreas))).toHaveLength(1)
    expect(onAreasChange).toHaveBeenLastCalledWith([
      { id: '4000', label: 'Brisbane City', value: 30, share: 0.3 }
    ])
  })

  it('writes a share under half a percent as less than 1%', async () => {
    const fake = fakeEngine()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 1 },
          { id: '4001', value: 999 }
        ]}
        label='Total'
      />
    )

    await fake.click(left)

    expect(tip()).toHaveTextContent('Total: 1, <1% of all')
  })

  it('lights the areas of every MapAreas on the map together', async () => {
    const fake = fakeEngine()
    const setActiveAreas = vi.fn()
    fake.instance.setActiveAreas = setActiveAreas
    await renderMap(
      fake.engine,
      <>
        <MapAreas {...squares} highlight='4000' />
        <MapAreas {...squares} highlight='4001' />
      </>
    )

    const layers = drawn(vi.mocked(fake.instance.setAreas))
    expect(layers).toHaveLength(4)
    const [ids] = setActiveAreas.mock.lastCall!
    expect([...ids].sort()).toEqual([layers[0]!.id, layers[3]!.id].sort())
  })

  it('takes its areas and their lighting off the map when it leaves', async () => {
    const fake = fakeEngine()
    const setActiveAreas = vi.fn()
    fake.instance.setActiveAreas = setActiveAreas
    const { rerenderMap } = await renderMap(
      fake.engine,
      <MapAreas {...squares} highlight='4000' />
    )
    expect(drawn(vi.mocked(fake.instance.setAreas))).toHaveLength(2)
    expect(setActiveAreas.mock.lastCall![0]).toHaveLength(1)

    await rerenderMap(null)

    expect(fake.instance.setAreas).toHaveBeenLastCalledWith([])
    expect(setActiveAreas).toHaveBeenLastCalledWith([])
  })

  it('draws an area whose id is empty at rest on an engine that can’t light areas', async () => {
    const fake = fakeEngine()
    const square = (west: number) => ({
      type: 'Polygon' as const,
      coordinates: [
        [
          [west, -30],
          [west + 1, -30],
          [west + 1, -29],
          [west, -30]
        ] as [number, number][]
      ]
    })
    await renderMap(
      fake.engine,
      <MapAreas
        areas={{
          type: 'FeatureCollection',
          features: [
            { id: '', geometry: square(150) },
            { id: '4001', geometry: square(151) }
          ]
        }}
        data={[
          { id: '', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
      />
    )

    const [unnamed, named] = drawn(vi.mocked(fake.instance.setAreas))
    expect(unnamed!.fillOpacity).toBe(named!.fillOpacity)
    expect(unnamed!.lineWidth).toBe(named!.lineWidth)
  })

  it('reads the view from an engine whose methods need their map', async () => {
    const fake = fakeEngine()
    const flat = fake.instance.unproject
    fake.instance.unproject = function (this: unknown, pixel) {
      if (this !== fake.instance) throw new TypeError('unproject lost its map')
      return flat(pixel)
    }
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    await renderMap(
      fake.engine,
      <MapAreas {...squares} onAreasChange={onAreasChange} />
    )
    await fake.pan(inLeft)

    expect(onAreasChange.mock.lastCall![0].map(({ id }) => id)).toEqual([
      '4000'
    ])
  })

  it('finds an area across the date line from where the map started', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    await renderMap(
      fake.engine,
      <MapAreas
        areas={{
          type: 'FeatureCollection',
          features: [
            {
              id: 'east',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [-177, -30],
                    [-176, -30],
                    [-176, -29],
                    [-177, -29],
                    [-177, -30]
                  ]
                ]
              }
            }
          ]
        }}
        data={[{ id: 'east', value: 12 }]}
        label='Total'
        onAreasChange={onAreasChange}
      />
    )
    // Panned east past 180, the map counts on: 183.7 is 176.3 west.
    await fake.pan({ lat: -29.35, lng: 183.7 })

    expect(onAreasChange.mock.lastCall![0].map(({ id }) => id)).toEqual([
      'east'
    ])
    fireEvent.pointerMove(surface(), { clientX: 200, clientY: 150 })
    await waitFor(() => expect(tip()).toHaveTextContent('east'))
  })

  it('reports again when the values change while the map is still', async () => {
    const fake = fakeEngine()
    const onAreasChange = vi.fn<(areas: MapAreaInView[]) => void>()
    const areas = (value: number) => (
      <MapAreas
        areas={topology}
        data={[{ id: '4000', value }]}
        label='Total'
        onAreasChange={onAreasChange}
      />
    )
    const { rerenderMap } = await renderMap(fake.engine, areas(12))
    await fake.pan(inLeft)
    expect(onAreasChange.mock.lastCall![0][0]!.value).toBe(12)

    await rerenderMap(areas(20))

    expect(onAreasChange.mock.lastCall![0][0]!.value).toBe(20)
  })

  it('shows no key unless asked', async () => {
    const fake = fakeEngine()
    await renderMap(fake.engine, <MapAreas {...squares} />)

    expect(drawn(vi.mocked(fake.instance.setAreas))).toHaveLength(2)
    expect(
      document.querySelector('[data-slot="map-cluster-legend"]')
    ).not.toBeInTheDocument()
  })

  it('reads GeoJSON ids from the property idProperty names', async () => {
    const fake = fakeEngine()
    const { geometry } = areaFeatures(topology)[0]!
    await renderMap(
      fake.engine,
      <MapAreas
        areas={{
          type: 'FeatureCollection',
          features: [{ id: 1, properties: { POA_CODE21: '4000' }, geometry }]
        }}
        idProperty='POA_CODE21'
        data={[{ id: '4000', value: 12 }]}
        label='Total'
      />
    )

    expect(drawn(vi.mocked(fake.instance.setAreas))).toHaveLength(1)
  })
})
