import { describe, expect, it } from 'vitest'

import {
  stepAlong,
  stepCategory,
  stepSeries,
  stepWithin,
  visualEnds
} from './keyboard'

// y is the engine's pixel y, so a smaller y sits higher on screen.
const top = { xValue: 1, group: 'C', y: 10 }
const middle = { xValue: 1, group: 'B', y: 40 }
const bottom = { xValue: 1, group: 'A', y: 80 }
const alone = { xValue: 2, group: 'A', y: 70 }
const points = [bottom, middle, top, alone]

describe('stepSeries', () => {
  it('moves up to the series above and down to the one below at the same x', () => {
    expect(stepSeries(points, middle, -1)).toBe(top)
    expect(stepSeries(points, middle, 1)).toBe(bottom)
  })

  it('stops at the edge', () => {
    expect(stepSeries(points, top, -1)).toBeNull()
    expect(stepSeries(points, bottom, 1)).toBeNull()
    expect(stepSeries(points, alone, 1)).toBeNull()
  })

  it('finds nothing for a point that is not in the list', () => {
    expect(stepSeries([top, bottom], middle, 1)).toBeNull()
  })

  it('stops once for a series whose solid line and forecast share a point', () => {
    const solid = { xValue: 1, group: 'Sold', y: 20 }
    const forecast = { xValue: 1, group: 'Sold', y: 20 }
    const below = { xValue: 1, group: 'VIP', y: 60 }
    const column = [solid, forecast, below]
    expect(stepSeries(column, forecast, 1)).toBe(below)
    expect(stepSeries(column, below, -1)).toBe(solid)
    expect(stepSeries(column, solid, -1)).toBeNull()
  })

  it('matches dates by time', () => {
    const upper = { xValue: new Date(2026, 10, 14), group: 'A', y: 10 }
    const lower = { xValue: new Date(2026, 10, 14), group: 'B', y: 50 }
    expect(stepSeries([upper, lower], upper, 1)).toBe(lower)
  })
})

describe('stepAlong', () => {
  const a0 = { markId: 'series-1', group: null, x: 0 }
  const a1 = { markId: 'series-1', group: null, x: 40 }
  const b0 = { markId: 'series-2', group: null, x: 0 }
  const b2 = { markId: 'series-2', group: null, x: 80 }
  const points = [a1, b0, a0, b2]

  it('moves along the same series in x order', () => {
    expect(stepAlong(points, a0, 1)).toBe(a1)
    expect(stepAlong(points, a1, -1)).toBe(a0)
    expect(stepAlong(points, b0, 1)).toBe(b2)
  })

  it('stops at the ends of the series', () => {
    expect(stepAlong(points, a1, 1)).toBeNull()
    expect(stepAlong(points, b0, -1)).toBeNull()
  })

  it('crosses from the solid line into the forecast of the same series', () => {
    const solid0 = { markId: 'series-1', group: 'Sold', x: 0 }
    const solid1 = { markId: 'series-1', group: 'Sold', x: 40 }
    const forecast1 = { markId: 'forecast-1', group: 'Sold', x: 40 }
    const forecast2 = { markId: 'forecast-1', group: 'Sold', x: 80 }
    const other = { markId: 'series-2', group: 'VIP', x: 60 }
    const split = [forecast2, solid1, other, solid0, forecast1]
    expect(stepAlong(split, solid0, 1)).toBe(solid1)
    expect(stepAlong(split, solid1, 1)).toBe(forecast2)
    expect(stepAlong(split, forecast2, -1)).toBe(solid1)
    expect(stepAlong(split, forecast1, -1)).toBe(solid0)
  })
})

// A horizontal stack: categories run down y, segments run left to right in x.
describe('stepCategory', () => {
  const row = (yValue: string, y: number, ends: readonly number[]) =>
    ends.map((x, i) => ({
      markId: `series-${i + 1}`,
      group: `S${i + 1}`,
      yValue,
      y,
      x
    }))
  const [fri1, fri2] = row('Fri', 20, [100, 180])
  const [sat1, sat2] = row('Sat', 60, [100, 100])
  const [sun1] = row('Sun', 100, [40])
  // The engine lists points mark by mark, so series 1 comes first.
  const points = [fri1!, sat1!, sun1!, fri2!, sat2!]

  it('moves up and down between categories in screen order, keeping the series', () => {
    expect(stepCategory(points, fri2!, 1)).toBe(sat2)
    expect(stepCategory(points, sat2!, -1)).toBe(fri2)
    expect(stepCategory(points, fri1!, 1)).toBe(sat1)
  })

  it('lands on the first segment when the series is missing below', () => {
    expect(stepCategory(points, sat2!, 1)).toBe(sun1)
  })

  it('stops at the top and bottom', () => {
    expect(stepCategory(points, fri1!, -1)).toBeNull()
    expect(stepCategory(points, sun1!, 1)).toBeNull()
  })

  it('reaches bars tied on value, one per category', () => {
    const [a] = row('Carlton', 20, [96])
    const [b] = row('Fitzroy', 60, [96])
    const [c] = row('Brunswick', 100, [96])
    const tied = [c!, a!, b!]
    expect(stepCategory(tied, a!, 1)).toBe(b)
    expect(stepCategory(tied, b!, 1)).toBe(c)
    expect(stepCategory(tied, c!, -1)).toBe(b)
  })

  it('finds nothing for a point that is not in the list', () => {
    expect(stepCategory([fri1!], sat1!, -1)).toBeNull()
  })
})

describe('stepWithin', () => {
  const at = (markId: string, x: number) => ({
    markId,
    group: markId,
    yValue: 'Sat',
    y: 60,
    x
  })
  const ga = at('series-1', 100)
  const vip = at('series-2', 100)
  const early = at('series-3', 160)
  const fri = {
    markId: 'series-1',
    group: 'series-1',
    yValue: 'Fri',
    y: 20,
    x: 50
  }
  const points = [fri, ga, vip, early]

  it('moves left and right between segments, tied ends in series order', () => {
    expect(stepWithin(points, ga, 1)).toBe(vip)
    expect(stepWithin(points, vip, 1)).toBe(early)
    expect(stepWithin(points, early, -1)).toBe(vip)
    expect(stepWithin(points, vip, -1)).toBe(ga)
  })

  it('stops at the ends of the category', () => {
    expect(stepWithin(points, ga, -1)).toBeNull()
    expect(stepWithin(points, early, 1)).toBeNull()
    expect(stepWithin(points, fri, 1)).toBeNull()
  })

  it('matches dates by time', () => {
    const left = { ...ga, yValue: new Date(2026, 10, 14) }
    const right = { ...early, yValue: new Date(2026, 10, 14) }
    expect(stepWithin([left, right], left, 1)).toBe(right)
  })
})

describe('visualEnds', () => {
  const at = (
    markId: string,
    xValue: unknown,
    yValue: unknown,
    x: number,
    y: number
  ) => ({
    markId,
    group: markId,
    xValue,
    yValue,
    x,
    y
  })

  it('starts on the top category, leftmost segment, and ends bottom right when categories run down y', () => {
    // The engine lists the shortest bar first, as nearest-y focus orders them.
    const short = at('series-1', 40, 'Sun', 40, 100)
    const topLeft = at('series-1', 100, 'Fri', 100, 20)
    const topRight = at('series-2', 180, 'Fri', 180, 20)
    const bottomLeft = at('series-2', 70, 'Sun', 70, 100)
    const middle = at('series-1', 90, 'Sat', 90, 60)
    const ends = visualEnds([short, middle, topRight, bottomLeft, topLeft], 'y')
    expect(ends?.first).toBe(topLeft)
    expect(ends?.last).toBe(bottomLeft)
  })

  it('starts on the leftmost column top and ends on the rightmost column top when categories run along x', () => {
    const leftLow = at('series-1', 0, 1, 10, 80)
    const leftTop = at('series-2', 0, 5, 10, 20)
    const rightLow = at('series-1', 3, 4, 300, 60)
    const rightTop = at('series-2', 3, 8, 300, 10)
    const ends = visualEnds([rightLow, leftLow, rightTop, leftTop], 'x')
    expect(ends?.first).toBe(leftTop)
    expect(ends?.last).toBe(rightTop)
  })

  it('starts on the first series of a dodged group', () => {
    const second = at('series-2', 'Fri', 9, 60, 10)
    const first = at('series-1', 'Fri', 4, 40, 50)
    expect(visualEnds([second, first], 'x')?.first).toBe(first)
  })

  it('matches dates by time', () => {
    const upper = at('series-2', new Date(2026, 10, 14), 8, 10, 10)
    const lower = at('series-1', new Date(2026, 10, 14), 2, 10, 90)
    const later = at('series-1', new Date(2026, 10, 15), 2, 90, 90)
    expect(visualEnds([lower, later, upper], 'x')).toEqual({
      first: upper,
      last: later
    })
  })

  it('finds nothing without points', () => {
    expect(visualEnds([], 'y')).toBeNull()
  })
})
