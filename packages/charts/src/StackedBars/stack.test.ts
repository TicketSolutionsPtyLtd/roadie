import { describe, expect, it } from 'vitest'

import { OTHER } from '../plot/series'
import { presaleExample, ticketMixExample } from './examples'
import { segmentNames, stackSegments } from './stack'

describe('stackSegments', () => {
  it('stacks segments in first-seen series order per category', () => {
    const august = stackSegments(ticketMixExample).filter(
      (s) => s.category === 'Aug'
    )
    expect(august.map((s) => s.series)).toEqual(['GA', 'VIP', 'Early bird'])
    expect(august.map((s) => [s.start, s.end])).toEqual([
      [0, 414],
      [414, 474],
      [474, 774]
    ])
  })

  it('stacks to 1 in share mode', () => {
    const lantern = stackSegments(presaleExample).filter(
      (s) => s.category === 'The Lantern Room'
    )
    expect(lantern.at(-1)!.end).toBeCloseTo(1, 9)
    expect(lantern[0]!.share).toBeCloseTo(820 / 1464, 9)
  })

  it('rolls segments past six into Other, drawn last', () => {
    const data = Array.from({ length: 9 }, (_, i) => ({
      c: 'A',
      s: `S${i}`,
      v: i + 1
    }))
    const props = { data, x: 'c', y: 'v', series: 's' }
    const series = new Set(stackSegments(props).map((s) => s.series))
    expect(series.size).toBe(6)
    expect(series).toContain(OTHER)
    expect(segmentNames(props).at(-1)).toBe(OTHER)
  })

  it('skips negative and missing values so bars start at zero', () => {
    const segments = stackSegments({
      data: [
        { c: 'A', s: 'X', v: -3 },
        { c: 'A', s: 'Y', v: null },
        { c: 'A', s: 'Z', v: 2 }
      ],
      x: 'c',
      y: 'v',
      series: 's'
    })
    expect(segments.map((s) => s.series)).toEqual(['Z'])
    expect(segments[0]!.start).toBe(0)
  })

  it('keeps series order when a category lacks the first series', () => {
    const segments = stackSegments({
      data: [
        { c: 'A', s: 'X', v: 1 },
        { c: 'A', s: 'Y', v: 2 },
        { c: 'B', s: 'Y', v: 3 }
      ],
      x: 'c',
      y: 'v',
      series: 's'
    })
    expect(segments.find((s) => s.category === 'B')).toMatchObject({
      series: 'Y',
      start: 0,
      end: 3
    })
  })
})
