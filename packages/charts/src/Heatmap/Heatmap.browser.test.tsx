import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Heatmap } from '.'
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
import { whenFansBuyExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function focusPlot(container: HTMLElement) {
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  container.querySelector<SVGElement>('svg.ts-chart')!.focus()
  await expect.poll(() => live.textContent).not.toBe('')
  return () => live.textContent ?? ''
}

async function press(key: string, heard: () => string) {
  const before = heard()
  await userEvent.keyboard(`{${key}}`)
  await expect.poll(heard).not.toBe(before)
  return heard()
}

describe('Heatmap in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<Heatmap {...whenFansBuyExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('reaches every cell by keyboard, along rows and down columns', async () => {
    const { container } = renderInCard(<Heatmap {...whenFansBuyExample} />, {
      size: 'lg'
    })
    const heard = await focusPlot(container)
    const stops = [heard()]
    for (let row = 0; row < 7; row++) {
      const along = row % 2 === 0 ? 'ArrowRight' : 'ArrowLeft'
      for (let column = 1; column < 5; column++)
        stops.push(await press(along, heard))
      if (row < 6) stops.push(await press('ArrowDown', heard))
    }
    expect(new Set(stops).size).toBe(35)
    expect(stops[0]).toBe('Mon, 9am, 4 orders')
    expect(stops).toContain('Fri, 6pm, 42 orders')
  })

  it('moves to the row below in the same column', async () => {
    const { container } = renderInCard(<Heatmap {...whenFansBuyExample} />, {
      size: 'lg'
    })
    const heard = await focusPlot(container)
    expect(await press('ArrowRight', heard)).toBe('Mon, 12pm, 8 orders')
    expect(await press('ArrowDown', heard)).toBe('Tue, 12pm, 9 orders')
  })

  it('shows the focused cell value in the tooltip', async () => {
    const { container } = renderInCard(<Heatmap {...whenFansBuyExample} />, {
      size: 'lg'
    })
    await focusPlot(container)
    const tooltip = container.querySelector('[data-slot=chart-plot-tooltip]')
    expect(tooltip?.textContent).toContain('Mon, 9am')
    expect(tooltip?.textContent).toContain('4')
  })

  it('keeps text at 11px or more on a phone', async () => {
    const { container } = renderInCard(<Heatmap {...whenFansBuyExample} />, {
      size: 'md',
      width: 320
    })
    await afterResize()
    expectMinFontSize(container)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <Heatmap {...whenFansBuyExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})
