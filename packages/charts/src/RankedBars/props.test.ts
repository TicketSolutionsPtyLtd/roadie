import { describe, expectTypeOf, it } from 'vitest'

import type { PlotProps } from '@oztix/roadie-core/dashboard'

import type { RankedBarsProps } from './types'

describe('RankedBars props', () => {
  it('match the ranked bars plot schema both ways', () => {
    expectTypeOf<Omit<RankedBarsProps, 'className'>>().toExtend<
      PlotProps<'ranked-bars'>
    >()
    expectTypeOf<PlotProps<'ranked-bars'>>().toExtend<
      Omit<RankedBarsProps, 'className'>
    >()
  })
})
