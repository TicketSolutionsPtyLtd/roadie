import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type CurrencyFormatOptions,
  currencyFormat,
  deltaSentiment,
  describeDelta,
  formatDelta,
  formatValue,
  normalizeMinusSign
} from './format'

describe('currencyFormat', () => {
  it.each<[CurrencyFormatOptions, number, string]>([
    [{}, 1200, '$1,200'],
    [{}, 19.95, '$19.95'],
    [{}, 19.5, '$19.50'],
    [{}, -1200, '-$1,200'],
    [{ trimZeros: false }, 1200, '$1,200.00'],
    [{ decimals: 0 }, 19.95, '$20'],
    [{ decimals: 3, trimZeros: false }, 1.5, '$1.500'],
    [{ decimals: Number.NaN }, 19.95, '$19.95'],
    [{ decimals: -1 }, 19.95, '$20'],
    [{ currency: 'aud' }, 1200, '$1,200'],
    [{ currency: 'NZD' }, 12_500, 'NZD 12,500'],
    [{ currency: 'NZD' }, -1234.5, '-NZD 1,234.50'],
    [{ currency: 'JPY' }, 1234.5, 'JPY 1,235'],
    [{ currency: 'KWD' }, 1.5, 'KWD 1.500'],
    [{ currency: 'NZD', compact: true }, 1_234_567, 'NZD 1.2M'],
    [{ currency: 'NZD', compact: true }, 12_000, 'NZD 12K']
  ])('reads %o %s as %s', (options, value, expected) => {
    const text = new Intl.NumberFormat('en-AU', currencyFormat(options))
      .format(value)
      .replace(/\u00a0/g, ' ')
    expect(normalizeMinusSign(text)).toBe(expected)
  })

  it('falls back to dollars for a code Intl does not know', () => {
    expect(currencyFormat({ currency: 'not-a-code' })).toEqual(currencyFormat())
  })
})

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
    [1200.004, 'currency', '$1,200'],
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
    expect(fresh(1200, 'currency')).toBe('$1,200')
    expect(fresh(19.5, 'currency')).toBe('$19.50')
    expect(fresh(640, 'compactCurrency')).toBe('$640')
  })

  it('keeps each option set on its own formatter', () => {
    const interleaved = [
      formatValue(1200, 'currency'),
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
      '$1,200',
      '77%'
    ])
  })
})
