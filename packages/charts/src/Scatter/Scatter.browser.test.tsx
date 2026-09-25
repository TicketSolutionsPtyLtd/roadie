import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { Scatter } from '.'
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
import { portfolioExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('Scatter in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<Scatter {...portfolioExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it('reaches every point by keyboard, left to right', async () => {
    const { container } = renderInCard(<Scatter {...portfolioExample} />, {
      size: 'lg'
    })
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(6)
    expect(heard[0]).toBe('Genesis Owusu, pace 66, sold 28%, needs a push')
    expect(heard.at(-1)).toBe('King Stingray, pace 121, sold 75%, on a roll')
  })

  it.each([320, 800])(
    'keeps quadrant and point names apart at %ipx',
    async (width) => {
      const { container } = renderInCard(<Scatter {...portfolioExample} />, {
        size: 'lg',
        width
      })
      await afterResize()
      expectNoOverlap(
        container,
        '[data-ts-key^="label-quadrants:"], [data-ts-key^="label-points:"]'
      )
      expectMinFontSize(container)
    }
  )

  it('keeps every label inside the plot', async () => {
    const { container } = renderInCard(<Scatter {...portfolioExample} />, {
      size: 'sm',
      width: 320
    })
    await afterResize()
    const svg = container.querySelector('svg.ts-chart')!.getBoundingClientRect()
    for (const label of container.querySelectorAll('[data-ts-key^="label-"]')) {
      const box = label.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(svg.left - 0.5)
      expect(box.right).toBeLessThanOrEqual(svg.right + 0.5)
    }
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <Scatter {...portfolioExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})

describe('Scatter in print', () => {
  it('textures highlighted and context dots apart', async () => {
    const { container } = renderInCard(<Scatter {...portfolioExample} />)
    const dot = (slot: number) =>
      container.querySelector(`circle[data-ts-key^='series-${slot}:']`)!
    await commands.printMedia(true)
    try {
      expect(getComputedStyle(dot(1)).fill).toMatch(/texture-1/)
      expect(getComputedStyle(dot(2)).fill).toMatch(/texture-2/)
    } finally {
      await commands.printMedia(false)
    }
  })
})
