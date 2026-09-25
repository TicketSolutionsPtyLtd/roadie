import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Histogram } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  type CardSizeName,
  expectFillsPlot,
  expectMinFontSize,
  expectNoOverlap,
  expectTableKeepsHeight,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { binValues, histogramValues } from './bin'
import { leadTimeExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const sizes = Object.entries(CARD_HEIGHTS) as [CardSizeName, number][]
const bins = binValues(histogramValues(leadTimeExample), leadTimeExample)

describe('Histogram in a card', () => {
  it.each(sizes)('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<Histogram {...leadTimeExample} />, {
      size
    })
    expectFillsPlot(container, height)
  })

  it('reaches every bin by keyboard', async () => {
    const { container } = renderInCard(<Histogram {...leadTimeExample} />, {
      width: 1000
    })
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(bins.length)
    expect(heard[0]).toBe(`0 to 7 days, ${bins[0]!.count} of 600`)
  })

  it('keeps text at 11px or more on a phone', async () => {
    const { container } = renderInCard(<Histogram {...leadTimeExample} />, {
      size: 'sm',
      width: 320
    })
    await expect
      .poll(() => container.querySelectorAll('svg.ts-chart text').length)
      .toBeGreaterThan(0)
    expectMinFontSize(container)
  })

  it('keeps the median label clear of the tick labels', () => {
    const { container } = renderInCard(<Histogram {...leadTimeExample} />)
    expectNoOverlap(
      container,
      "text[data-ts-key^='label-median'], text[data-ts-key^='y-tick-label']"
    )
    expectNoOverlap(
      container,
      "text[data-ts-key^='label-median'], text[data-ts-key^='x-tick-label']"
    )
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <Histogram {...leadTimeExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('Histogram under forced colours', () => {
  it('fills the bins with a texture', async (context) => {
    const { container } = renderInCard(<Histogram {...leadTimeExample} />)
    const bar = container.querySelector(
      "[data-ts-key^='series-1:'] rect, rect[data-ts-key^='series-1:']"
    )!
    expect(getComputedStyle(bar).fill).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      expect(getComputedStyle(bar).fill).toMatch(/texture-1/)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
