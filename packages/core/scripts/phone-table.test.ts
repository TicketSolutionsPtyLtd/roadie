import {
  type CountryCode,
  getExampleNumber,
  isPossiblePhoneNumber,
  parsePhoneNumberWithError
} from 'libphonenumber-js/max'
import examples from 'libphonenumber-js/mobile/examples'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { formatPhone, parsePhone, phoneCountries } from '../src/phone'
import { GROUPED_COUNTRIES, phoneTableSource } from './phone-table.mjs'

describe('the phone table', () => {
  it('is what the installed libphonenumber generates', () => {
    const committed = readFileSync(
      new URL('../src/phone/table.ts', import.meta.url),
      'utf8'
    )
    // Out of date? Run `node scripts/phone-table.mjs` in packages/core.
    expect(committed).toBe(phoneTableSource())
  })
})

describe('against libphonenumber', () => {
  const samples = phoneCountries.flatMap(({ code }) => {
    const example = getExampleNumber(code as CountryCode, examples)
    return example
      ? [[code, example.number, example.nationalNumber] as const]
      : []
  })

  it('has an example mobile for nearly every country', () => {
    expect(samples.length).toBeGreaterThan(230)
  })

  it.each(samples)(
    'reads the example mobile for %s as libphonenumber does',
    (code, e164, national) => {
      expect(parsePhone(e164, code)).toEqual({
        country: code,
        national,
        e164,
        possible: true
      })
    }
  )

  // Argentina's mobile 15 and Belarus's 80 are rewritten by regexes the table doesn't carry.
  const NATIONAL_NEEDS_PATTERNS = ['AR', 'BY']
  const readsNational = (code: string, e164: string) =>
    expect(
      parsePhone(parsePhoneNumberWithError(e164).formatNational(), code).e164
    ).toBe(e164)

  it.each(samples.filter(([code]) => !NATIONAL_NEEDS_PATTERNS.includes(code)))(
    'reads the example mobile for %s as it is written at home',
    (code, e164) => readsNational(code, e164)
  )

  it.fails.each(
    samples.filter(([code]) => NATIONAL_NEEDS_PATTERNS.includes(code))
  )('reads the example mobile for %s as it is written at home', (code, e164) =>
    readsNational(code, e164)
  )

  // Bonaire and Tristan da Cunha are told apart by leading digits, and Gabon's prefix by a regex.
  const LENGTHS_NEED_PATTERNS = ['BQ', 'GA', 'TA']
  const fitsWhereTheirsDoes = (code: string, e164: string) => {
    const candidates = [
      e164.slice(0, -3),
      e164.slice(0, -2),
      e164.slice(0, -1),
      `${e164}1`,
      `${e164}12`,
      `${e164}123`
    ]
    expect(
      candidates.map((number) => parsePhone(number, code).possible)
    ).toEqual(candidates.map((number) => isPossiblePhoneNumber(number)))
  }

  it.each(samples.filter(([code]) => !LENGTHS_NEED_PATTERNS.includes(code)))(
    'finds lengths around the %s example possible only where libphonenumber does',
    (code, e164) => fitsWhereTheirsDoes(code, e164)
  )

  it.fails.each(
    samples.filter(([code]) => LENGTHS_NEED_PATTERNS.includes(code))
  )(
    'finds lengths around the %s example possible only where libphonenumber does',
    (code, e164) => fitsWhereTheirsDoes(code, e164)
  )

  it.each(samples.filter(([code]) => GROUPED_COUNTRIES.includes(code)))(
    'groups the example mobile for %s as libphonenumber does',
    (_, e164) => {
      const parsed = parsePhoneNumberWithError(e164)
      expect(formatPhone(e164)).toBe(parsed.formatInternational())
      expect(formatPhone(e164, 'national')).toBe(parsed.formatNational())
    }
  )

  it.each(['+61298765432', '+611800123456', '+6493001234', '+64800123456'])(
    'groups %s as libphonenumber does',
    (e164) => {
      const parsed = parsePhoneNumberWithError(e164)
      expect(formatPhone(e164)).toBe(parsed.formatInternational())
      expect(formatPhone(e164, 'national')).toBe(parsed.formatNational())
    }
  )
})
