import { describe, expect, it } from 'vitest'

import {
  deltaSentiment,
  describeDelta,
  formatDelta,
  formatValue
} from './format'

describe('formatValue', () => {
  it.each([
    [1842, 'number', '1,842'],
    [12.5, 'number', '12.5'],
    [12480, 'compact', '12.5k'],
    [12000, 'compact', '12k'],
    [0.77, 'percent', '77%'],
    [0.045, 'percent', '4.5%'],
    [1200, 'currency', '$1,200'],
    [19.95, 'currency', '$19.95'],
    [118400, 'compactCurrency', '$118.4k'],
    [1_250_000, 'compactCurrency', '$1.3m'],
    [640, 'compactCurrency', '$640'],
    [9, 'points', '9 pts'],
    [1, 'points', '1 pt'],
    [112.4, 'index', '112'],
    [-1200, 'currency', '-$1,200']
  ] as const)('formats %s as %s', (value, format, expected) => {
    expect(formatValue(value, format)).toBe(expected)
  })

  it('defaults to number', () => {
    expect(formatValue(2400)).toBe('2,400')
  })

  it('never throws on non-finite input', () => {
    expect(formatValue(Number.NaN)).toBe('Not available')
    expect(formatValue(Number.POSITIVE_INFINITY, 'percent')).toBe(
      'Not available'
    )
  })
})

describe('formatDelta', () => {
  it('drops the sign', () => {
    expect(formatDelta(-0.04, 'percent')).toBe('4%')
    expect(formatDelta(214)).toBe('214')
    expect(formatDelta(-9, 'points')).toBe('9 pts')
  })
})

describe('deltaSentiment', () => {
  it('reads meaning from goodWhen', () => {
    expect(deltaSentiment(5, 'up')).toBe('good')
    expect(deltaSentiment(-5, 'up')).toBe('bad')
    expect(deltaSentiment(-5, 'down')).toBe('good')
    expect(deltaSentiment(5, 'neither')).toBe('neutral')
    expect(deltaSentiment(0, 'up')).toBe('neutral')
  })
})

describe('describeDelta', () => {
  it('speaks direction and meaning', () => {
    expect(describeDelta(9, 'points', 'up')).toBe('up 9 pts, better')
    expect(describeDelta(-0.04, 'percent', 'up')).toBe('down 4%, worse')
    expect(describeDelta(3, 'number', 'neither')).toBe('up 3')
    expect(describeDelta(0, 'percent')).toBe('no change')
  })
})
