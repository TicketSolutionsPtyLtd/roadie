import { describe, expect, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  settle,
  setupFrameTests
} from '@oztix/roadie-frames'

import { Heatmap } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { Chart } from '../Chart'
import { afterResize } from '../plot/browserTesting'
import { sweepPointer } from '../plot/frameTestUtils'

setupFrameTests({ css: roadieCss })

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, hour) => `${hour}:00`)

const orders = WEEKDAYS.flatMap((weekday, row) =>
  HOURS.map((hour, column) => ({
    weekday,
    hour,
    orders: Math.round(
      10 + 30 * Math.sin((column / 24) * Math.PI) * (row > 3 ? 1.5 : 1)
    )
  }))
)

describe('Heatmap follows the pointer at 60fps on a slowed CPU', () => {
  it('shows each cell of a week by the hour under a sweeping pointer', async () => {
    const root = await mount(
      <div style={{ width: 960 }}>
        <Chart label='When fans buy' source='Oztix sales.'>
          <Heatmap data={orders} rows='weekday' columns='hour' value='orders' />
        </Chart>
      </div>
    )
    await afterResize()
    await settle(10)
    await expectFrameBudget(
      'Heatmap, 168 cells, pointer sweep',
      await measureFrames(sweepPointer(root, 120))
    )
    expect(
      root.querySelector('[data-slot="chart-plot-tooltip"]')
    ).not.toBeNull()
  })
})
