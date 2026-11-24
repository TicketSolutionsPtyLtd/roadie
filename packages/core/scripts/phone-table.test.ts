import {
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
    const example = getExampleNumber(code as never, examples)
    return example ? [[code, example.number, example.nationalNumber]] : []
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

  // libphonenumber reads these three with patterns the table doesn't carry:
  // Bonaire and Tristan da Cunha by their leading digits inside a shared dial
  // code, and Gabon's optional prefix by a regex.
  const NEEDS_PATTERNS = ['BQ', 'GA', 'TA']

  const lengthsAround = (code: string, e164: string) => {
    const candidates = [
      e164.slice(0, -3),
      e164.slice(0, -2),
      e164.slice(0, -1),
      `${e164}1`,
      `${e164}12`,
      `${e164}123`
    ]
    return {
      ours: candidates.map((number) => parsePhone(number, code).possible),
      theirs: candidates.map((number) => isPossiblePhoneNumber(number))
    }
  }

  it.each(samples.filter(([code]) => !NEEDS_PATTERNS.includes(code!)))(
    'finds lengths around the %s example possible only where libphonenumber does',
    (code, e164) => {
      const { ours, theirs } = lengthsAround(code!, e164!)
      expect(ours).toEqual(theirs)
    }
  )

  it.each(NEEDS_PATTERNS)(
    'still differs from libphonenumber around the %s example',
    (code) => {
      const sample = samples.find(([sampled]) => sampled === code)!
      const { ours, theirs } = lengthsAround(code, sample[1]!)
      expect(ours).not.toEqual(theirs)
    }
  )

  it.each(
    samples.filter(([code]) => (GROUPED_COUNTRIES as string[]).includes(code!))
  )('groups the example mobile for %s as libphonenumber does', (_, e164) => {
    const parsed = parsePhoneNumberWithError(e164!)
    expect(formatPhone(e164!)).toBe(parsed.formatInternational())
    expect(formatPhone(e164!, 'national')).toBe(parsed.formatNational())
  })

  it.each(['+61298765432', '+611800123456', '+6493001234', '+64800123456'])(
    'groups %s as libphonenumber does',
    (e164) => {
      const parsed = parsePhoneNumberWithError(e164)
      expect(formatPhone(e164)).toBe(parsed.formatInternational())
      expect(formatPhone(e164, 'national')).toBe(parsed.formatNational())
    }
  )
})
