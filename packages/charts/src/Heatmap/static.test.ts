import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Heatmap } from '.'
import { renderChartSvg } from '../static'
import { heatmap } from './definition'
import { sectionPaceExample, whenFansBuyExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('Heatmap static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(heatmap, whenFansBuyExample, {
          mode,
          width: 640,
          height: 260
        })
      ).toMatchFileSnapshot(`./__snapshots__/when-fans-buy-${mode}.svg`)
    }
  )

  it('keys the scale ends in a legend row', () => {
    const svg = renderChartSvg(heatmap, sectionPaceExample, {
      mode: 'light',
      width: 640,
      height: 220
    })
    expect(svg).toContain('data-slot="chart-legend"')
    expect(svg).toContain('>Behind<')
    expect(svg).toContain('>Ahead<')
  })

  it.each([
    ['when fans buy', whenFansBuyExample],
    ['section pace', sectionPaceExample]
  ])('draws the same marks as React for %s', (_, props) => {
    expect(keysOf(renderToString(createElement(Heatmap, props)))).toEqual(
      keysOf(
        renderChartSvg(heatmap, props, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
