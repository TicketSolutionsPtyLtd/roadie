import type { RecordFilterOperator } from './types'

/** What a filter compares with, and so how it's written and read back. */
export type RecordOperatorValue =
  | 'values'
  | 'text'
  | 'number'
  | 'range'
  | 'day'
  | 'relative'
  | 'none'

type RecordOperatorSpec = {
  value: RecordOperatorValue
  /** The operator in words, as a chip or an editor reads it. */
  label: string
  /** The operator that keeps the records this one drops, read for "not". */
  opposite?: RecordFilterOperator
}

/**
 * Every filter operator, in one place. A new operator fails to compile here
 * first, then in each exhaustive switch that matches, describes or translates it.
 */
export const RECORD_OPERATORS = {
  is: { value: 'values', label: 'is', opposite: 'is-not' },
  'is-not': { value: 'values', label: 'is not', opposite: 'is' },
  'has-all': { value: 'values', label: 'has all of' },
  contains: { value: 'text', label: 'contains', opposite: 'not-contains' },
  'not-contains': {
    value: 'text',
    label: 'doesn’t contain',
    opposite: 'contains'
  },
  eq: { value: 'number', label: 'is', opposite: 'neq' },
  neq: { value: 'number', label: 'is not', opposite: 'eq' },
  lt: { value: 'number', label: 'is less than' },
  gt: { value: 'number', label: 'is more than' },
  between: { value: 'range', label: 'is between' },
  on: { value: 'day', label: 'is on' },
  before: { value: 'day', label: 'is before' },
  after: { value: 'day', label: 'is after' },
  within: { value: 'relative', label: 'is within' },
  'is-true': { value: 'none', label: 'is Yes', opposite: 'is-false' },
  'is-false': { value: 'none', label: 'is No', opposite: 'is-true' },
  'is-set': { value: 'none', label: 'is not empty', opposite: 'is-not-set' },
  'is-not-set': { value: 'none', label: 'is empty', opposite: 'is-set' }
} as const satisfies Record<RecordFilterOperator, RecordOperatorSpec>

export function isRecordOperator(
  operator: string
): operator is RecordFilterOperator {
  return Object.hasOwn(RECORD_OPERATORS, operator)
}

export function recordOperatorSpec(
  operator: RecordFilterOperator
): RecordOperatorSpec {
  return RECORD_OPERATORS[operator]
}
