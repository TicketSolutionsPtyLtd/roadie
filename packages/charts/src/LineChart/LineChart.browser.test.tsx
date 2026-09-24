import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { LineChart } from '.'
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
import { paceExample, salesByTypeExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('LineChart in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<LineChart {...paceExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  it.each([320, 560, 1200])('keeps end labels apart at %ipx', async (width) => {
    const { container } = renderInCard(<LineChart {...paceExample} />, {
      size: 'full',
      width
    })
    await afterResize()
    expectNoOverlap(container, '[data-ts-key^="label-end"] text')
  })

  it('shows a legend instead of end labels on a phone', async () => {
    const { container } = renderInCard(<LineChart {...salesByTypeExample} />, {
      width: 320
    })
    await expect
      .poll(() => container.querySelector('[data-slot=chart-legend]'))
      .not.toBeNull()
    expect(container.querySelector('[data-ts-key^="label-end"]')).toBeNull()
  })

  it('reaches every day by keyboard and says each in words', async () => {
    const { container } = renderInCard(<LineChart {...paceExample} />, {
      size: 'full',
      width: 1200
    })
    const heard = await visitEveryStop(container)
    expect(heard).toHaveLength(paceExample.data.length)
    expect(heard[0]).toMatch(/^Sunday 16 August, \d+% sold$/)
    expect(heard.at(-1)).toBe('Saturday 14 November, 96% sold')
  })

  it('keeps text at 11px or more on a phone', async () => {
    const { container } = renderInCard(<LineChart {...paceExample} />, {
      size: 'sm',
      width: 320
    })
    await expect
      .poll(() => container.querySelector('[data-ts-key^="label-end"]'))
      .toBeNull()
    expectMinFontSize(container)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <LineChart {...paceExample} />
    )
    await expectTableKeepsHeight(container, getByRole)
  })

  it('draws each series under a key the forced colours rules target', () => {
    const { container } = renderInCard(<LineChart {...salesByTypeExample} />, {
      width: 800
    })
    expect(container.querySelector('[data-ts-key^="series-2:"]')).not.toBeNull()
  })
})
