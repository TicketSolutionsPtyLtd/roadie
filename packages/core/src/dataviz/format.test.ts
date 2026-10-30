import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  deltaSentiment,
  describeDelta,
  formatDelta,
  formatValue,
  normalizeMinusSign
} from './format'

describe('formatValue', () => {
  it.each([
    [1842, 'number', '1,842'],
    [12.5, 'number', '12.5'],
    [12480, 'compact', '12.5k'],
    [12000, 'compact', '12k'],
    [0.77, 'percent', '77%'],
    [0.045, 'percent', '4.5%'],
    [1200, 'currency', '$1,200.00'],
    [19.95, 'currency', '$19.95'],
    [1200.004, 'currency', '$1,200.00'],
    [0, 'currency', '$0.00'],
    [118400, 'compactCurrency', '$118.4k'],
    [1_250_000, 'compactCurrency', '$1.3m'],
    [640, 'compactCurrency', '$640'],
    [9, 'points', '9 pts'],
    [1, 'points', '1 pt'],
    [112.4, 'index', '112'],
    [-1200, 'currency', '-$1,200.00']
  ] as const)('formats %s as %s', (value, format, expected) => {
    expect(formatValue(value, format)).toBe(expected)
  })

  it.each([
    [0.0127, 'percent', 2, '1.27%'],
    [0.1266, 'percent', 2, '12.66%'],
    [0.012, 'percent', 2, '1.20%'],
    [0.5, 'percent', 1, '50.0%'],
    [1842.5, 'number', 2, '1,842.50'],
    [12.5, 'number', 0, '13'],
    [1.5, 'points', 2, '1.50 pts'],
    [3116, 'currency', 2, '$3,116.00'],
    [19.95, 'currency', 0, '$20'],
    [12.3456, 'currency', 3, '$12.346']
  ] as const)(
    'formats %s as %s to %s places',
    (value, format, decimals, expected) => {
      expect(formatValue(value, format, { decimals })).toBe(expected)
    }
  )

  it('keeps compact and index formats short, whatever the decimals', () => {
    expect(formatValue(12_480, 'compact', { decimals: 2 })).toBe('12.5k')
    expect(formatValue(118_400, 'compactCurrency', { decimals: 2 })).toBe(
      '$118.4k'
    )
    expect(formatValue(112.4, 'index', { decimals: 2 })).toBe('112')
  })

  it('keeps decimal places between none and four', () => {
    expect(formatValue(1.23456789, 'number', { decimals: 9 })).toBe('1.2346')
    expect(formatValue(1.23456789, 'currency', { decimals: 9 })).toBe('$1.2346')
    expect(formatValue(1.5, 'number', { decimals: -1 })).toBe('2')
    expect(formatValue(1.25, 'number', { decimals: 1.6 })).toBe('1.25')
    expect(formatValue(1.5, 'number', { decimals: Infinity })).toBe('1.5')
  })

  it('reads decimal places that are not a number as unset', () => {
    const decimals = Number.parseFloat('two')
    expect(formatValue(1842.5, 'number', { decimals })).toBe('1,842.5')
    expect(formatValue(1200, 'currency', { decimals })).toBe('$1,200.00')
    expect(formatValue(0.0127, 'percent', { decimals })).toBe('1.3%')
  })

  it.each([
    [3116, 'currency', {}, '$3,116'],
    [19.95, 'currency', {}, '$19.95'],
    [1199.999, 'currency', {}, '$1,200'],
    [-1200, 'currency', {}, '-$1,200'],
    [0.02, 'percent', { decimals: 2 }, '2%'],
    [0.0127, 'percent', { decimals: 2 }, '1.27%'],
    [4, 'number', { decimals: 2 }, '4'],
    [0.045, 'percent', {}, '4.5%']
  ] as const)(
    'trims %s as %s with %o to "%s"',
    (value, format, options, expected) => {
      expect(
        formatValue(value, format, {
          ...options,
          trailingZeroDisplay: 'stripIfInteger'
        })
      ).toBe(expected)
    }
  )

  it.each([
    [1.005, '$1.01', '$1.01'],
    [8.995, '$9.00', '$9'],
    [0.995, '$1.00', '$1']
  ])('trims only the zeros %s shows at two places', (value, full, trimmed) => {
    expect(formatValue(value, 'currency')).toBe(full)
    expect(
      formatValue(value, 'currency', { trailingZeroDisplay: 'stripIfInteger' })
    ).toBe(trimmed)
  })

  it('keeps small compact currency short', () => {
    expect(formatValue(640, 'compactCurrency')).toBe('$640')
    expect(formatValue(19.95, 'compactCurrency')).toBe('$19.95')
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

  it('rounds to the next unit before choosing a suffix', () => {
    expect(formatValue(999_950, 'compactCurrency')).toBe('$1m')
    expect(formatValue(999_950, 'compact')).toBe('1m')
    expect(formatValue(999.95, 'compact')).toBe('1k')
    expect(formatValue(1_049_999, 'compactCurrency')).toBe('$1m')
  })

  it('chooses the unit from raw magnitude, not the rounded value', () => {
    expect(formatValue(950, 'compact')).toBe('950')
    expect(formatValue(950_000, 'compact')).toBe('950k')
    expect(formatValue(12_480, 'compact')).toBe('12.5k')
    expect(formatValue(-950, 'compact')).toBe('-950')
    expect(formatValue(-950_000, 'compact')).toBe('-950k')
    expect(formatValue(-999.95, 'compact')).toBe('-1k')
  })

  it('never renders a Unicode minus for negative values', () => {
    const formats = [
      'number',
      'compact',
      'percent',
      'currency',
      'compactCurrency',
      'points',
      'index'
    ] as const
    for (const format of formats) {
      expect(formatValue(-1234.5, format)).not.toContain('−')
    }
  })
})

describe('a value that rounds to zero', () => {
  it.each([
    ['number', -0.04, '0'],
    ['number', -0, '0'],
    ['compact', -0.04, '0'],
    ['percent', -0.0001, '0%'],
    ['currency', -0.001, '$0'],
    ['currency', -0, '$0'],
    ['compactCurrency', -0.001, '$0'],
    ['points', -0.04, '0 pts'],
    ['index', -0.4, '0']
  ] as const)('reads %s %d without a minus', (format, value, expected) => {
    expect(formatValue(value, format)).toBe(expected)
  })

  it('keeps the minus on a value that shows', () => {
    expect(formatValue(-0.4, 'number')).toBe('-0.4')
    expect(formatValue(-0.06, 'compact')).toBe('-0.1')
    expect(formatValue(-0.4, 'currency')).toBe('-$0.40')
  })
})

describe('normalizeMinusSign', () => {
  it('replaces the Unicode minus with an ASCII hyphen', () => {
    expect(normalizeMinusSign('−$1,200')).toBe('-$1,200')
  })
})

describe('formatDelta', () => {
  it('drops the sign', () => {
    expect(formatDelta(-0.04, 'percent')).toBe('4%')
    expect(formatDelta(214)).toBe('214')
    expect(formatDelta(-9, 'points')).toBe('9 pts')
  })

  it('takes the same options as the value', () => {
    expect(formatDelta(-0.0127, 'percent', { decimals: 2 })).toBe('1.27%')
    expect(
      formatDelta(-1200, 'currency', { trailingZeroDisplay: 'stripIfInteger' })
    ).toBe('$1,200')
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
    expect(describeDelta(9, 'points', 'up')).toBe('up 9 points, better')
    expect(describeDelta(-1, 'points', 'up')).toBe('down 1 point, worse')
    expect(describeDelta(-0.04, 'percent', 'up')).toBe('down 4%, worse')
    expect(describeDelta(3, 'number', 'neither')).toBe('up 3')
    expect(describeDelta(0, 'percent')).toBe('no change')
  })

  it('speaks the change to its decimal places', () => {
    expect(describeDelta(-0.0127, 'percent', 'up', { decimals: 2 })).toBe(
      'down 1.27%, worse'
    )
    expect(describeDelta(1, 'points', 'up', { decimals: 1 })).toBe(
      'up 1.0 points, better'
    )
    expect(
      describeDelta(1200, 'currency', 'up', {
        trailingZeroDisplay: 'stripIfInteger'
      })
    ).toBe('up $1,200, better')
  })
})

describe('points', () => {
  it('names one point only when it reads as 1', () => {
    expect(formatValue(1, 'points', { decimals: 2 })).toBe('1.00 pts')
    expect(
      formatValue(1, 'points', {
        decimals: 2,
        trailingZeroDisplay: 'stripIfInteger'
      })
    ).toBe('1 pt')
    expect(formatValue(0.96, 'points')).toBe('1 pt')
    expect(formatValue(-1, 'points')).toBe('-1 pt')
  })
})

describe('formatter reuse', () => {
  afterEach(() => vi.restoreAllMocks())

  it('builds each number format once across many values', async () => {
    vi.resetModules()
    const { formatValue: fresh } = await import('./format')
    const construct = vi.spyOn(Intl, 'NumberFormat')
    const formatAll = () => {
      for (let value = 0; value < 500; value += 1) {
        fresh(value * 1.5, 'number')
        fresh(value * 100, 'currency')
        fresh(value / 1000, 'percent')
      }
    }

    formatAll()
    const built = construct.mock.calls.length
    expect(built).toBeGreaterThan(0)
    expect(built).toBeLessThanOrEqual(8)

    formatAll()
    expect(construct.mock.calls.length).toBe(built)
  })

  it("drops a whole amount's cents where Intl ignores trailingZeroDisplay", async () => {
    const { NumberFormat } = Intl
    vi.spyOn(Intl, 'NumberFormat').mockImplementation(
      function (locales, options) {
        return new NumberFormat(locales, {
          ...options,
          trailingZeroDisplay: 'auto'
        })
      }
    )
    vi.resetModules()
    const { formatValue: fresh } = await import('./format')
    expect(
      fresh(1200, 'currency', { trailingZeroDisplay: 'stripIfInteger' })
    ).toBe('$1,200')
    expect(fresh(1200, 'currency')).toBe('$1,200.00')
    expect(
      fresh(19.5, 'currency', { trailingZeroDisplay: 'stripIfInteger' })
    ).toBe('$19.50')
    expect(fresh(640, 'compactCurrency')).toBe('$640')
  })

  it('keeps each option set on its own formatter', () => {
    const interleaved = [
      formatValue(1200, 'currency', { trailingZeroDisplay: 'stripIfInteger' }),
      formatValue(19.95, 'currency'),
      formatValue(0.77, 'percent'),
      formatValue(0.045, 'percent'),
      formatValue(1200, 'currency'),
      formatValue(0.77, 'percent')
    ]
    expect(interleaved).toEqual([
      '$1,200',
      '$19.95',
      '77%',
      '4.5%',
      '$1,200.00',
      '77%'
    ])
  })
})
