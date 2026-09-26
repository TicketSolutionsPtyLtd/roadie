import { describe, expect, it } from 'vitest'

import {
  ACTIONS_LABEL_LIMITS,
  CHART_LABEL_LIMITS,
  COPY_LIMITS,
  findRowGaps
} from './layout'

const cards = (...sizes: string[]) =>
  sizes.map((size, i) => ({ id: `c${i}`, size })) as Parameters<
    typeof findRowGaps
  >[0]

describe('findRowGaps', () => {
  it('passes rows that fill at every width', () => {
    expect(findRowGaps(cards('stat', 'stat', 'stat', 'stat'))).toEqual([])
    expect(
      findRowGaps(cards('lg', 'sm', 'sm', 'lg', 'md', 'md', 'full'))
    ).toEqual([])
  })

  it('reports lg then md on desktop', () => {
    const gaps = findRowGaps(cards('lg', 'md'))
    expect(gaps).toContainEqual({
      width: 'desktop',
      row: 0,
      ids: ['c0'],
      emptyTracks: 4
    })
  })

  it('reports a trailing short row', () => {
    const gaps = findRowGaps(cards('stat', 'stat', 'stat'))
    expect(gaps.find((g) => g.width === 'desktop')).toMatchObject({
      emptyTracks: 3
    })
    expect(gaps.find((g) => g.width === 'phone')).toMatchObject({
      emptyTracks: 1
    })
  })

  it('reports sm pairs on tablet only when odd', () => {
    expect(findRowGaps(cards('sm', 'sm', 'sm')).map((g) => g.width)).toEqual([
      'tablet'
    ])
  })
})

describe('ACTIONS_LABEL_LIMITS', () => {
  it('is tighter than the label limits without actions', () => {
    expect(ACTIONS_LABEL_LIMITS.stat).toBeLessThan(COPY_LIMITS.stat.label)
    for (const size of ['sm', 'md', 'lg', 'full'] as const)
      expect(ACTIONS_LABEL_LIMITS[size]).toBeLessThan(CHART_LABEL_LIMITS[size])
  })
})
