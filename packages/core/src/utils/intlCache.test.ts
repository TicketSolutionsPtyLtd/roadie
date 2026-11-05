import { afterEach, describe, expect, it, vi } from 'vitest'

import { intlFormatter } from './intlCache'

afterEach(() => vi.restoreAllMocks())

describe('intlFormatter', () => {
  it('builds one formatter per locale and option set', () => {
    const NumberFormat = vi.spyOn(Intl, 'NumberFormat')
    const first = intlFormatter(Intl.NumberFormat, 'en-AU', {
      style: 'percent'
    })
    const again = intlFormatter(Intl.NumberFormat, 'en-AU', {
      style: 'percent'
    })
    const other = intlFormatter(Intl.NumberFormat, 'en-NZ', {
      style: 'percent'
    })
    expect(again).toBe(first)
    expect(other).not.toBe(first)
    expect(NumberFormat).toHaveBeenCalledTimes(2)
  })

  it('builds afresh when the constructor is replaced', () => {
    const before = intlFormatter(Intl.RelativeTimeFormat, 'en-AU', {})
    vi.spyOn(Intl, 'RelativeTimeFormat')
    expect(intlFormatter(Intl.RelativeTimeFormat, 'en-AU', {})).not.toBe(before)
  })

  it('keeps separate constructors apart under one key', () => {
    const number = intlFormatter(Intl.NumberFormat, 'en-AU', {})
    const plural = intlFormatter(Intl.PluralRules, 'en-AU', {})
    expect(number).toBeInstanceOf(Intl.NumberFormat)
    expect(plural).toBeInstanceOf(Intl.PluralRules)
  })

  it('lets go of its oldest formatter once full', () => {
    const NumberFormat = vi.spyOn(Intl, 'NumberFormat')
    const first = intlFormatter(Intl.NumberFormat, 'en-AU', {
      minimumIntegerDigits: 1
    })
    for (let digits = 2; digits <= 21; digits++)
      for (const locale of [
        'en-AU',
        'en-NZ',
        'en-GB',
        'en-US',
        'fr',
        'de',
        'ja',
        'es',
        'it',
        'nl'
      ])
        intlFormatter(Intl.NumberFormat, locale, {
          minimumIntegerDigits: digits
        })
    const built = NumberFormat.mock.calls.length
    expect(
      intlFormatter(Intl.NumberFormat, 'en-AU', { minimumIntegerDigits: 1 })
    ).not.toBe(first)
    expect(NumberFormat.mock.calls.length).toBe(built + 1)
  })
})
