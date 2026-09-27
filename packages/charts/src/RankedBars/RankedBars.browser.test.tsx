import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { RankedBars } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectMinFontSize,
  expectNoOverlap,
  expectTableKeepsHeight,
  renderInCard
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { attendanceExample, channelExample, suburbExample } from './examples'
import type { RankedBarsProps } from './types'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const tiedExample: RankedBarsProps = {
  data: [
    { suburb: 'Bulimba', buyers: 40 },
    { suburb: 'New Farm', buyers: 96 },
    { suburb: 'Woolloongabba', buyers: 96 },
    { suburb: 'Newstead', buyers: 120 }
  ],
  x: 'suburb',
  y: 'buyers'
}

const liveOf = (container: HTMLElement) =>
  container.querySelector('[data-slot=chart-plot-announcement]')!

async function pressUntilStill(live: Element, key: string) {
  const heard: string[] = []
  for (let i = 0; i < 50; i++) {
    const text = live.textContent ?? ''
    if (heard.at(-1) === text) break
    heard.push(text)
    await userEvent.keyboard(`{${key}}`)
  }
  return heard
}

// Focus starts on the engine's first stop, the shortest bar, so climb first.
async function walkDown(container: HTMLElement) {
  const live = liveOf(container)
  container.querySelector<SVGElement>('svg.ts-chart')!.focus()
  await expect.poll(() => live.textContent).not.toBe('')
  await pressUntilStill(live, 'ArrowUp')
  return pressUntilStill(live, 'ArrowDown')
}

describe('RankedBars in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<RankedBars {...channelExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('walks the bars top to bottom with the down arrow, Other last', async () => {
    const { container } = renderInCard(<RankedBars {...channelExample} />)
    const heard = await walkDown(container)
    expect(heard).toEqual([
      'Email, 612 orders',
      'Instagram, 388 orders',
      'Direct, 301 orders',
      'Venue site, 164 orders',
      'TikTok, 142 orders',
      'Google, 97 orders',
      'Facebook, 61 orders',
      'Other, 63 orders'
    ])
    await userEvent.keyboard('{ArrowUp}')
    expect(liveOf(container).textContent).toBe('Facebook, 61 orders')
  })

  it('reaches both of two tied bars', async () => {
    const { container } = renderInCard(<RankedBars {...tiedExample} />)
    expect(await walkDown(container)).toEqual([
      'Newstead, 120 buyers',
      'New Farm, 96 buyers',
      'Woolloongabba, 96 buyers',
      'Bulimba, 40 buyers'
    ])
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
  it('gives highlighted, context and Other bars different fills', async (context) => {
    const { container } = renderInCard(<RankedBars {...channelExample} />)
    const fillOf = (name: string) =>
      getComputedStyle(
        container.querySelector(`rect[data-ts-key$=":${name}"]`)!
      ).fill
    expect(fillOf('Email')).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      const [story, contextBar, other] = ['Email', 'Instagram', 'Other'].map(
        fillOf
      )
      expect(story).toMatch(/texture-1/)
      expect(contextBar).toMatch(/texture-2/)
      expect(new Set([story, contextBar, other]).size).toBe(3)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
