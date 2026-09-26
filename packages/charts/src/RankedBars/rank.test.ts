import { describe, expect, it } from 'vitest'

import { OTHER } from '../plot/series'
import { channelExample, suburbExample } from './examples'
import { DEFAULT_LIMIT, rank } from './rank'

describe('rank', () => {
  it('sorts largest first and rolls the rest into Other, placed last', () => {
    const ranked = rank(channelExample)
    expect(ranked).toHaveLength(DEFAULT_LIMIT)
    expect(ranked[0]!.name).toBe('Email')
    expect(ranked.at(-1)).toMatchObject({
      name: OTHER,
      value: 33 + 18 + 12,
      isOther: true
    })
  })

  it('places Other last even when it outweighs the smallest bar', () => {
    const ranked = rank(suburbExample)
    expect(ranked.map((r) => r.name)).toEqual([
      'West End',
      'South Brisbane',
      'Highgate Hill',
      'Woolloongabba',
      OTHER
    ])
    expect(ranked.at(-1)!.value).toBe(612 - 161 - 96 - 71 - 58)
  })

  it('computes shares of the full total', () => {
    const ranked = rank(suburbExample)
    const total = suburbExample.data.reduce((s, r) => s + Number(r.buyers), 0)
    expect(ranked[0]!.share).toBeCloseTo(161 / total, 6)
    expect(ranked.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 6)
  })

  it('does not add Other when everything fits', () => {
    expect(rank({ ...channelExample, limit: 20 }).some((r) => r.isOther)).toBe(
      false
    )
  })

  it('skips rows with no number or no name', () => {
    expect(
      rank({
        data: [
          { c: 'A', v: null },
          { c: 'B', v: 2 },
          { c: null, v: 3 },
          { c: 'D', v: 'many' }
        ],
        x: 'c',
        y: 'v'
      }).map((r) => r.name)
    ).toEqual(['B'])
  })

  it('keeps each bar reference and leaves Other without one', () => {
    const ranked = rank({
      data: [
        { c: 'A', v: 3, r: 2 },
        { c: 'B', v: 2, r: null },
        { c: 'C', v: 1, r: 1 }
      ],
      x: 'c',
      y: 'v',
      limit: 2,
      reference: { field: 'r', label: 'Last year' }
    })
    expect(ranked.map((r) => r.reference)).toEqual([2, null])
  })

  it('gives zero shares rather than NaN when everything is zero', () => {
    expect(rank({ data: [{ c: 'A', v: 0 }], x: 'c', y: 'v' })[0]!.share).toBe(0)
  })
})
