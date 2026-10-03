import { describe, expect, it } from 'vitest'

import { formatRecordValue } from './format'
import { eventFields, eventRows } from './testFields'
import type { RecordField } from './types'

const field = (key: string) => eventFields.find((f) => f.key === key)!
const options = {
  timeZone: 'Australia/Sydney',
  now: new Date('2026-10-03T00:00:00Z')
}

describe('formatRecordValue', () => {
  it.each<[string, string, object, string | null]>([
    ['text', 'name', eventRows.walrus, 'Lampshade Disco'],
    ['an option label', 'venue', eventRows.walrus, 'The Quilted Walrus Room'],
    ['a list of options', 'genres', eventRows.walrus, 'Jazz, Folk'],
    [
      'an unknown option as given',
      'venue',
      { venue: 'Drongo Bell Social Club' },
      'Drongo Bell Social Club'
    ],
    ['an unknown status as given', 'status', { status: 'held' }, 'held'],
    ['a status label', 'status', eventRows.walrus, 'Selling fast'],
    ['a status key, humanised', 'status', eventRows.drongo, 'On sale'],
    ['a number', 'capacity', { capacity: 1234.56 }, '1,234.6'],
    ['money in dollars', 'gross', eventRows.walrus, '$12,500'],
    ['zero as a value', 'gross', eventRows.drongo, '$0'],
    ['a boolean', 'featured', eventRows.walrus, 'Yes'],
    ['false as a value', 'featured', eventRows.drongo, 'No'],
    ['a plain date as itself', 'birthday', eventRows.tba, 'Wed 3 Oct 1990'],
    [
      'an event time in the venue zone',
      'starts',
      eventRows.drongo,
      'Sat 3 Oct 2026, 11:30pm'
    ],
    [
      'an event range',
      'starts',
      eventRows.festival,
      'Thu 1, 6pm to Mon 5 Oct 2026, 11pm'
    ],
    [
      'a timestamp in the viewer zone',
      'created',
      eventRows.walrus,
      '1 Sept 2026, 8pm'
    ],
    ['empty text as nothing', 'venue', eventRows.tba, null],
    ['a missing number as nothing', 'capacity', eventRows.tba, null],
    ['an empty list as nothing', 'genres', eventRows.festival, null]
  ])('reads %s', (_, key, row, expected) => {
    expect(formatRecordValue(row, field(key), options)).toBe(expected)
  })

  it('reads a list of dates as each date', () => {
    const sessions: RecordField = {
      key: 'sessions',
      label: 'Sessions',
      type: 'date',
      moment: 'date',
      multiple: true
    }
    expect(
      formatRecordValue(
        { sessions: ['2026-10-03', '2026-10-04'] },
        sessions,
        options
      )
    ).toBe('Sat 3 Oct 2026, Sun 4 Oct 2026')
  })

  it("reads a field's options once for many values", () => {
    let reads = 0
    const venue = field('venue')
    const counted: RecordField = {
      ...venue,
      get options() {
        reads += 1
        return venue.options
      }
    }
    formatRecordValue(eventRows.walrus, counted, options)
    const first = reads
    for (let i = 0; i < 50; i++)
      formatRecordValue(eventRows.walrus, counted, options)
    expect(reads).toBe(first)
  })

  it('formats with the field format', () => {
    const sold: RecordField = {
      key: 'sold',
      label: 'Sold',
      type: 'number',
      format: 'compact'
    }
    expect(formatRecordValue({ sold: 12_400 }, sold, options)).toBe('12.4k')
  })

  it('names a currency other than dollars', () => {
    const gross: RecordField = {
      key: 'gross',
      label: 'Gross',
      type: 'money',
      currencyKey: 'currency'
    }
    expect(
      formatRecordValue({ gross: 12_500, currency: 'NZD' }, gross, options)
    ).toBe('NZD\u00a012,500')
    expect(
      formatRecordValue({ gross: 12_500, currency: 'AUD' }, gross, options)
    ).toBe('$12,500')
  })

  it('reads another currency like dollars at the edges', () => {
    const gross: RecordField = {
      key: 'gross',
      label: 'Gross',
      type: 'money',
      currency: 'NZD'
    }
    const read = (value: number, format?: RecordField['format']) =>
      formatRecordValue({ gross: value }, { ...gross, format }, options)
    expect(read(Number.POSITIVE_INFINITY)).toBe('Not available')
    expect(read(-1234.5)).toBe('-NZD\u00a01,234.50')
    expect(read(1_234_567, 'compactCurrency')).toBe('NZD\u00a01.2M')
  })

  it('shows text it cannot format as given', () => {
    expect(
      formatRecordValue({ starts: 'To be announced' }, field('starts'), options)
    ).toBe('To be announced')
    expect(
      formatRecordValue({ gross: 'On sale soon' }, field('gross'), options)
    ).toBe('On sale soon')
  })
})
