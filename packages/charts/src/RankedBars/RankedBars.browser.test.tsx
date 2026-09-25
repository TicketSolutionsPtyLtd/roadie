import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { RankedBars } from '.'
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
import { attendanceExample, channelExample, suburbExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('RankedBars in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<RankedBars {...channelExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('reaches every bar by keyboard and says each in words', async () => {
    const { container } = renderInCard(<RankedBars {...channelExample} />)
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(8)
    expect(heard).toContain('Email, 612 orders')
    expect(heard).toContain('Other, 63 orders')
  })

  it.each([320, 560])(
    'keeps value labels apart and inside the card at %ipx',
    async (width) => {
      const { container } = renderInCard(<RankedBars {...suburbExample} />, {
        width
      })
      await afterResize()
      const labels = '[data-ts-key^="label-values:"]'
      expectNoOverlap(container, labels)
      const card = container
        .querySelector('[data-slot=data-card]')!
        .getBoundingClientRect()
      for (const label of container.querySelectorAll(labels))
        expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(
          card.right
        )
      expectMinFontSize(container)
    }
  )

  it('keeps each value label clear of its reference tick', () => {
    const { container } = renderInCard(<RankedBars {...attendanceExample} />)
    const ticks = [
      ...container.querySelectorAll('[data-ts-key^="reference:"]')
    ].map((tick) => tick.getBoundingClientRect())
    const labels = [
      ...container.querySelectorAll('[data-ts-key^="label-values:"]')
    ].map((label) => label.getBoundingClientRect())
    expect(ticks).toHaveLength(3)
    ticks.forEach((tick, i) =>
      expect(labels[i]!.left).toBeGreaterThanOrEqual(tick.right)
    )
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <RankedBars {...channelExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('RankedBars under forced colours', () => {
  it('fills the bars with the first texture', async (context) => {
    const { container } = renderInCard(<RankedBars {...channelExample} />)
    const bar = container.querySelector('rect[data-ts-key^="series-1:"]')!
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
