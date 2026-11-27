import { describe, expect, it } from 'vitest'

import {
  recordFieldOptions,
  recordFilterFits,
  recordFilterOperators
} from './fields'
import { RECORD_OPERATORS, recordOperatorSpec } from './operators'
import { eventFields } from './testFields'
import type { RecordField, RecordFilter, RecordFilterOperator } from './types'
import { validateRecordView } from './validate'

const field = (key: string) => eventFields.find((f) => f.key === key)!

describe('recordFilterOperators', () => {
  it.each<[string, string[]]>([
    [
      'name',
      ['contains', 'not-contains', 'is', 'is-not', 'is-set', 'is-not-set']
    ],
    ['venue', ['is', 'is-not', 'is-set', 'is-not-set']],
    ['genres', ['is', 'is-not', 'has-all', 'is-set', 'is-not-set']],
    ['capacity', ['eq', 'neq', 'lt', 'gt', 'between', 'is-set', 'is-not-set']],
    ['gross', ['eq', 'neq', 'lt', 'gt', 'between', 'is-set', 'is-not-set']],
    [
      'starts',
      ['on', 'before', 'after', 'between', 'within', 'is-set', 'is-not-set']
    ],
    ['featured', ['is-true', 'is-false', 'is-set', 'is-not-set']]
  ])('%s takes %j', (key, operators) => {
    expect(recordFilterOperators(field(key))).toEqual(operators)
  })
})

describe('recordFilterOperators for a list of dates', () => {
  it('offers none, since filters cannot read one yet', () => {
    expect(
      recordFilterOperators({
        key: 'sessions',
        label: 'Sessions',
        type: 'date',
        multiple: true
      })
    ).toEqual([])
  })
})

describe('recordFieldOptions', () => {
  it('returns the options given', () => {
    expect(recordFieldOptions(field('city'))[1]).toEqual({
      value: 'melbourne',
      label: 'Melbourne',
      parent: 'victoria'
    })
  })

  it('reads status keys in order, labelled like the status column', () => {
    expect(recordFieldOptions(field('status'))).toEqual([
      { value: 'on_sale', label: 'On sale' },
      { value: 'selling_fast', label: 'Selling fast' },
      { value: 'sold_out', label: 'Sold out' }
    ])
  })

  it('puts unordered status keys last', () => {
    const f: RecordField = {
      key: 's',
      label: 'S',
      type: 'option',
      status: {
        held: { intent: 'neutral' },
        open: { intent: 'success', order: 1 }
      }
    }
    expect(recordFieldOptions(f).map((o) => o.value)).toEqual(['open', 'held'])
  })

  it('is empty for a field with no values listed', () => {
    expect(recordFieldOptions(field('name'))).toEqual([])
  })
})

describe('recordFilterFits', () => {
  const fields: RecordField[] = [
    ...eventFields,
    { key: 'sessions', label: 'Sessions', type: 'date', multiple: true }
  ]
  const operators = Object.keys(RECORD_OPERATORS) as RecordFilterOperator[]
  // A value of the operator's shape, so only the field and operator can fail.
  const values = {
    values: { values: ['x'] },
    text: { value: 'x' },
    number: { value: 1 },
    range: { value: [1, 2] },
    day: { value: '2026-10-03' },
    relative: { value: 'today' },
    none: {}
  }

  it.each(
    fields.flatMap((f) =>
      operators.map((op): [string, RecordFilterOperator] => [f.key, op])
    )
  )('agrees with validateRecordView on %s %s', (key, operator) => {
    const filter = {
      field: key,
      operator,
      ...values[recordOperatorSpec(operator).value]
    } as RecordFilter
    const view = {
      query: { search: '', filters: [filter], sort: [] },
      layout: { type: 'table' }
    }
    const unfit = validateRecordView(view, fields).problems.some((p) =>
      /\.(field|operator)$/.test(p.path)
    )
    expect(recordFilterFits(filter, fields)).toBe(!unfit)
  })

  it('reads a repeated key as validateRecordView does, the last one', () => {
    const repeated: RecordField[] = [
      { key: 'notes', label: 'Notes', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'text', filterable: false }
    ]
    expect(
      recordFilterFits(
        { field: 'notes', operator: 'contains', value: 'x' },
        repeated
      )
    ).toBe(false)
  })

  it('is false for a field the fields lack', () => {
    expect(
      recordFilterFits({ field: 'nope', operator: 'is-set' }, eventFields)
    ).toBe(false)
  })
})
