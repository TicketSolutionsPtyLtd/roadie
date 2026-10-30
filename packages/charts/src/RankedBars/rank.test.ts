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

  it('drops the rest instead of adding Other, keeping shares of the full total', () => {
    const ranked = rank({ ...channelExample, other: false })
    expect(ranked.map((r) => r.name)).toEqual([
      'Email',
      'Instagram',
      'Direct',
      'Venue site',
      'TikTok',
      'Google',
      'Facebook',
      'Partner'
    ])
    expect(ranked[0]!.share).toBeCloseTo(612 / 1828, 6)
  })

  const fiveBars = (order: string) =>
    [...order].map((c) => ({
      c,
      v: { A: 50, B: 40, C: 30, D: 20, E: 10 }[c]!
    }))

  it.each([
    ['ABCDE', true, 'E', ['A', 'B', 'E']],
    ['ABCDE', true, ['D', 'E'], ['A', 'D', 'E']],
    ['ABCDE', true, 'A', ['A', 'B', 'C']],
    ['ABCDE', true, ['A', 'B', 'C', 'D'], ['A', 'B', 'C']],
    ['CEADB', false, undefined, ['C', 'E', 'A']],
    ['CEADB', false, 'B', ['C', 'A', 'B']],
    ['CEADB', false, ['D', 'B'], ['A', 'D', 'B']]
  ] as const)(
    'keeps a highlighted bar past limit in place of the lowest other bar, data %s, sort %s, highlight %j',
    (order, sort, highlight, names) => {
      const ranked = rank({
        data: fiveBars(order),
        x: 'c',
        y: 'v',
        limit: 3,
        other: false,
        sort,
        highlight: highlight as string | string[] | undefined
      })
      expect(ranked.map((r) => r.name)).toEqual(names)
    }
  )

  it('keeps data order without sort, so ordered categories stay in order', () => {
    const bands = ['18 to 24', '25 to 34', '35 to 44', '45 and over']
    const ranked = rank({
      data: bands.map((band, i) => ({ band, buyers: [40, 120, 80, 10][i]! })),
      x: 'band',
      y: 'buyers',
      sort: false
    })
    expect(ranked.map((r) => r.name)).toEqual(bands)
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
