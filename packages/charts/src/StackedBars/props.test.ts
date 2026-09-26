import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { StackedBarsProps } from './types'

describe('StackedBars props', () => {
  it('match the stacked bars plot schema both ways', () => {
    expectTypeOf<Omit<StackedBarsProps, 'className'>>().toExtend<
      PlotProps<'stacked-bars'>
    >()
    expectTypeOf<PlotProps<'stacked-bars'>>().toExtend<
      Omit<StackedBarsProps, 'className'>
    >()
  })
})
