import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { BarChart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectMinFontSize,
  expectNoOverlap,
  expectTableKeepsHeight,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { onSaleExample, scanRateExample } from './examples'

const TICK_LABELS = 'text[data-ts-key^="x-tick-label"]'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('BarChart in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<BarChart {...scanRateExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('reaches every bar by keyboard and says each in words', async () => {
    const { container } = renderInCard(<BarChart {...onSaleExample} />, {
      size: 'full',
      width: 1000
    })
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(onSaleExample.data.length)
    expect(heard[0]).toBe('Monday 3 August, 9am, 1,840 orders')
  })

  it('speaks the second measure with each bar', async () => {
    const { container } = renderInCard(<BarChart {...scanRateExample} />, {
      size: 'full',
      width: 1000
    })
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(scanRateExample.data.length)
    expect(heard.at(-1)).toBe(
      'Saturday 14 November, 7:45pm, 60 scans, inside 69%'
    )
  })

  it.each([320, 560])('keeps tick labels apart at %ipx', async (width) => {
    const { container } = renderInCard(<BarChart {...scanRateExample} />, {
      width
    })
    await afterResize()
    expectNoOverlap(container, TICK_LABELS)
    expectMinFontSize(container)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <BarChart {...scanRateExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('BarChart under forced colours', () => {
  it('fills bars with the series texture and leaves the line unfilled', async (context) => {
    const { container } = renderInCard(<BarChart {...scanRateExample} />, {
      width: 640
    })
    const bar = container.querySelector('path[data-ts-key^="series-1:"]')!
    const line = container.querySelector('path[data-ts-key^="line:"]')!
    expect(getComputedStyle(bar).fill).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      expect(getComputedStyle(bar).fill).toMatch(/texture-1/)
      expect(getComputedStyle(line).fill).toBe('none')
    } finally {
      await commands.forcedColors(false)
    }
  })
})
