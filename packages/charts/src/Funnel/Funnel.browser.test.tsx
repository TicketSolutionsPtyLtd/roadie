import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Funnel } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectMinFontSize,
  expectTableKeepsHeight,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { checkoutExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('Funnel in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<Funnel {...checkoutExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('reaches every step by keyboard and says each in words', async () => {
    const { container } = renderInCard(<Funnel {...checkoutExample} />)
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(4)
    // ArrowRight walks bar ends by pixel x, so the order is the shared layer's.
    expect([...heard].sort()).toEqual(
      [
        'Viewed event, 12,400',
        'Chose tickets, 4,210, 34% of the previous step, 34% of the first',
        'Started checkout, 2,380, 57% of the previous step, 19% of the first',
        'Paid, 1,464, 62% of the previous step, 12% of the first'
      ].sort()
    )
  })

  it('keeps labels inside the card and at 11px or more on a phone', async () => {
    const { container } = renderInCard(<Funnel {...checkoutExample} />, {
      size: 'md',
      width: 320
    })
    await expect
      .poll(
        () =>
          container.querySelector('[data-ts-key^="label-values"]')?.textContent
      )
      .not.toContain('of previous')
    await afterResize()
    const card = container
      .querySelector('[data-slot=data-card]')!
      .getBoundingClientRect()
    const labels = container.querySelectorAll(
      '[data-ts-key^="label-values"] text, svg.ts-chart .ts-chart__axis text'
    )
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      const box = label.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(card.left)
      expect(box.right).toBeLessThanOrEqual(card.right)
    }
    expectMinFontSize(container)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <Funnel {...checkoutExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('Funnel under forced colours', () => {
  it('fills the step bars with a texture', async (context) => {
    const { container } = renderInCard(<Funnel {...checkoutExample} />)
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
