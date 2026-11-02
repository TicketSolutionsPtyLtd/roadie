import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { DonutChartProps } from './types'

describe('DonutChart props', () => {
  it('match the donut plot schema both ways', () => {
    expectTypeOf<Omit<DonutChartProps, 'className'>>().toExtend<
      PlotProps<'donut'>
    >()
    expectTypeOf<PlotProps<'donut'>>().toExtend<
      Omit<DonutChartProps, 'className'>
    >()
  })
})
