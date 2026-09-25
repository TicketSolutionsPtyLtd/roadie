import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { ScatterProps } from './types'

describe('Scatter props', () => {
  it('match the scatter plot schema both ways', () => {
    expectTypeOf<Omit<ScatterProps, 'className'>>().toExtend<
      PlotProps<'scatter'>
    >()
    expectTypeOf<PlotProps<'scatter'>>().toExtend<
      Omit<ScatterProps, 'className'>
    >()
  })
})
