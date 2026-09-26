import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { SmallMultiplesProps } from './types'

describe('SmallMultiples props', () => {
  it('match the small multiples plot schema both ways', () => {
    expectTypeOf<Omit<SmallMultiplesProps, 'className'>>().toExtend<
      PlotProps<'small-multiples'>
    >()
    expectTypeOf<PlotProps<'small-multiples'>>().toExtend<
      Omit<SmallMultiplesProps, 'className'>
    >()
  })
})
