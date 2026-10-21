import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StackedArea } from '.'
import { renderChartSvg } from '../static'
import { stackedArea } from './definition'
import { scansByGateExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('StackedArea static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(stackedArea, scansByGateExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/scans-by-gate-${mode}.svg`)
    }
  )

  it('draws the same marks as React', () => {
    expect(
      keysOf(renderToString(createElement(StackedArea, scansByGateExample)))
    ).toEqual(
      keysOf(
        renderChartSvg(stackedArea, scansByGateExample, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
