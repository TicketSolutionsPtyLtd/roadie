import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { StackedBars } from '.'
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
import { resaleExample, ticketMixExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

async function heardAfter(container: HTMLElement, keys: readonly string[]) {
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  const heard = [live.textContent]
  for (const key of keys) {
    await userEvent.keyboard(`{${key}}`)
    heard.push(live.textContent)
  }
  return heard
}

const segmentRect = (container: HTMLElement, slot: number) =>
  container.querySelector(`[data-ts-key^="series-${slot}:"]`)!

describe('StackedBars in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))(
    'fills the %s plot, legend included',
    (size, height) => {
      const { container } = renderInCard(
        <StackedBars {...ticketMixExample} />,
        { size: size as keyof typeof CARD_HEIGHTS }
      )
      expectFillsPlot(container, height)
    }
  )

  it('reaches every bar by keyboard', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    expect(await visitEveryStop(container)).toHaveLength(3)
  })

  it('walks vertical bars in category order and their segments with up and down', async () => {
    const { container } = renderInCard(<StackedBars {...resaleExample} />)
    const along = await visitEveryStop(container)
    expect(along.map((text) => text.split(',')[0])).toEqual([
      'Sep',
      'Oct',
      'Nov'
    ])
    expect(await heardAfter(container, ['ArrowDown', 'ArrowUp'])).toEqual([
      'Nov, Kept, 1,350 tickets, 94% of the bar',
      'Nov, Resold, 90 tickets, 6.3% of the bar',
      'Nov, Kept, 1,350 tickets, 94% of the bar'
    ])
  })

  // ChartPlot steps Left and Right by pixel x and Up and Down within one
  // pixel-x column, so horizontal bars walk in value order and never reach
  // the later segments. Needs a shared-layer fix (see task-12-report.md).
  it.fails('walks horizontal bars in category order', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    await visitEveryStop(container)
    const down = await heardAfter(container, ['ArrowDown', 'ArrowDown'])
    expect(down.map((text) => text.split(',')[0])).toEqual([
      'Friday',
      'Saturday',
      'Sunday'
    ])
  })

  it.fails('reaches every segment of a horizontal bar', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    await visitEveryStop(container)
    const heard = await heardAfter(container, ['ArrowRight', 'ArrowRight'])
    expect(new Set(heard.map((text) => text.split(', ')[1]))).toEqual(
      new Set(['GA', 'VIP', 'Early bird'])
    )
  })

  it('keeps text at 11px or more on a phone', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />, {
      size: 'sm',
      width: 320
    })
    await afterResize()
    expectMinFontSize(container)
  })

  it('draws each segment under its own texture key', () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    for (const slot of [1, 2, 3])
      expect(segmentRect(container, slot)).not.toBeNull()
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <StackedBars {...ticketMixExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('StackedBars under forced colours', () => {
  it('fills each segment with its own texture', async (context) => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    expect(getComputedStyle(segmentRect(container, 1)).fill).not.toContain(
      'texture'
    )

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      for (const slot of [1, 2, 3])
        expect(getComputedStyle(segmentRect(container, slot)).fill).toMatch(
          new RegExp(`texture-${slot}`)
        )
    } finally {
      await commands.forcedColors(false)
    }
  })
})
