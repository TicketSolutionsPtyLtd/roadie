import { readFileSync } from 'node:fs'
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

  it('titles each record by its pinned column on a phone, one role each', () => {
    for (const record of OZTIX_RECORDS) {
      const titles = record.columns.filter((c) => c.narrow === 'title')
      expect(titles, record.name).toEqual([record.columns[0]])
      for (const role of ['description', 'leading', 'trailing'] as const)
        expect(
          record.columns.filter((c) => c.narrow === role).length,
          `${record.name} ${role}`
        ).toBeLessThanOrEqual(1)
      const cards = record.columns.some((c) => c.narrow === 'detail')
      expect(
        record.phone.startsWith(cards ? 'Cards' : 'List rows'),
        record.name
      ).toBe(true)
    }
  })

  it('never gives a pinned column a priority', () => {
    for (const record of OZTIX_RECORDS)
      for (const column of record.columns)
        if (column.pin) expect(column.priority, record.name).toBeUndefined()
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
    const page = readFileSync(
      new URL('../../components/record-table/page.mdx', import.meta.url),
      'utf8'
    )
    const anchors = [...page.matchAll(/^#{2,4} (.+)$/gm)].map(([, heading]) =>
      heading!
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
    for (const record of OZTIX_RECORDS)
      if (record.example) expect(anchors).toContain(record.example.anchor)
  })

  it('has no dashes in its copy', () => {
    expect(JSON.stringify(OZTIX_RECORDS)).not.toMatch(/[–—]/)
  })
})
