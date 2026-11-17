import { useState } from 'react'

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Map } from '../Map'
import type { MapAreaLayer } from '../Map/engine'
import { fakeEngine, renderMap } from '../Map/mapTestUtils'
import {
  type MapAreaInView,
  MapAreas,
  classStarts,
  levelOf,
  rangesOf
} from './MapAreas'
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
})

describe('rangesOf', () => {
  it('gives each colour’s range, strongest first, up to its own largest value', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 400]
    expect(
      rangesOf([1, 3, 5, 7, 9], values, String).map((r) => r.range)
    ).toEqual(['9–400', '7–8', '5–6', '3–4', '1–2'])
  })
})

describe('classStarts and levelOf', () => {
  it('puts a fifth of the values in each step, however skewed', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 400]
    const starts = classStarts(values)

    expect(starts).toEqual([1, 3, 5, 7, 9])
    expect(values.map((value) => levelOf(value, starts))).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4
    ])
  })
})

const drawn = (setAreas: ReturnType<typeof vi.fn>) =>
  (setAreas.mock.lastCall?.[0] ?? []) as MapAreaLayer[]

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

  it('lights the area under the pointer once, however far the pointer moves in it', async () => {
    const fake = fakeEngine()
    const setActiveAreas = vi.fn()
    fake.instance.setActiveAreas = setActiveAreas
    await renderMap(
      fake.engine,
      <MapAreas
        areas={topology}
        data={[
          { id: '4000', value: 12 },
          { id: '4001', value: 30 }
        ]}
        label='Total'
      />
    )
    // The left square's middle is the map's.
    await fake.pan({ lat: -29.5, lng: 150.5 })
    // The map's parts live in its viewport, which is what they measure.
    const frame = document.querySelector<HTMLElement>(
      '[data-slot="map-viewport"]'
    )!
    const tip = () =>
      document.querySelector<HTMLElement>('[data-slot="map-areas-tip"]')

    fireEvent.pointerMove(frame, { clientX: 200, clientY: 150 })
    await waitFor(() => expect(tip()).toBeInTheDocument())
    const lit = setActiveAreas.mock.calls.length
    fireEvent.pointerMove(frame, { clientX: 210, clientY: 160 })
    await waitFor(() =>
      expect(tip()!.style.transform).toBe('translate(222px, 172px)')
    )

    expect(setActiveAreas.mock.calls).toHaveLength(lit)
  })
})
