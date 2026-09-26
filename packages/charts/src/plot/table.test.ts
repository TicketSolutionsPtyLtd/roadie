import { describe, expect, it } from 'vitest'

import { fieldLabel, valueColumn, xCell, xColumn } from './table'

describe('table helpers', () => {
  it('turns field names into sentence case headers', () => {
    expect(fieldLabel('ticketsSold')).toBe('Tickets sold')
    expect(fieldLabel('sell_through')).toBe('Sell through')
    expect(fieldLabel('day')).toBe('Day')
  })

  it('makes a text x column and a full value column', () => {
    expect(xColumn('day')).toEqual({ key: 'day', header: 'Day', kind: 'text' })
    expect(valueColumn('sold', 'Sold', 'compact')).toEqual({
      key: 'sold',
      header: 'Sold',
      kind: 'number',
      format: 'number'
    })
  })

  it('writes dates as house dates in the table', () => {
    expect(xCell('2026-11-27', true)).toBe('Fri 27 Nov')
    expect(xCell('2026-11-27T19:30', true)).toBe('Fri 27 Nov, 7:30pm')
    expect(xCell(90, false)).toBe(90)
  })
})
