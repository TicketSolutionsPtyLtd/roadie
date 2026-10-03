import { z } from 'zod'

import type { Comparison, DateRangeValue, RelativeRange } from './ranges'

const NAMED_RANGES = [
  'today',
  'tomorrow',
  'yesterday',
  'this-week',
  'this-weekend',
  'next-week',
  'last-week',
  'this-month',
  'next-month',
  'last-month',
  'upcoming',
  'past',
  'ongoing'
] as const satisfies readonly Extract<RelativeRange, string>[]

/**
 * Zod schemas for date ranges, built on call so records can build its schema
 * lazily. Shapes only: whether absolute ends are real dates is checked by
 * resolving them.
 */
export function dateRangeSchemas() {
  const rolling = z.strictObject({
    direction: z.enum(['next', 'past']),
    amount: z.number().int().min(1).max(9999),
    unit: z.enum(['hour', 'day', 'week', 'month'])
  })

  const period = z.strictObject({
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
    offset: z.number().int().min(-9999).max(9999),
    toDate: z.boolean().optional(),
    fiscal: z.boolean().optional()
  })

  const relativeRange = z.union([z.enum(NAMED_RANGES), rolling, period])
  const absoluteRange = z.strictObject({
    start: z.string().min(1),
    end: z.string().min(1)
  })

  return {
    relativeRange,
    dateRangeValue: z.union([absoluteRange, relativeRange]),
    comparison: z.union([
      z.enum(['previous-period', 'previous-year']),
      absoluteRange
    ])
  }
}

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Holds<T extends true> = T
type Schemas = ReturnType<typeof dateRangeSchemas>

// Fails to compile when the schemas drift from the datetime types.
export type SchemasMatchTypes = Holds<
  [
    Same<z.infer<Schemas['dateRangeValue']>, DateRangeValue>,
    Same<z.infer<Schemas['comparison']>, Comparison>
  ] extends [true, true]
    ? true
    : false
>
