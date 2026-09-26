import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Histogram } from '.'
import { renderChartSvg } from '../static'
import { histogram } from './definition'
import { leadTimeExample, orderSizeExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('Histogram static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(histogram, leadTimeExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/lead-time-${mode}.svg`)
    }
  )

  it.each([
    ['lead time', leadTimeExample],
    ['order size', orderSizeExample]
  ])('draws the same marks as React for %s', (_, props) => {
    expect(keysOf(renderToString(createElement(Histogram, props)))).toEqual(
      keysOf(
        renderChartSvg(histogram, props, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
