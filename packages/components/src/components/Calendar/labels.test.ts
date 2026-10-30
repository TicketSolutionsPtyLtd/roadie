import { describe, expect, it } from 'vitest'

import { monthLabel, monthNames, weekCaption } from './labels'

describe('Calendar labels', () => {
  it('names Gregorian months where the locale defaults to another calendar', () => {
    expect(monthNames('fa')[10]).toBe('نوامبر')
    expect(monthLabel('2026-11-01', 'fa')).toMatch(/نوامبر/)
    expect(weekCaption('2026-11-02', '2026-11-08', 'ps')).toMatch(/نومبر/)
  })

  it('keeps English as it was', () => {
    expect(monthNames('en-AU')[2]).toBe('March')
    expect(monthLabel('2027-03-01', 'en-AU')).toBe('March 2027')
  })
})
