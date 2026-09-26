import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { BarChartProps } from './types'

describe('BarChart props', () => {
  it('match the bar plot schema both ways', () => {
    expectTypeOf<Omit<BarChartProps, 'className'>>().toExtend<
      PlotProps<'bar'>
    >()
    expectTypeOf<PlotProps<'bar'>>().toExtend<
      Omit<BarChartProps, 'className'>
    >()
  })
})
