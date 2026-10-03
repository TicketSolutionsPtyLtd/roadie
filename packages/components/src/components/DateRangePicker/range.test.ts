import { describe, expect, it } from 'vitest'

import type { DateRangeValue } from '@oztix/roadie-core/datetime'

import {
  type RangeContext,
  dateRangePresets,
  describeRange,
  draftFrom,
  draftValue,
  groupPresets,
  presetLabel,
  sameRange
} from './range'

// Wed 7 Oct 2026, read as a plain date.
const CONTEXT: RangeContext = {
  options: { now: new Date('2026-10-07T12:00:00Z'), timeZone: 'UTC' },
  zone: 'Australia/Sydney'
}

describe('sameRange', () => {
  it.each<[DateRangeValue | null, DateRangeValue | null, boolean]>([
    [null, null, true],
    ['today', 'today', true],
    ['today', null, false],
    ['today', 'yesterday', false],
    [
      { start: '2026-10-01', end: '2026-10-07' },
      { end: '2026-10-07', start: '2026-10-01' },
      true
    ],
    [
      { start: '2026-10-01', end: '2026-10-07' },
      { start: '2026-10-01', end: '2026-10-08' },
      false
    ],
    [
      { direction: 'past', amount: 30, unit: 'day' },
      { unit: 'day', amount: 30, direction: 'past' },
      true
    ],
    [
      { period: 'month', offset: 0, toDate: true },
      { period: 'month', offset: 0, toDate: true, fiscal: false },
      true
    ],
    [
      { period: 'month', offset: 0 },
      { period: 'month', offset: 0, toDate: true },
      false
    ],
    [
      { period: 'year', offset: 0, fiscal: true },
      { period: 'year', offset: 0 },
      false
    ]
  ])('%j and %j are the same: %s', (a, b, same) => {
    expect(sameRange(a, b)).toBe(same)
  })
})

describe('draftFrom', () => {
  it('reads absolute dates as they are', () => {
    expect(
      draftFrom({ start: '2026-10-01', end: '2026-10-07' }, CONTEXT)
    ).toEqual({
      chosen: { start: '2026-10-01', end: '2026-10-07' },
      start: { date: '2026-10-01', time: null },
      end: { date: '2026-10-07', time: null }
    })
  })

  it('reads date-times on the wall clock of the zone', () => {
    expect(
      draftFrom({ start: '2026-11-27T08:30:00Z', end: '2026-11-28' }, CONTEXT)
    ).toMatchObject({
      start: { date: '2026-11-27', time: '19:30' },
      end: { date: '2026-11-28', time: null }
    })
  })

  it('resolves a relative range to the dates it covers', () => {
    expect(
      draftFrom({ direction: 'past', amount: 7, unit: 'day' }, CONTEXT)
    ).toEqual({
      chosen: { direction: 'past', amount: 7, unit: 'day' },
      start: { date: '2026-10-01', time: null },
      end: { date: '2026-10-07', time: null }
    })
  })

  it('leaves the dates empty for a range with no calendar dates', () => {
    expect(draftFrom('upcoming', CONTEXT)).toEqual({
      chosen: 'upcoming',
      start: { date: null, time: null },
      end: { date: null, time: null }
    })
  })

  it('leaves the dates empty until today is known', () => {
    expect(draftFrom('today', { ...CONTEXT, options: null })).toMatchObject({
      chosen: 'today',
      start: { date: null, time: null }
    })
  })

  it('starts empty with no value', () => {
    expect(draftFrom(null, CONTEXT)).toEqual({
      chosen: null,
      start: { date: null, time: null },
      end: { date: null, time: null }
    })
  })
})

describe('draftValue', () => {
  const ends = (
    start: string | null,
    end: string | null,
    times: [string | null, string | null] = [null, null]
  ) => ({
    chosen: null,
    start: { date: start, time: times[0] },
    end: { date: end, time: times[1] }
  })

  it('is the chosen value while nothing has been edited', () => {
    expect(
      draftValue(
        { ...ends('2026-10-01', '2026-10-07'), chosen: 'this-week' },
        'day',
        'UTC'
      )
    ).toEqual({ kind: 'value', value: 'this-week' })
  })

  it.each([
    [ends(null, null), { kind: 'value', value: null }],
    [ends('2026-10-01', null), { kind: 'incomplete' }],
    [ends(null, '2026-10-01'), { kind: 'incomplete' }],
    [ends('2026-10-08', '2026-10-01'), { kind: 'reversed' }],
    [
      ends('2026-10-01', '2026-10-01'),
      { kind: 'value', value: { start: '2026-10-01', end: '2026-10-01' } }
    ]
  ])('day ends %j read as %j', (draft, result) => {
    expect(draftValue(draft, 'day', 'Australia/Sydney')).toEqual(result)
  })

  it('drops times at day granularity', () => {
    expect(
      draftValue(
        ends('2026-10-01', '2026-10-02', ['19:30', '23:00']),
        'day',
        'UTC'
      )
    ).toEqual({
      kind: 'value',
      value: { start: '2026-10-01', end: '2026-10-02' }
    })
  })

  it('joins a time to its date in the zone at minute granularity', () => {
    expect(
      draftValue(
        ends('2026-11-27', '2026-11-29', ['19:30', null]),
        'minute',
        'Australia/Sydney'
      )
    ).toEqual({
      kind: 'value',
      value: { start: '2026-11-27T19:30:00+11:00', end: '2026-11-29' }
    })
  })

  it('finds a range reversed by its times', () => {
    expect(
      draftValue(
        ends('2026-11-27', '2026-11-27', ['19:30', '18:00']),
        'minute',
        'Australia/Sydney'
      )
    ).toEqual({ kind: 'reversed' })
  })
})

describe('presets', () => {
  it('labels a preset from its value unless it has a label', () => {
    expect(
      presetLabel({ value: { direction: 'past', amount: 30, unit: 'day' } })
    ).toBe('Last 30 days')
    expect(
      presetLabel({
        value: { period: 'year', offset: 0, toDate: true, fiscal: true }
      })
    ).toBe('Financial year to date')
    expect(
      presetLabel({
        label: 'On-sale week',
        value: { start: '2026-11-02', end: '2026-11-08' }
      })
    ).toBe('On-sale week')
    expect(
      presetLabel({ value: { start: '2026-11-02', end: '2026-11-08' } })
    ).toBe('2 to 8 Nov 2026')
  })

  it('groups presets in the order their groups first appear', () => {
    expect(
      groupPresets([
        { value: 'today' },
        { value: 'last-week', group: 'Last' },
        { value: 'this-week', group: 'This' },
        { value: 'last-month', group: 'Last' },
        { value: 'yesterday' }
      ]).map(({ group, presets }) => [group, presets.map((p) => p.value)])
    ).toEqual([
      [undefined, ['today', 'yesterday']],
      ['Last', ['last-week', 'last-month']],
      ['This', ['this-week']]
    ])
  })

  it('ships the spec’s default presets with their labels', () => {
    expect(
      groupPresets(dateRangePresets).map(({ group, presets }) => [
        group,
        presets.map((preset) => presetLabel(preset))
      ])
    ).toEqual([
      [undefined, ['Today', 'Yesterday']],
      [
        'Recent',
        [
          'Last 7 days',
          'Last 30 days',
          'Last 90 days',
          'Last week',
          'Last month',
          'Last quarter'
        ]
      ],
      [
        'To date',
        [
          'Week to date',
          'Month to date',
          'Quarter to date',
          'Financial year to date'
        ]
      ]
    ])
  })
})

describe('describeRange', () => {
  it('names a relative range and the dates it stands for', () => {
    expect(
      describeRange(
        { direction: 'past', amount: 7, unit: 'day' },
        CONTEXT,
        'en-AU'
      )
    ).toEqual({ label: 'Last 7 days', detail: '1 to 7 Oct 2026' })
  })

  it('names a moment without dates read against noon', () => {
    expect(describeRange('upcoming', CONTEXT, 'en-AU')).toEqual({
      label: 'Upcoming',
      detail: null
    })
  })

  it('names absolute dates once', () => {
    expect(
      describeRange(
        { start: '2026-10-01', end: '2026-10-07' },
        CONTEXT,
        'en-AU'
      )
    ).toEqual({ label: '1 to 7 Oct 2026', detail: null })
  })

  it('names a relative range without dates until today is known', () => {
    expect(
      describeRange('this-week', { ...CONTEXT, options: null }, 'en-AU')
    ).toEqual({ label: 'This week', detail: null })
  })

  it('names nothing for a value it cannot read', () => {
    expect(
      describeRange(
        { start: '2026-10-08', end: '2026-10-01' },
        CONTEXT,
        'en-AU'
      )
    ).toBeNull()
  })
})
