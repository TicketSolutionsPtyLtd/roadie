import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { StackedArea } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectNoOverlap,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { scansByGateExample } from './examples'
import type { StackedAreaProps } from './types'

const presale: StackedAreaProps = {
  data: [
    '2026-10-01',
    '2026-10-08',
    '2026-10-15',
    '2026-10-22',
    '2026-10-29'
  ].flatMap((day, i) => [
    { day, pool: 'GA', issued: 300 + i * 80 },
    { day, pool: 'Members', issued: 120 + i * 10 },
    { day, pool: 'Comps', issued: 20 }
  ]),
  x: 'day',
  y: 'issued',
  series: 'pool',
  today: '2026-10-22',
  annotations: [{ at: '2026-10-08', label: 'Members presale' }]
}

// Today's label sits a line below the top, where a dropped label would land.
const todayALineDown: StackedAreaProps = {
  ...presale,
  data: presale.data.map((row, i) =>
    row.pool === 'GA'
      ? { ...row, issued: [300, 380, 460, 630, 820][i / 3]! }
      : row
  ),
  annotations: [{ at: '2026-10-21', label: 'Members presale' }]
}

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('StackedArea in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(
      <StackedArea {...scansByGateExample} />,
      { size: size as keyof typeof CARD_HEIGHTS }
    )
    expectFillsPlot(container, height)
  })

  it('reaches every time by keyboard and says each in words', async () => {
    const { container } = renderInCard(
      <StackedArea {...scansByGateExample} />,
      { size: 'full', width: 1200 }
    )
    const heard = await visitEveryStop(container)
    const times = new Set(scansByGateExample.data.map((row) => row.at)).size
    expect(heard).toHaveLength(times)
    expect(heard[0]).toMatch(/^Saturday, 14 November 2026, 6:00pm, \d+ scans, /)
  })

  it.each([280, 320, 560, 1200])(
    'keeps the today and annotation labels apart at %ipx',
    async (width) => {
      const { container } = renderInCard(<StackedArea {...presale} />, {
        size: 'md',
        width
      })
      await afterResize()
      expectNoOverlap(container, '[data-ts-key^="label-"] text')
    }
  )

  it.each([320, 560])(
    'keeps a label clear of today a line down at %ipx',
    async (width) => {
      const { container } = renderInCard(<StackedArea {...todayALineDown} />, {
        size: 'md',
        width
      })
      await afterResize()
      expectNoOverlap(container, '[data-ts-key^="label-"] text')
    }
  )
})
