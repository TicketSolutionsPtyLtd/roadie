import { describe, expect, it } from 'vitest'

import { renderChartSvg } from '../static'
import { donutChart } from './definition'
import { ticketTypeExample } from './examples'

describe('DonutChart static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(donutChart, ticketTypeExample, {
          mode,
          width: 640,
          height: 260
        })
      ).toMatchFileSnapshot(`./__snapshots__/ticket-types-${mode}.svg`)
    }
  )

  it('draws the legend row in the file', () => {
    expect(
      renderChartSvg(donutChart, ticketTypeExample, {
        mode: 'light',
        width: 640,
        height: 260
      })
    ).toMatch(/data-slot="chart-legend"[\s\S]*GA 1,240 \(52%\)/)
  })
})
