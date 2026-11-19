import { describe, expect, it } from 'vitest'

import { recordDates } from './match'
import type { RecordField } from './types'

const stamp: RecordField = { key: 'at', label: 'At', type: 'date' }
const event: RecordField = {
  key: 'at',
  label: 'Starts',
  type: 'date',
  moment: 'event',
  timeZoneKey: 'zone',
  end: 'until'
}
const stored: RecordField = { ...event, localDateKey: 'day' }

describe('recordDates', () => {
  it.each<[string, RecordField, object, [string, string] | null]>([
    ['a plain date', stamp, { at: '2026-11-20' }, ['2026-11-20', '2026-11-20']],
    [
      'a timestamp, in the viewer’s zone',
      stamp,
      { at: '2026-11-20T15:00:00Z' },
      ['2026-11-21', '2026-11-21']
    ],
    [
      'an event, in the venue’s zone',
      event,
      { at: '2026-11-20T15:00:00Z', zone: 'Australia/Perth' },
      ['2026-11-20', '2026-11-20']
    ],
    [
      'an event range',
      event,
      {
        at: '2026-11-20T10:00:00Z',
        until: '2026-11-22T10:00:00Z',
        zone: 'Australia/Perth'
      },
      ['2026-11-20', '2026-11-22']
    ],
    [
      'the stored venue date first',
      stored,
      {
        at: '2026-11-20T15:00:00Z',
        zone: 'Australia/Perth',
        day: '2026-11-19'
      },
      ['2026-11-19', '2026-11-19']
    ],
    ['no value', stamp, { at: null }, null],
    ['a value that isn’t a date', stamp, { at: 'soon' }, null]
  ])('places %s', (_, field, row, dates) => {
    expect(recordDates(row, field, 'Australia/Brisbane')).toEqual(dates)
  })
})
