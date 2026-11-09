import { describe, expect, it } from 'vitest'

import { clusterIndex, gridZoom } from './clusters'
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
    const keys = () => index.groupsAt(world, 9).map(({ key }) => key)
    expect(keys()).toEqual(keys())
    expect(new Set(keys()).size).toBe(2)
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
})
