import { describe, expect, it } from 'vitest'

import { SERIES_CAP as CORE_SERIES_CAP } from '@oztix/roadie-core/dashboard'

import { cssPaint } from './paint'
import {
  OTHER,
  SERIES_CAP,
  asList,
  emphasisColor,
  rollupOther,
  seriesMarkId,
  seriesNames,
  seriesStyles
} from './series'

describe('series', () => {
  it('matches the core series cap', () => {
    expect(SERIES_CAP).toBe(CORE_SERIES_CAP)
  })

  it('lists series in first-seen order, or one named series', () => {
    const rows = [{ s: 'GA' }, { s: 'VIP' }, { s: 'GA' }]
    expect(seriesNames(rows, 's', 'Sold')).toEqual(['GA', 'VIP'])
    expect(seriesNames(rows, undefined, 'Sold')).toEqual(['Sold'])
  })

  it('rolls the smallest series past the cap into Other, per x', () => {
    const points = Array.from({ length: 8 }, (_, i) => [
      { x: 1, y: 10 * (i + 1), series: `S${i}` },
      { x: 2, y: 10 * (i + 1), series: `S${i}` }
    ]).flat()
    const rolled = rollupOther(points)
    const names = [...new Set(rolled.map((p) => p.series))]
    expect(names).toHaveLength(SERIES_CAP)
    expect(names).toContain(OTHER)
    expect(names).not.toContain('S0')
    const other = rolled.filter((p) => p.series === OTHER && p.x === 1)
    // S0, S1 and S2 roll up: 10 + 20 + 30.
    expect(other).toEqual([expect.objectContaining({ y: 60 })])
  })

  it('keeps a null as a gap when rolling up', () => {
    const points = [
      ...Array.from({ length: 7 }, (_, i) => ({
        x: 1,
        y: i + 1,
        series: `S${i}`
      })),
      { x: 2, y: null, series: 'S0' },
      { x: 2, y: null, series: 'S1' }
    ]
    const other = rollupOther(points).filter((p) => p.series === OTHER)
    expect(other.find((p) => p.x === 2)?.y ?? null).toBeNull()
  })

  it('paints highlighted series in the highlight and the rest as context', () => {
    const styles = seriesStyles(
      ['This show', 'Similar'],
      { highlight: 'This show' },
      cssPaint
    )
    expect(styles[0]).toMatchObject({
      color: cssPaint.highlight,
      emphasis: 'highlight'
    })
    expect(styles[1]).toMatchObject({
      color: cssPaint.context,
      emphasis: 'context'
    })
  })

  it('uses the pair and trio sets at two and three series', () => {
    expect(seriesStyles(['A', 'B'], {}, cssPaint).map((s) => s.color)).toEqual(
      cssPaint.pair
    )
    expect(
      seriesStyles(['A', 'B', 'C'], {}, cssPaint).map((s) => s.color)
    ).toEqual(cssPaint.trio)
    expect(
      seriesStyles(['A', 'B'], { palette: 'categorical' }, cssPaint).map(
        (s) => s.color
      )
    ).toEqual(cssPaint.categorical.slice(0, 2))
  })

  it('paints Other in the other grey with its own mark id', () => {
    const [, other] = seriesStyles(['A', OTHER], {}, cssPaint)
    expect(other).toMatchObject({ color: cssPaint.other, emphasis: 'other' })
    expect(seriesMarkId(other!.slot)).toBe('series-other')
    expect(seriesMarkId(1)).toBe('series-1')
  })

  it('reads one or many highlight names as a list', () => {
    expect(asList(undefined)).toEqual([])
    expect(asList('GA')).toEqual(['GA'])
    expect(asList(['GA', 'VIP'])).toEqual(['GA', 'VIP'])
  })

  it('colours a name by highlight, or leaves it to the palette', () => {
    expect(emphasisColor('GA', 'GA', cssPaint)).toBe(cssPaint.highlight)
    expect(emphasisColor('VIP', ['GA'], cssPaint)).toBe(cssPaint.context)
    expect(emphasisColor('GA', undefined, cssPaint)).toBeUndefined()
    expect(emphasisColor('GA', [], cssPaint)).toBeUndefined()
  })
})
