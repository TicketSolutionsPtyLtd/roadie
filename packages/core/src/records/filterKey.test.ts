import { describe, expect, it } from 'vitest'

import { recordFilterKey } from './filterKey'
import type { RecordFilter } from './types'

const venues = (...values: string[]): RecordFilter => ({
  field: 'venue',
  operator: 'is',
  values
})

describe('recordFilterKey', () => {
  it.each<[string, RecordFilter, RecordFilter]>([
    [
      'values in another order',
      venues('quilted-walrus-room', 'antler-kettle-hall'),
      venues('antler-kettle-hall', 'quilted-walrus-room')
    ],
    [
      'a value repeated',
      venues('quilted-walrus-room', 'quilted-walrus-room'),
      venues('quilted-walrus-room')
    ],
    [
      'keys in another order',
      { field: 'capacity', operator: 'gt', value: 100 },
      { value: 100, operator: 'gt', field: 'capacity' } as RecordFilter
    ],
    [
      'a relative range written another way',
      { field: 'starts', operator: 'within', value: 'last-month' },
      {
        field: 'starts',
        operator: 'within',
        value: { period: 'month', offset: -1 }
      }
    ],
    [
      'a stray value on an operator that takes none',
      { field: 'venue', operator: 'is-set' },
      {
        field: 'venue',
        operator: 'is-set',
        value: 'x'
      } as unknown as RecordFilter
    ]
  ])('gives one key to filters that differ only by %s', (_, a, b) => {
    expect(recordFilterKey(a)).toBe(recordFilterKey(b))
  })

  it.each<[string, RecordFilter, RecordFilter]>([
    [
      'field',
      { field: 'capacity', operator: 'gt', value: 100 },
      { field: 'gross', operator: 'gt', value: 100 }
    ],
    [
      'operator',
      { field: 'capacity', operator: 'gt', value: 100 },
      { field: 'capacity', operator: 'lt', value: 100 }
    ],
    [
      'value',
      { field: 'capacity', operator: 'gt', value: 100 },
      { field: 'capacity', operator: 'gt', value: 200 }
    ],
    [
      'values',
      venues('quilted-walrus-room'),
      venues('quilted-walrus-room', 'antler-kettle-hall')
    ],
    [
      'a range reversed',
      { field: 'capacity', operator: 'between', value: [20, 50] },
      { field: 'capacity', operator: 'between', value: [50, 20] }
    ]
  ])('tells apart filters with another %s', (_, a, b) => {
    expect(recordFilterKey(a)).not.toBe(recordFilterKey(b))
  })
})
