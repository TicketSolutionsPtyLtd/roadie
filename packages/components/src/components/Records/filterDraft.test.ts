import { describe, expect, it } from 'vitest'

import type { RecordFilter } from '@oztix/roadie-core/records'

import {
  type DateOperator,
  dateOperatorOf,
  draftOf,
  filterOf,
  isEmptyDraft,
  withCondition
} from './filterDraft'

describe('date drafts', () => {
  it.each<RecordFilter>([
    { field: 'starts', operator: 'after', value: '2026-12-01' },
    {
      field: 'starts',
      operator: 'between',
      value: ['2026-10-01', '2026-10-09']
    },
    { field: 'starts', operator: 'within', value: 'this-weekend' }
  ])('round-trips %#', (filter) => {
    expect(filterOf('starts', draftOf(filter))).toEqual(filter)
  })

  it('reads a range and a relative range as one condition', () => {
    expect(
      dateOperatorOf({ field: 'starts', operator: 'within', value: 'today' })
    ).toBe('range')
    expect(dateOperatorOf({ field: 'starts', operator: 'is-set' })).toBeNull()
  })

  it('starts a new filter, or one it doesn’t hold, on a range', () => {
    expect(draftOf(null).operator).toBe('range')
    expect(draftOf({ field: 'starts', operator: 'is-not-set' })).toEqual({
      operator: 'range',
      date: null,
      range: null
    })
  })

  it('keeps a date across conditions and waits for one', () => {
    const draft = draftOf({
      field: 'starts',
      operator: 'on',
      value: '2026-12-01'
    })
    expect(filterOf('starts', { ...draft, operator: 'before' })).toEqual({
      field: 'starts',
      operator: 'before',
      value: '2026-12-01'
    })
    expect(filterOf('starts', { ...draft, operator: 'range' })).toBeNull()
    expect(isEmptyDraft({ ...draft, operator: 'range' })).toBe(true)
    expect(isEmptyDraft(draft)).toBe(false)
    expect(isEmptyDraft({ ...draft, date: null })).toBe(true)
  })
})

describe('switching a date draft’s condition', () => {
  const TODAY = '2026-10-16'
  const within = draftOf({
    field: 'starts',
    operator: 'between',
    value: ['2026-10-20', '2026-10-23']
  })

  it.each<[DateOperator, string]>([
    ['on', '2026-10-20'],
    ['before', '2026-10-20'],
    ['after', '2026-10-23']
  ])(
    'carries a range to is %s as the day it starts or ends',
    (operator, value) => {
      expect(
        filterOf('starts', withCondition(within, operator, TODAY))
      ).toEqual({
        field: 'starts',
        operator,
        value
      })
    }
  )

  it('carries a relative range as the days it stands for today', () => {
    const weekend = draftOf({
      field: 'starts',
      operator: 'within',
      value: 'this-weekend'
    })
    expect(withCondition(weekend, 'after', TODAY).date).toBe('2026-10-18')
    expect(withCondition(weekend, 'on', undefined).date).toBeNull()
  })

  it('carries one date to a range as that day', () => {
    const before = draftOf({
      field: 'starts',
      operator: 'before',
      value: '2026-12-01'
    })
    expect(filterOf('starts', withCondition(before, 'range', TODAY))).toEqual({
      field: 'starts',
      operator: 'between',
      value: ['2026-12-01', '2026-12-01']
    })
  })

  it('keeps a date the draft already holds for the condition', () => {
    const held = { ...within, date: '2026-11-05' }
    expect(withCondition(held, 'on', TODAY).date).toBe('2026-11-05')
  })
})
