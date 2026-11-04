import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { LineChart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { Chart } from '../Chart'
import { sweepPointer } from '../plot/frameTestUtils'

setupFrameTests({ css: roadieCss })

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1)
const TYPES = ['General admission', 'VIP', 'Early bird', 'Concession']

const daily = TYPES.flatMap((type, series) =>
  Array.from({ length: 365 }, (_, day) => ({
    day: new Date(START + day * DAY).toISOString().slice(0, 10),
    type,
    orders: Math.round(
      (40 - series * 8) * (1 + Math.sin(day / 9) * 0.3 + day / 400)
    )
  }))
)

describe('LineChart follows the pointer at 60fps on a slowed CPU', () => {
  it('shows each day of a year of four series under a sweeping pointer', async () => {
    const root = await mount(
      <div style={{ width: 960 }}>
        <Chart label='Orders by ticket type' source='Oztix sales.'>
          <LineChart data={daily} x='day' y='orders' series='type' />
        </Chart>
      </div>
    )
    await expect
      .poll(() => root.querySelector('svg.ts-chart'), { timeout: 5000 })
      .not.toBeNull()
    await settle(10)
    await expectFrameBudget(
      'LineChart, 1,460 points, pointer sweep',
      await measureFrames(sweepPointer(root, 120))
    )
    expect(
      root.querySelector('[data-slot="chart-plot-tooltip"]')
    ).not.toBeNull()
  })
})
