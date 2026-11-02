import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DonutChart } from '.'
import { renderChartSvg } from '../static'
import { donutChart } from './definition'
import { ticketTypeExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

const rolled = {
  data: [60, 50, 40, 30, 20, 10].map((sold, i) => ({
    type: `Type ${i + 1}`,
    sold
  })),
  x: 'type',
  y: 'sold'
}

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

  it.each([
    ['ticket types', ticketTypeExample],
    ['six parts', rolled]
  ])('draws the same marks as React for %s', (_, props) => {
    expect(keysOf(renderToString(createElement(DonutChart, props)))).toEqual(
      keysOf(
        renderChartSvg(donutChart, props, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
