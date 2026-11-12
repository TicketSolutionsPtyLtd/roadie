import { describe, expect, it } from 'vitest'

import { areaTotals } from './areaTotals'
import { areaContains } from './geometry'
import type { MapAreaCollection, MapAreaTopology } from './topology'

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

const postcodes: MapAreaCollection = {
  type: 'FeatureCollection',
  features: [
    { id: '4000', geometry: square(153, -27.5, 0.1) },
    { id: '4101', geometry: square(153.1, -27.5, 0.1) },
    { id: '3000', geometry: square(144.9, -37.9, 0.1) }
  ]
}

describe('areaTotals', () => {
  it('adds each place to the area that holds it, largest first', () => {
    expect(
      areaTotals(postcodes, [
        { position: { lat: -27.45, lng: 153.05 } },
        { position: { lat: -27.41, lng: 153.01 } },
        { position: { lat: -37.85, lng: 144.95 }, value: 5 },
        { position: { lat: -27.45, lng: 153.15 }, value: 2 },
        { position: { lat: -27.45, lng: 153.15 }, value: 1.5 }
      ])
    ).toEqual([
      { id: '3000', value: 5 },
      { id: '4101', value: 3.5 },
      { id: '4000', value: 2 }
    ])
  })

  it('leaves out places in no area, and values that add nothing', () => {
    expect(
      areaTotals(postcodes, [
        // In the sea, off the map's areas, and nowhere at all.
        { position: { lat: -27.45, lng: 153.5 } },
        { position: { lat: 51.5, lng: -0.1 } },
        { position: { lat: Number.NaN, lng: 153.05 } },
        { position: { lat: -27.45, lng: 153.05 }, value: -4 },
        { position: { lat: -27.45, lng: 153.05 }, value: Number.NaN },
        { position: { lat: -27.45, lng: 153.05 }, value: 0 }
      ])
    ).toEqual([])
  })

  it('reads TopoJSON, and GeoJSON ids from a property', () => {
    const topology: MapAreaTopology = {
      type: 'Topology',
      arcs: [
        [
          [150, -30],
          [151, -30],
          [151, -29],
          [150, -29],
          [150, -30]
        ]
      ],
      objects: {
        postcodes: {
          type: 'GeometryCollection',
          geometries: [{ type: 'Polygon', id: '2000', arcs: [[0]] }]
        }
      }
    }
    const named: MapAreaCollection = {
      type: 'FeatureCollection',
      features: [
        {
          properties: { POA_CODE21: '4000' },
          geometry: square(153, -27.5, 0.1)
        }
      ]
    }
    const inside = [{ position: { lat: -29.5, lng: 150.5 } }]

    expect(areaTotals(topology, inside)).toEqual([{ id: '2000', value: 1 }])
    expect(
      areaTotals(named, [{ position: { lat: -27.45, lng: 153.05 } }], {
        idProperty: 'POA_CODE21'
      })
    ).toEqual([{ id: '4000', value: 1 }])
  })

  it('agrees with checking every area, across areas of very different sizes', () => {
    // A grid of small areas, one a thousand times their size beside them,
    // and one far away, so the areas spread over many cells of any index.
    const features = [
      { id: 'outback', geometry: square(120, -30, 10) },
      { id: 'island', geometry: square(168, -29.1, 0.05) }
    ]
    for (let x = 0; x < 12; x++)
      for (let y = 0; y < 12; y++)
        features.push({
          id: `${x}-${y}`,
          geometry: square(150 + x * 0.01, -34 + y * 0.01, 0.01)
        })
    const areas: MapAreaCollection = { type: 'FeatureCollection', features }
    // The same places every run.
    let seed = 7
    const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const spots = [
      [150, -34, 0.14],
      [119, -31, 12],
      [167.99, -29.11, 0.07]
    ] as const
    const places = Array.from({ length: 1500 }, (_, i) => {
      const [west, south, size] = spots[i % spots.length]!
      return {
        position: {
          lat: south + random() * size,
          lng: west + random() * size
        }
      }
    })
    const expected = new Map<string, number>()
    for (const { position } of places) {
      const area = features.find(({ geometry }) =>
        areaContains(geometry, position)
      )
      if (area) expected.set(area.id, (expected.get(area.id) ?? 0) + 1)
    }

    const totals = areaTotals(areas, places)

    expect(new Map(totals.map(({ id, value }) => [id, value]))).toEqual(
      expected
    )
    expect(expected.size).toBeGreaterThan(100)
  })
})
