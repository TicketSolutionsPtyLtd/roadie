import { describe, expect, it } from 'vitest'

import {
  type RecordField,
  type RecordFilter,
  recordFields
} from '@oztix/roadie-core/records'

import { draftOf, editorOperators, filterOf, isEmptyDraft } from './filterDraft'

type Gig = { name: string; city: string; starts: string; sold: number }
const field = recordFields<Gig>()
const name = field.text('name', { label: 'Event' })
const city = field.option('city', {
  label: 'City',
  options: [{ value: 'perth', label: 'Perth' }]
})
const starts = field.date('starts', { label: 'Starts', moment: 'event' })
const sold = field.number('sold', { label: 'Sold' })

describe('filter drafts', () => {
  it('offers one range choice for dates', () => {
    expect(editorOperators(starts)).toEqual([
      'range',
      'on',
      'before',
      'after',
      'is-set',
      'is-not-set'
    ])
  })

  it.each<[RecordField, RecordFilter]>([
    [city, { field: 'city', operator: 'is-not', values: ['perth'] }],
    [name, { field: 'name', operator: 'contains', value: 'disco' }],
    [name, { field: 'name', operator: 'is', values: ['OZ-1'] }],
    [sold, { field: 'sold', operator: 'gt', value: 100 }],
    [sold, { field: 'sold', operator: 'between', value: [1, 5] }],
    [starts, { field: 'starts', operator: 'after', value: '2026-12-01' }],
    [
      starts,
      {
        field: 'starts',
        operator: 'between',
        value: ['2026-10-01', '2026-10-09']
      }
    ],
    [starts, { field: 'starts', operator: 'within', value: 'this-weekend' }],
    [starts, { field: 'starts', operator: 'is-not-set' }]
  ])('round-trips %#', (owner, filter) => {
    expect(filterOf(owner, draftOf(owner, filter))).toEqual(filter)
  })

  it('keeps values across operators and waits for a complete one', () => {
    const draft = draftOf(sold, { field: 'sold', operator: 'gt', value: 5 })
    expect(filterOf(sold, { ...draft, operator: 'lt' })).toEqual({
      field: 'sold',
      operator: 'lt',
      value: 5
    })
    expect(filterOf(sold, { ...draft, operator: 'between' })).toBeNull()
    expect(
      filterOf(sold, { ...draft, operator: 'between', low: 9, high: 3 })
    ).toEqual({ field: 'sold', operator: 'between', value: [3, 9] })
    expect(filterOf(name, { ...draftOf(name, null), text: '  ' })).toBeNull()
    expect(filterOf(city, draftOf(city, null))).toBeNull()
  })

  it('knows a draft emptied of its value from one half made', () => {
    expect(
      isEmptyDraft(city, {
        ...draftOf(city, { field: 'city', operator: 'is', values: ['perth'] }),
        values: []
      })
    ).toBe(true)
    expect(isEmptyDraft(name, { ...draftOf(name, null), text: ' ' })).toBe(true)
    expect(
      isEmptyDraft(sold, {
        ...draftOf(sold, null),
        operator: 'between',
        low: 1
      })
    ).toBe(false)
    expect(
      isEmptyDraft(starts, { ...draftOf(starts, null), operator: 'is-set' })
    ).toBe(false)
  })

  it('starts a new filter with the field’s first operator', () => {
    expect(draftOf(starts, null).operator).toBe('range')
    expect(draftOf(name, null).operator).toBe('contains')
  })
})
