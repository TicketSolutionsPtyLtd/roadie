import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Funnel } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectMinFontSize,
  expectTableKeepsHeight,
  renderInCard
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

  it('walks the steps in order with Down and back with Up', async () => {
    const { container } = renderInCard(<Funnel {...checkoutExample} />)
    const svg = container.querySelector<SVGElement>('svg.ts-chart')!
    const live = container.querySelector('[data-slot=chart-plot-announcement]')!
    const heard = () => live.textContent ?? ''
    const press = async (key: string, expected: string) => {
      await userEvent.keyboard(key)
      await expect.poll(heard).toBe(expected)
    }
    const steps = [
      'Viewed event, 5,180',
      'Chose tickets, 1,760, 34% of the previous step, 34% of the first',
      'Started checkout, 995, 57% of the previous step, 19% of the first',
      'Paid, 612, 62% of the previous step, 12% of the first'
    ]
    svg.focus()
    await expect.poll(heard).not.toBe('')
    for (let i = 0; i < steps.length; i++) await userEvent.keyboard('{ArrowUp}')
    await expect.poll(heard).toBe(steps[0])
    for (const step of steps.slice(1)) await press('{ArrowDown}', step)
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(heard).toBe(steps.at(-1))
    for (const step of steps.slice(0, -1).reverse())
      await press('{ArrowUp}', step)
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
