import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { StackedArea } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  expectFillsPlot,
  renderInCard,
  visitEveryStop
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { scansByGateExample } from './examples'

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
})
