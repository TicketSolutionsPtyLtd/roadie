import { describe, expect, it } from 'vitest'

import type { RecordFilter } from '@oztix/roadie-core/records'

import { describeFilter } from './clock'
import { showFields } from './testUtils'

const BRISBANE = 'Australia/Brisbane'
const NO_CLOCK = { now: new Date(0), timeZone: BRISBANE }
// 9 Oct 2026.
const CLOCK = { now: new Date('2026-10-09T00:00:00Z'), timeZone: BRISBANE }

const within = (value: unknown) =>
  ({ field: 'starts', operator: 'within', value }) as RecordFilter

describe('describeFilter', () => {
  it('names a relative range without its dates until the clock is known', () => {
    expect(describeFilter(within('this-month'), showFields, NO_CLOCK)).toEqual({
      label: 'Starts: This month',
      value: 'This month'
    })
    expect(
      describeFilter(within('this-month'), showFields, CLOCK)
    ).toMatchObject({ label: 'Starts: This month', detail: '1 to 31 Oct 2026' })
  })

  it('reads a range with no name as its field until the clock is known', () => {
    const twoMonthsAgo = within({ period: 'month', offset: -2 })
    expect(describeFilter(twoMonthsAgo, showFields, NO_CLOCK)).toEqual({
      label: 'Starts',
      value: ''
    })
    expect(describeFilter(twoMonthsAgo, showFields, CLOCK).label).toBe(
      'Starts: 1 to 31 Aug 2026'
    )
  })

  it('keeps absolute dates, which need no clock', () => {
    const august = within({ start: '2026-08-01', end: '2026-08-31' })
    expect(describeFilter(august, showFields, NO_CLOCK).label).toBe(
      'Starts: 1 to 31 Aug 2026'
    )
  })
})
