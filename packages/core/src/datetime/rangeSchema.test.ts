import { describe, expectTypeOf, it } from 'vitest'
import type { z } from 'zod'

import { dateRangeSchemas } from './rangeSchema'
import type { Comparison, DateRangeValue } from './ranges'

type Schemas = ReturnType<typeof dateRangeSchemas>

describe('dateRangeSchemas', () => {
  it('match the datetime types both ways', () => {
    expectTypeOf<
      z.infer<Schemas['dateRangeValue']>
    >().toEqualTypeOf<DateRangeValue>()
    expectTypeOf<z.infer<Schemas['comparison']>>().toEqualTypeOf<Comparison>()
  })
})
