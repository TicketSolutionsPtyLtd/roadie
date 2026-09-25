import { createElement } from 'react'

import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StackedBars } from '.'
import { renderChartSvg } from '../static'
import { stackedBars } from './definition'
import { presaleExample, resaleExample, ticketMixExample } from './examples'

// Focus layers exist only in the live chart; the static file drops them.
const keysOf = (markup: string) =>
  [...markup.matchAll(/data-ts-key="([^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((key) => !/^(default-focus|focus-guide-layer)/.test(key))
    .sort()

describe('StackedBars static output', () => {
  it.each(['light', 'dark'] as const)(
    'matches the %s snapshot',
    async (mode) => {
      await expect(
        renderChartSvg(stackedBars, ticketMixExample, {
          mode,
          width: 640,
          height: 220
        })
      ).toMatchFileSnapshot(`./__snapshots__/ticket-mix-${mode}.svg`)
    }
  )

  it.each([
    ['mix', ticketMixExample],
    ['presale', presaleExample],
    ['resale', resaleExample]
  ])('draws the same marks as React for %s', (_, props) => {
    expect(keysOf(renderToString(createElement(StackedBars, props)))).toEqual(
      keysOf(
        renderChartSvg(stackedBars, props, {
          mode: 'light',
          width: 640,
          height: 220
        })
      )
    )
  })
})
