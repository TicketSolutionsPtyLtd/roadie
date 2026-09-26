import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { HeatmapProps } from './types'

describe('Heatmap props', () => {
  it('match the heatmap plot schema both ways', () => {
    expectTypeOf<Omit<HeatmapProps, 'className'>>().toExtend<
      PlotProps<'heatmap'>
    >()
    expectTypeOf<PlotProps<'heatmap'>>().toExtend<
      Omit<HeatmapProps, 'className'>
    >()
  })
})
