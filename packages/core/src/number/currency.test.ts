import { describe, expect, expectTypeOf, it } from 'vitest'

import { normalizeMinusSign } from '../dataviz/format'
import { type CurrencyFormatOptions, currencyFormat } from './currency'

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
    [{ decimals: 1.6, trimZeros: false }, 1.5, '$1.50'],
    [{ decimals: 150, trimZeros: false }, 1.5, `$1.5${'0'.repeat(19)}`],
    [{ currency: 'aud' }, 1200, '$1,200'],
    [{ currency: 'NZD' }, 12_500, 'NZD 12,500'],
    [{ currency: 'NZD' }, -1234.5, '-NZD 1,234.50'],
    [{ currency: 'JPY' }, 1234.5, 'JPY 1,235'],
    [{ currency: 'KWD' }, 1.5, 'KWD 1.500'],
    [{ currency: 'XYZ' }, 1200, 'XYZ 1,200'],
    [{ currency: 'NZD', compact: true }, 1_234_567, 'NZD 1.2M'],
    [{ currency: 'NZD', compact: true }, 12_000, 'NZD 12K']
  ])('reads %o %s as %s', (options, value, expected) => {
    const text = new Intl.NumberFormat('en-AU', currencyFormat(options))
      .format(value)
      .replace(/\u00a0/g, ' ')
    expect(normalizeMinusSign(text)).toBe(expected)
  })

  it('reads dollars as $ in any locale', () => {
    const read = (options: CurrencyFormatOptions) =>
      new Intl.NumberFormat('en-US', currencyFormat(options)).format(1200)
    expect(read({})).toBe('$1,200')
    expect(read({ currency: 'aud' })).toBe('$1,200')
    expect(read({ currency: 'NZD' })).toBe('NZ$1,200')
  })

  it('lets older Safari build a compact format for any currency', () => {
    // Older Safari throws when the maximum is under the currency's minimum;
    // current engines don't, so only the options can show it.
    expect(currencyFormat({ currency: 'KWD', compact: true })).toMatchObject({
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    })
  })

  it("returns options NumberFlow's format prop accepts", () => {
    // number-flow's Format type: no scientific or engineering notation.
    type NumberFlowFormat = Omit<Intl.NumberFormatOptions, 'notation'> & {
      notation?: 'standard' | 'compact'
    }
    expectTypeOf(currencyFormat()).toExtend<NumberFlowFormat>()
  })

  it('falls back to dollars for a code Intl does not know', () => {
    expect(currencyFormat({ currency: 'not-a-code' })).toEqual(currencyFormat())
    // Untyped callers can pass null from a record.
    const untyped = { currency: null } as unknown as CurrencyFormatOptions
    expect(currencyFormat(untyped)).toEqual(currencyFormat())
  })
})
