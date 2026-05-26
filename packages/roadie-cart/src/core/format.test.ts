import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDayHeader } from './format'

describe('formatCurrency', () => {
  it('formats AUD in en-AU', () => {
    const out = formatCurrency(12.5, { locale: 'en-AU', currency: 'AUD' })
    expect(out).toContain('12.50')
  })
  it('formats NZD in en-NZ (no hardcoded $ / AUD)', () => {
    const out = formatCurrency(12.5, { locale: 'en-NZ', currency: 'NZD' })
    expect(out).toContain('12.50')
    expect(out).toContain('$') // en-NZ uses $ but the currency is NZD
  })
})

describe('formatDayHeader', () => {
  it('formats a venue-local key into a readable header', () => {
    const out = formatDayHeader('2026-06-15', { locale: 'en-AU' })
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/June|Jun/)
  })
  it('returns the raw key for an empty string (fail-safe)', () => {
    expect(formatDayHeader('', { locale: 'en-AU' })).toBe('')
  })
  it('returns the raw key for an out-of-range date (no rollover)', () => {
    expect(formatDayHeader('2026-13-40', { locale: 'en-AU' })).toBe(
      '2026-13-40'
    )
  })
})
