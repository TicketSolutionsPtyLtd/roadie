import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RankedBars } from '.'
import { renderChartSvg } from '../static'
import { rankedBars } from './definition'
import { attendanceExample, channelExample, suburbExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('RankedBars static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(rankedBars, channelExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/channels-${mode}.svg`)
    }
  )

  it('draws the reference legend row in the file', () => {
    expect(
      renderChartSvg(rankedBars, attendanceExample, {
        mode: 'light',
        width: 640,
        height: 220
      })
    ).toMatch(/data-slot="chart-legend"[\s\S]*Similar shows/)
  })

  it.each([
    ['channels', channelExample],
    ['suburbs', suburbExample],
    ['attendance', attendanceExample]
  ])('draws the same marks as React for %s', (_, props) => {
    expect(keysOf(renderToString(createElement(RankedBars, props)))).toEqual(
      keysOf(
        renderChartSvg(rankedBars, props, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
