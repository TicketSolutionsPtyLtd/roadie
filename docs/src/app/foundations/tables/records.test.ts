import { describe, expect, it } from 'vitest'

import { OZTIX_RECORDS } from './records'

describe('Oztix records reference', () => {
  it('covers the records clients work with', () => {
    expect(OZTIX_RECORDS.map((record) => record.name)).toEqual([
      'Event',
      'Order',
      'Attendee',
      'Customer',
      'Ticket type',
      'Payout',
      'Refund',
      'Promo code'
    ])
  })

  it('pins exactly one title column per record, first', () => {
    for (const record of OZTIX_RECORDS) {
      const pinned = record.columns.filter((c) => c.pin)
      expect(pinned, record.name).toHaveLength(1)
      expect(record.columns[0]?.pin, record.name).toBe(true)
    }
  })

  it('has unique column labels within each record', () => {
    for (const record of OZTIX_RECORDS) {
      const labels = record.columns.map((c) => c.label)
      expect(new Set(labels).size, record.name).toBe(labels.length)
    }
  })

  it('gives every money column the format its copy names, and only money', () => {
    const formatFor = (shows: string) =>
      shows.startsWith('Compact currency')
        ? 'compactCurrency'
        : shows.startsWith('Currency')
          ? 'currency'
          : undefined
    for (const record of OZTIX_RECORDS)
      for (const column of record.columns) {
        expect(column.format, `${record.name} ${column.label}`).toBe(
          formatFor(column.shows)
        )
        if (column.format)
          expect(column.type, `${record.name} ${column.label}`).toBe('money')
      }
  })

  it('shows every status as a Badge from an option field', () => {
    for (const record of OZTIX_RECORDS)
      for (const column of record.columns)
        if (column.shows === 'Badge')
          expect(column.type, `${record.name} ${column.label}`).toBe('option')
  })

  it('links only to Pane examples that exist on the RecordTable page', () => {
    for (const record of OZTIX_RECORDS)
      if (record.example) expect(['in-a-pane']).toContain(record.example.anchor)
  })

  it('has no dashes in its copy', () => {
    expect(JSON.stringify(OZTIX_RECORDS)).not.toMatch(/[–—]/)
  })
})
