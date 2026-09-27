import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { HistogramProps } from './types'

describe('Histogram props', () => {
  it('match the histogram plot schema both ways', () => {
    expectTypeOf<Omit<HistogramProps, 'className'>>().toExtend<
      PlotProps<'histogram'>
    >()
    expectTypeOf<PlotProps<'histogram'>>().toExtend<
      Omit<HistogramProps, 'className'>
    >()
  })
})
