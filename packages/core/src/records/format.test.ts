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
    ['money in dollars', 'gross', eventRows.walrus, '$12,500.00'],
    ['zero as a value', 'gross', eventRows.drongo, '$0.00'],
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

  it('keeps an end held as an instant after a plain start date, as a date in the zone', () => {
    const run: RecordField = {
      key: 'opens',
      label: 'Run',
      type: 'date',
      moment: 'date',
      end: 'closes'
    }
    expect(
      formatRecordValue(
        { opens: '2026-10-03', closes: '2026-10-04T20:00:00Z' },
        run,
        options
      )
    ).toBe(
      formatRecordValue(
        { opens: '2026-10-03', closes: '2026-10-05' },
        run,
        options
      )
    )
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

  it('formats to the field’s decimal places', () => {
    const share: RecordField = {
      key: 'share',
      label: 'Share',
      type: 'number',
      format: 'percent',
      decimals: 2
    }
    expect(formatRecordValue({ share: 0.0127 }, share, options)).toBe('1.27%')
    const gross: RecordField = {
      key: 'gross',
      label: 'Gross',
      type: 'money',
      trailingZeroDisplay: 'stripIfInteger'
    }
    expect(formatRecordValue({ gross: 12_500 }, gross, options)).toBe('$12,500')
    const nzd = { ...gross, currency: 'NZD' }
    expect(formatRecordValue({ gross: 12_500 }, nzd, options)).toBe(
      'NZD 12,500'
    )
    expect(formatRecordValue({ gross: 12_500.5 }, nzd, options)).toBe(
      'NZD 12,500.50'
    )
    expect(
      formatRecordValue(
        { gross: 12_500.5 },
        { ...nzd, trailingZeroDisplay: undefined, decimals: 0 },
        options
      )
    ).toBe('NZD 12,501')
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
    ).toBe('NZD\u00a012,500.00')
    expect(
      formatRecordValue({ gross: 12_500, currency: 'AUD' }, gross, options)
    ).toBe('$12,500.00')
  })

  it.each<[number, RecordField['format'], string]>([
    [Number.POSITIVE_INFINITY, undefined, 'Not available'],
    [-1234.5, undefined, '-NZD\u00a01,234.50'],
    [1_234_567, 'compactCurrency', 'NZD\u00a01.2M'],
    [999.5, 'compactCurrency', 'NZD\u00a0999.50']
  ])('reads %s as %s in NZD: %s', (value, format, expected) => {
    const gross: RecordField = {
      key: 'gross',
      label: 'Gross',
      type: 'money',
      currency: 'NZD',
      format
    }
    expect(formatRecordValue({ gross: value }, gross, options)).toBe(expected)
  })

  it('reads another currency to the field’s places as dollars do', () => {
    const read = (value: number, places: Partial<RecordField>) =>
      formatRecordValue(
        { gross: value },
        { key: 'gross', label: 'Gross', type: 'money', ...places },
        options
      )
    const decimals = Number.parseFloat('two')
    expect(read(12_500.5, { decimals })).toBe('$12,500.50')
    expect(read(12_500.5, { currency: 'NZD', decimals })).toBe(
      'NZD\u00a012,500.50'
    )
    const compact = { format: 'compactCurrency', decimals: 0 } as const
    expect(read(640.5, compact)).toBe('$640.50')
    expect(read(640.5, { ...compact, currency: 'NZD' })).toBe('NZD\u00a0640.50')
  })

  it('keeps the field’s places when it falls back to dollars', () => {
    const gross: RecordField = {
      key: 'gross',
      label: 'Gross',
      type: 'money',
      currency: 'dollars',
      trailingZeroDisplay: 'stripIfInteger'
    }
    expect(formatRecordValue({ gross: 12_500 }, gross, options)).toBe('$12,500')
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
