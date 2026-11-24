import { describe, expect, it } from 'vitest'

import {
  formatPhone,
  isPossiblePhone,
  parsePhone,
  phoneCountries
} from './index'

describe('parsePhone', () => {
  it.each([
    ['0412 345 678', 'AU', 'AU', '412345678', '+61412345678', true],
    ['412345678', 'AU', 'AU', '412345678', '+61412345678', true],
    ['(02) 9876-5432', 'AU', 'AU', '298765432', '+61298765432', true],
    ['1800 123 456', 'AU', 'AU', '1800123456', '+611800123456', true],
    ['0412 345 678', 'au', 'AU', '412345678', '+61412345678', true],
    ['021 123 4567', 'NZ', 'NZ', '211234567', '+64211234567', true],
    ['07400 123456', 'GB', 'GB', '7400123456', '+447400123456', true],
    ['0412', 'AU', 'AU', '412', '+61412', false],
    ['', 'AU', 'AU', '', '', false],
    ['abc', 'AU', 'AU', '', '', false]
  ])(
    'reads %j in %s as %s %s',
    (input, defaultCountry, country, national, e164, possible) => {
      expect(parsePhone(input, defaultCountry)).toEqual({
        country,
        national,
        e164,
        possible
      })
    }
  )

  it.each([
    ['+64 21 123 4567', 'AU', 'NZ', '211234567', '+64211234567'],
    ['0064 21 123 4567', 'AU', 'NZ', '211234567', '+64211234567'],
    ['+353 85 123 4567', 'AU', 'IE', '851234567', '+353851234567'],
    ['+61 412 345 678', 'NZ', 'AU', '412345678', '+61412345678'],
    ['+61 0412 345 678', 'NZ', 'AU', '412345678', '+61412345678'],
    ['(+61) 412 345 678', 'NZ', 'AU', '412345678', '+61412345678'],
    [' +61 (0)412 345 678', 'NZ', 'AU', '412345678', '+61412345678']
  ])(
    'takes the country from %j, whatever the default',
    (input, defaultCountry, country, national, e164) => {
      expect(parsePhone(input, defaultCountry)).toEqual({
        country,
        national,
        e164,
        possible: true
      })
    }
  )

  it('keeps the default country when it shares the dial code', () => {
    expect(parsePhone('+1 416 555 0123', 'CA').country).toBe('CA')
    expect(parsePhone('+1 416 555 0123', 'AU').country).toBe('US')
    expect(parsePhone('+44 7400 123456', 'JE').country).toBe('JE')
  })

  it('keeps a first digit that only looks like the trunk prefix', () => {
    // Russia's trunk prefix is 8, and its 812 area code starts with one.
    expect(parsePhone('812 123-45-67', 'RU').e164).toBe('+78121234567')
    expect(parsePhone('8 812 123-45-67', 'RU').e164).toBe('+78121234567')
  })

  it('has no number for a dial code nobody holds', () => {
    expect(parsePhone('+999 123 456', 'AU')).toEqual({
      country: null,
      national: '999123456',
      e164: '',
      possible: false
    })
  })

  it('has no number without a country it knows', () => {
    expect(parsePhone('0412 345 678', 'XX')).toEqual({
      country: null,
      national: '0412345678',
      e164: '',
      possible: false
    })
    expect(parsePhone('0412 345 678').country).toBeNull()
  })

  it('reads an international number with no default', () => {
    expect(parsePhone('+61412345678').e164).toBe('+61412345678')
  })
})

describe('isPossiblePhone', () => {
  it.each([
    ['+61412345678', true],
    ['+64211234567', true],
    ['+14165550123', true],
    ['+61412', false],
    ['+6141234567890', false],
    ['61412345678', false],
    ['0412345678', false],
    ['+999123456', false],
    ['', false]
  ])('%j is %s', (e164, possible) => {
    expect(isPossiblePhone(e164)).toBe(possible)
  })
})

describe('formatPhone', () => {
  it.each([
    ['+61412345678', '+61 412 345 678', '0412 345 678'],
    ['+61298765432', '+61 2 9876 5432', '(02) 9876 5432'],
    ['+611800123456', '+61 1800 123 456', '1800 123 456'],
    ['+64211234567', '+64 21 123 4567', '021 123 4567'],
    ['+6493001234', '+64 9 300 1234', '09 300 1234']
  ])('groups %s', (e164, international, national) => {
    expect(formatPhone(e164)).toBe(international)
    expect(formatPhone(e164, 'international')).toBe(international)
    expect(formatPhone(e164, 'national')).toBe(national)
  })

  it('splits the dial code from an ungrouped country, in both styles', () => {
    expect(formatPhone('+447400123456')).toBe('+44 7400123456')
    expect(formatPhone('+447400123456', 'national')).toBe('+44 7400123456')
    expect(formatPhone('+14165550123')).toBe('+1 4165550123')
  })

  it('leaves an Australian number it has no pattern for ungrouped', () => {
    expect(formatPhone('+61412')).toBe('+61 412')
  })

  it('returns what it cannot read', () => {
    expect(formatPhone('hello')).toBe('hello')
    expect(formatPhone('0412 345 678')).toBe('0412 345 678')
    expect(formatPhone('')).toBe('')
  })
})

describe('phoneCountries', () => {
  it('lists each country once with its dial code, in code order', () => {
    const codes = phoneCountries.map((country) => country.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual([...codes].sort())
    expect(codes.length).toBeGreaterThan(230)
  })

  it.each([
    ['AU', '61'],
    ['NZ', '64'],
    ['US', '1'],
    ['CA', '1'],
    ['GB', '44'],
    ['IE', '353'],
    ['SG', '65']
  ])('%s dials %s', (code, dialCode) => {
    expect(phoneCountries.find((country) => country.code === code)).toEqual({
      code,
      dialCode
    })
  })
})
