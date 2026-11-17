import { describe, expect, it } from 'vitest'

import { maplibreEngine } from './maplibreEngine'

describe('maplibreEngine', () => {
  it('credits OpenFreeMap, OpenMapTiles and OpenStreetMap by default', () => {
    expect(maplibreEngine().attribution.map(({ label }) => label)).toEqual([
      'OpenFreeMap',
      '© OpenMapTiles',
      '© OpenStreetMap contributors'
    ])
  })

  it('credits the tiles it was given instead', () => {
    const attribution = [{ label: '© Our tiles' }]
    expect(
      maplibreEngine({ tiles: { light: '/style.json', attribution } })
        .attribution
    ).toEqual(attribution)
  })
})
