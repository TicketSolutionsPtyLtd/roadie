import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { StackedAreaProps } from './types'

describe('StackedArea props', () => {
  it('match the stacked-area plot schema both ways', () => {
    expectTypeOf<
      Omit<StackedAreaProps, 'className' | 'onRangeSelect'>
    >().toExtend<PlotProps<'stacked-area'>>()
    expectTypeOf<PlotProps<'stacked-area'>>().toExtend<
      Omit<StackedAreaProps, 'className' | 'onRangeSelect'>
    >()
  })
})
