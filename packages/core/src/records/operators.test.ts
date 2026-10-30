import { describe, expect, it } from 'vitest'

import {
  RECORD_OPERATORS,
  isRecordOperator,
  recordOperatorSpec
} from './operators'
import type { RecordFilterOperator } from './types'

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
