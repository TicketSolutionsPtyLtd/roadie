import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BarChart } from '.'
import { renderChartSvg } from '../static'
import { barChart } from './definition'
import { onSaleExample, scanRateExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('BarChart static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(barChart, scanRateExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/scan-rate-${mode}.svg`)
    }
  )

  it.each([
    ['on-sale', onSaleExample],
    ['scan rate', scanRateExample]
  ])('draws the same marks as the React render for %s', (_, props) => {
    const staticSvg = renderChartSvg(barChart, props, {
      mode: 'light',
      width: 640,
      height: 220
    })
    const react = renderToString(createElement(BarChart, props))
    expect(keysOf(react)).toEqual(keysOf(staticSvg))
  })
})
