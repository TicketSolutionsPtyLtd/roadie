import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { FunnelProps } from './types'

describe('Funnel props', () => {
  it('match the funnel plot schema both ways', () => {
    expectTypeOf<Omit<FunnelProps, 'className'>>().toExtend<
      PlotProps<'funnel'>
    >()
    expectTypeOf<PlotProps<'funnel'>>().toExtend<
      Omit<FunnelProps, 'className'>
    >()
  })
})
