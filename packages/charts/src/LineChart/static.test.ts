import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { LineChart } from '.'
import { renderChartSvg } from '../static'
import { lineChart } from './definition'
import { paceExample, salesByTypeExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('LineChart static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(lineChart, paceExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/pace-${mode}.svg`)
    }
  )

  it.each([
    ['pace', paceExample],
    ['by type', salesByTypeExample]
  ])('draws the same marks as the React render for %s', (_, props) => {
    const staticSvg = renderChartSvg(lineChart, props, {
      mode: 'light',
      width: 640,
      height: 220
    })
    const react = renderToString(createElement(LineChart, props))
    expect(keysOf(react)).toEqual(keysOf(staticSvg))
  })
})
