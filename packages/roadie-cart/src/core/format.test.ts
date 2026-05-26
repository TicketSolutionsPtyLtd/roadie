import { describe, expect, it } from 'vitest'

import { formatCurrency, formatDayHeader } from './format'

describe('formatCurrency', () => {
  it('formats AUD in en-AU', () => {
    expect(formatCurrency(12.5, { locale: 'en-AU', currency: 'AUD' })).toBe(
      '$12.50'
    )
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
})
