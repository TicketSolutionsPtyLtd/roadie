import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands } from 'vitest/browser'

import { LineChart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectLabelsInsideSvg,
  expectMinFontSize,
  expectNoOverlap,
  expectTableKeepsHeight,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { paceExample, salesByTypeExample } from './examples'
import type { LineChartProps } from './types'

const todayAtEnd: LineChartProps = {
  data: [
    { day: '2026-09-01', sold: 0.14, low: 0.07, high: 0.22, median: 0.14 },
    { day: '2026-09-15', sold: 0.3, low: 0.18, high: 0.33, median: 0.25 },
    { day: '2026-10-01', sold: 0.45, low: 0.28, high: 0.43, median: 0.35 },
    { day: '2026-10-15', sold: 0.61, low: 0.38, high: 0.53, median: 0.45 }
  ],
  x: 'day',
  y: 'sold',
  format: 'percent',
  band: { low: 'low', high: 'high', median: 'median', label: 'Similar shows' },
  target: 0.85,
  today: '2026-10-15',
  annotations: [{ at: '2026-10-14', label: 'Final release' }]
}

const labelledExamples = { pace: paceExample, 'today at the end': todayAtEnd }

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

  it('keeps today clear of the end labels when today is the last point', async () => {
    const { container } = renderInCard(<LineChart {...todayAtEnd} />)
    await afterResize()
    expect(container.querySelector('[data-ts-key^="today"]')).not.toBeNull()
    expectNoOverlap(container, '[data-ts-key^="label-"] text')
  })

  describe.each([328, 390])('at %ipx', (width) => {
    it.each(Object.entries(labelledExamples))(
      'keeps every %s label inside the plot',
      async (_, props) => {
        const { container } = renderInCard(<LineChart {...props} />, {
          width
        })
        await afterResize()
        expectLabelsInsideSvg(container)
      }
    )
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

  it('names the pace reading aids in a legend on a phone', async () => {
    const { container } = renderInCard(<LineChart {...paceExample} />, {
      width: 320
    })
    await expect
      .poll(() => container.querySelector('[data-slot=chart-legend]'))
      .not.toBeNull()
    expect(
      container.querySelector('[data-slot=chart-legend]')!.textContent
    ).toContain('Similar shows median')
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
    expect(heard.at(-1)).toBe('Saturday 14 November, 96% sold, forecast')
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

describe('LineChart legend in print', () => {
  it('dashes each legend line like its series', async () => {
    const { container } = renderInCard(<LineChart {...salesByTypeExample} />, {
      width: 320
    })
    await expect
      .poll(() => container.querySelector('[data-slot=chart-legend]'))
      .not.toBeNull()
    await commands.printMedia(true)
    try {
      for (const slot of [2, 3]) {
        const line = container.querySelector(
          `.ts-chart__line[data-ts-key^='series-${slot}'] path`
        )!
        const key = container.querySelector(
          `[data-slot=chart-legend] line[data-chart-dash='${slot}']`
        )!
        const dash = getComputedStyle(line).strokeDasharray
        expect(dash).not.toBe('none')
        expect(getComputedStyle(key).strokeDasharray).toBe(dash)
      }
    } finally {
      await commands.printMedia(false)
    }
  })
})
