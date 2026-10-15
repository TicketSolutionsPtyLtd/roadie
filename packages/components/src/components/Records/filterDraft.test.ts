import { describe, expect, it } from 'vitest'

import type { RecordFilter } from '@oztix/roadie-core/records'

import { dateOperatorOf, draftOf, filterOf, isEmptyDraft } from './filterDraft'

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
