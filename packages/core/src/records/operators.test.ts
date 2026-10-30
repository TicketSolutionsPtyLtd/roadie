import { describe, expect, it } from 'vitest'

import { encodeFilter } from './encoding'
import {
  RECORD_OPERATORS,
  isRecordOperator,
  recordOperatorSpec
} from './operators'
import type { RecordFilter, RecordFilterOperator } from './types'

const operators = Object.keys(RECORD_OPERATORS) as RecordFilterOperator[]

describe('RECORD_OPERATORS', () => {
  it.each(operators)('reads %s back from its opposite', (operator) => {
    const { opposite } = recordOperatorSpec(operator)
    if (!opposite) return
    expect(recordOperatorSpec(opposite).opposite).toBe(operator)
    expect(recordOperatorSpec(opposite).value).toBe(
      recordOperatorSpec(operator).value
    )
  })

  it('knows its own operators and nothing else', () => {
    expect(operators.every(isRecordOperator)).toBe(true)
    expect(isRecordOperator('toString')).toBe(false)
    expect(isRecordOperator('near')).toBe(false)
  })
})

describe('encodeFilter with stray values', () => {
  it.each([
    [{ field: 'a', operator: 'eq', value: null }, 'a:eq'],
    [{ field: 'a', operator: 'is-true', value: null }, 'a:is-true'],
    [{ field: 'a', operator: 'is-set', value: undefined }, 'a:is-set'],
    [{ field: 'a', operator: 'near', value: 'x' }, 'a:near']
  ])('writes %j as %s', (filter, encoded) => {
    expect(encodeFilter(filter as unknown as RecordFilter)).toBe(encoded)
  })
})
