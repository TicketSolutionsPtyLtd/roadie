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

async function focusPlot(container: HTMLElement) {
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  container.querySelector<SVGElement>('svg.ts-chart')!.focus()
  await expect.poll(() => live.textContent).not.toBe('')
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

  // The engine first focuses the shortest bar, so climb to the top first.
  it('walks horizontal bars top to bottom with up and down', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    await focusPlot(container)
    const heard = await heardAfter(container, [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown'
    ])
    expect(heard.slice(2)).toEqual([
      'Aug, GA, 414 sold',
      'Sep, GA, 213 sold',
      'Oct, GA, 377 sold'
    ])
  })

  it('reaches every segment of a horizontal bar with left and right', async () => {
    const { container } = renderInCard(<StackedBars {...ticketMixExample} />)
    await focusPlot(container)
    const heard = await heardAfter(container, [
      'ArrowUp',
      'ArrowUp',
      'ArrowRight',
      'ArrowRight',
      'ArrowLeft'
    ])
    expect(heard.slice(2)).toEqual([
      'Aug, GA, 414 sold',
      'Aug, VIP, 60 sold',
      'Aug, Early bird, 300 sold',
      'Aug, VIP, 60 sold'
    ])
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
