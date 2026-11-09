import { describe, expect, it } from 'vitest'

import type { MapAreaGeometry } from './engine'
import { areaCentre, areaContains } from './geometry'

// A 2×2 square with a 1×1 hole in its middle, in [lng, lat].
const square: MapAreaGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 0]
    ],
    [
      [0.5, 0.5],
      [1.5, 0.5],
      [1.5, 1.5],
      [0.5, 1.5],
      [0.5, 0.5]
    ]
  ]
}
const islands: MapAreaGeometry = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0]
      ]
    ],
    [
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 6],
        [5, 5]
      ]
    ]
  ]
}

describe('areaContains', () => {
  it.each([
    ['inside the outline', { lat: 0.25, lng: 0.25 }, true],
    ['in the hole', { lat: 1, lng: 1 }, false],
    ['outside', { lat: 3, lng: 1 }, false],
    ['west of it', { lat: 1, lng: -1 }, false]
  ])('says a place %s is %s', (_where, place, inside) => {
    expect(areaContains(square, place)).toBe(inside)
  })

  it('finds a place in any part of a multipolygon', () => {
    expect(areaContains(islands, { lat: 5.5, lng: 5.5 })).toBe(true)
    expect(areaContains(islands, { lat: 3, lng: 3 })).toBe(false)
  })
})

describe('areaCentre', () => {
  it('averages the outline, counting its closing point once', () => {
    expect(areaCentre(square)).toEqual({ lat: 1, lng: 1 })
  })

  it('uses the first part of a multipolygon', () => {
    expect(areaCentre(islands)).toEqual({ lat: 0.5, lng: 0.5 })
  })
})
