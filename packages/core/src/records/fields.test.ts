import { describe, expect, it } from 'vitest'

import { recordFieldOptions, recordFilterOperators } from './fields'
import { eventFields } from './testFields'
import type { RecordField } from './types'

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

describe('recordFieldOptions', () => {
  it('returns the options given', () => {
    expect(recordFieldOptions(field('city'))[0]).toEqual({
      value: 'melbourne',
      label: 'Melbourne'
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
