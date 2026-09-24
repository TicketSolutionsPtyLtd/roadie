import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { LineChartProps } from './types'

describe('LineChart props', () => {
  it('match the line plot schema both ways', () => {
    expectTypeOf<Omit<LineChartProps, 'className'>>().toExtend<
      PlotProps<'line'>
    >()
    expectTypeOf<PlotProps<'line'>>().toExtend<
      Omit<LineChartProps, 'className'>
    >()
  })
})
