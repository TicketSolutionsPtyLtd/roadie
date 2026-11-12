import { describe, expect, it } from 'vitest'

import { clusterIndex, gridLevel, gridZoom } from './clusters'
import type { MapEngineInstance } from './engine'

// Two suburbs a kilometre apart, one 4 km away, and a town 35 km out.
const newFarm = { lat: -27.467, lng: 153.051 }
const teneriffe = { lat: -27.457, lng: 153.047 }
const paddington = { lat: -27.46, lng: 153.0 }
const ipswich = { lat: -27.614, lng: 152.76 }
const world = [-180, -85, 180, 85] as const

const sales = [
  { position: newFarm, value: 40, label: 'New Farm' },
  { position: teneriffe, value: 30, label: 'Teneriffe' },
  { position: paddington, value: 50, label: 'Paddington' },
  { position: ipswich, value: 60, label: 'Ipswich' }
]

const values = (index: ReturnType<typeof clusterIndex>, zoom: number) =>
  index
    .groupsAt(world, zoom)
    .map(({ value }) => value)
    .sort((a, b) => b - a)

describe('clusterIndex', () => {
  it('sums the values of nearby places, and splits them closer in', () => {
    const index = clusterIndex(sales)

    expect(values(index, 4)).toEqual([180])
    expect(values(index, 9)).toEqual([120, 60])
    expect(values(index, 16)).toEqual([60, 50, 40, 30])
  })

  it('totals every value, for each group’s share', () => {
    expect(clusterIndex(sales).total).toBe(180)
  })

  it('counts a place with no value as 1', () => {
    const index = clusterIndex([{ position: newFarm }, { position: teneriffe }])
    expect(index.total).toBe(2)
    expect(values(index, 4)).toEqual([2])
  })

  it('adds up places at the same spot, so they never sit on top of each other', () => {
    const index = clusterIndex([
      { position: newFarm, value: 3, label: 'Kazoo Hollow Room' },
      { position: newFarm, value: 4, label: 'Kazoo Hollow Room' }
    ])
    expect(values(index, 22)).toEqual([7])
  })

  it('keeps every name of places at the same spot', () => {
    const index = clusterIndex([
      { position: newFarm, value: 3, label: 'Kazoo Hollow Room' },
      { position: newFarm, value: 4, label: 'Jumbuck Orchard Park' },
      { position: newFarm, value: 1, label: 'Kazoo Hollow Room' }
    ])
    const [spot] = index.groupsAt(world, 22)
    expect(index.placesIn(spot!).map(({ label }) => label)).toEqual([
      'Kazoo Hollow Room and Jumbuck Orchard Park'
    ])
  })

  it('counts a negative or missing number as nothing', () => {
    const index = clusterIndex([
      { position: newFarm, value: 5 },
      { position: teneriffe, value: -3 },
      { position: paddington, value: Number.NaN }
    ])
    expect(index.total).toBe(5)
    expect(values(index, 4)).toEqual([5])
  })

  it('never groups places in different regions', () => {
    const index = clusterIndex(
      sales.map((sale) => ({
        ...sale,
        region: sale.label === 'Ipswich' ? 'Ipswich' : 'Brisbane'
      }))
    )
    expect(values(index, 0)).toEqual([120, 60])
    expect(index.total).toBe(180)
  })

  it('keeps places at the same spot apart when their regions differ', () => {
    const index = clusterIndex([
      { position: newFarm, value: 3, region: 'Brisbane' },
      { position: newFarm, value: 4, region: 'Elsewhere' }
    ])
    expect(values(index, 0)).toEqual([4, 3])
  })

  it('splits and lists a region’s group within its region', () => {
    const index = clusterIndex([
      ...sales.map((sale) => ({ ...sale, region: 'Brisbane' })),
      { position: ipswich, value: 5, label: 'Booval', region: 'Ipswich' }
    ])
    const [brisbane] = index
      .groupsAt(world, 4)
      .filter(({ value }) => value === 180)
    expect(index.placesIn(brisbane!).map(({ label }) => label)).toEqual([
      'Ipswich',
      'Paddington',
      'New Farm',
      'Teneriffe'
    ])
    const parts = index.partsOf(brisbane!)
    const next = index.groupsAt(world, brisbane!.splitsAt!)
    expect(
      next.filter(({ key }) => parts.includes(key)).map(({ value }) => value)
    ).toEqual(expect.arrayContaining([60]))
  })

  it('names the zoom where a group splits', () => {
    const index = clusterIndex(sales)
    const [brisbane] = index
      .groupsAt(world, 9)
      .filter(({ value }) => value === 120)
    expect(brisbane!.splitsAt).toBeGreaterThan(9)
    expect(index.groupsAt(world, brisbane!.splitsAt!).length).toBeGreaterThan(2)
  })

  it('has nothing to split in a single place', () => {
    const [ipswichAlone] = clusterIndex(sales)
      .groupsAt(world, 16)
      .filter(({ value }) => value === 60)
    expect(ipswichAlone!.splitsAt).toBeUndefined()
  })

  it('lists a group’s places, largest first', () => {
    const index = clusterIndex(sales)
    const [brisbane] = index
      .groupsAt(world, 9)
      .filter(({ value }) => value === 120)
    expect(index.placesIn(brisbane!).map(({ label }) => label)).toEqual([
      'Paddington',
      'New Farm',
      'Teneriffe'
    ])
  })

  it('keeps each group’s key as the map moves, so focus can follow it', () => {
    const index = clusterIndex(sales)
    const keyOf = (
      bbox: readonly [number, number, number, number],
      value: number
    ) => index.groupsAt(bbox, 9).find((group) => group.value === value)?.key
    // Panned so only Brisbane, or only Ipswich, is in view.
    const brisbaneOnly = [152.9, -27.55, 153.2, -27.4] as const
    const ipswichOnly = [152.7, -27.7, 152.8, -27.55] as const

    expect(keyOf(brisbaneOnly, 120)).toBe(keyOf(world, 120))
    expect(keyOf(ipswichOnly, 60)).toBe(keyOf(world, 60))
    expect(keyOf(world, 120)).not.toBe(keyOf(world, 60))
  })

  it('splits places even a few centimetres apart at a zoom every engine reaches', () => {
    // MapLibre zooms to 22, and Google to about 21, its 20 here.
    const index = clusterIndex([
      { position: newFarm, value: 3 },
      { position: { ...newFarm, lng: newFarm.lng + 0.000001 }, value: 4 }
    ])
    const [both] = index.groupsAt(world, 16)
    expect(both!.splitsAt).toBeLessThanOrEqual(20)
    expect(values(index, 20)).toEqual([4, 3])
  })

  it('scales each group against the largest at that zoom', () => {
    expect(clusterIndex(sales).largestAt(9)).toBe(120)
    expect(clusterIndex(sales).largestAt(16)).toBe(60)
  })

  it('has no groups with no data', () => {
    const index = clusterIndex([])
    expect(index.total).toBe(0)
    expect(index.groupsAt(world, 9)).toEqual([])
  })

  it('leaves out a point with no position, such as a row with an empty coordinate', () => {
    const index = clusterIndex([
      { position: newFarm },
      { position: { lat: Number.NaN, lng: 153.051 } },
      { position: { lat: -27.467, lng: Number.POSITIVE_INFINITY } }
    ])
    expect(index.total).toBe(1)
    expect(values(index, 4)).toEqual([1])
    expect(values(index, 22)).toEqual([1])
  })
})

// A feed with a point for each sale rather than totals: no value or label,
// and far more points than a list of postcodes.
describe('clusterIndex, with a point for each sale', () => {
  // 150,000 spots about 5 m apart, in a square of about 2 km.
  const spots = Array.from({ length: 150_000 }, (_, i) => ({
    position: {
      lat: -27.46 - Math.floor(i / 400) * 0.00005,
      lng: 153.02 + (i % 400) * 0.00005
    }
  }))

  it('counts each point as 1, and adds up points at the same spot', () => {
    const index = clusterIndex([
      ...spots.slice(0, 2_000),
      ...spots.slice(0, 500)
    ])
    expect(index.total).toBe(2_500)
    expect(values(index, 4)).toEqual([2_500])
    expect(values(index, 22).slice(0, 2)).toEqual([2, 2])
    expect(values(index, 22)).toHaveLength(2_000)
  })

  it('scales against the largest of 150,000 places on their own', () => {
    const index = clusterIndex(spots)
    expect(index.total).toBe(150_000)
    expect(index.largestAt(22)).toBe(1)
  })
})

describe('gridZoom', () => {
  const engine = (pixelsPerDegree: number) =>
    ({
      getView: () => ({ center: newFarm, zoom: 0 }),
      project: ({ lng }: { lng: number }) => ({
        x: lng * pixelsPerDegree,
        y: 0
      })
    }) as unknown as MapEngineInstance

  it('reads the zoom from how the engine draws the map, not its zoom number', () => {
    // A 512px world, as MapLibre draws zoom 0, and Google draws zoom 1.
    expect(gridZoom(engine(512 / 360))).toBeCloseTo(0)
    expect(gridZoom(engine((512 * 2 ** 10) / 360))).toBeCloseTo(10)
  })

  it('groups at a whole zoom as that zoom, though the engine’s pixels carry rounding', () => {
    // Pixels measured from the world's edge read a whole zoom a hair under
    // itself, which would group a zoom further out.
    for (const zoom of [0, 4, 9, 12, 16, 20, 22])
      expect(gridLevel(engine((512 * 2 ** zoom) / 360))).toBe(zoom)
    expect(gridLevel(engine((512 * 2 ** 9.97) / 360))).toBe(9)
  })
})
