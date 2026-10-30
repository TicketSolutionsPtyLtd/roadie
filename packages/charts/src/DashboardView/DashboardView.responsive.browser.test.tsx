import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { DashboardView } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { ticketTypeExample } from '../DonutChart/examples'
import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard
} from '../examples'
import {
  afterResize,
  expectLabelsInsideSvg,
  expectNoOverlap
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const PHONE_CONTENT_WIDTH = 328
const TABLET_CONTENT_WIDTH = 600

describe('reference dashboards fit a phone width', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()],
    ['audience', createAudienceDashboard()]
  ])('%s stat tiles do not truncate at 328px', (_, spec) => {
    const { container } = render(
      <div style={{ width: PHONE_CONTENT_WIDTH }}>
        <DashboardView spec={spec} />
      </div>
    )
    const truncated: string[] = []
    for (const card of container.querySelectorAll<HTMLElement>(
      '[data-slot=data-card]'
    )) {
      for (const el of card.querySelectorAll<HTMLElement>(
        '[data-slot=data-card-label], [data-slot=data-card-context]'
      )) {
        if (el.scrollWidth <= el.clientWidth) continue
        truncated.push(
          `${card.dataset.size}: ${el.dataset.slot} "${el.textContent}"`
        )
      }
    }
    expect(truncated).toEqual([])
  })
})

describe('reference dashboards fit a tablet width', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()],
    ['audience', createAudienceDashboard()]
  ])('%s cards do not truncate at 600px', (_, spec) => {
    const { container } = render(
      <div style={{ width: TABLET_CONTENT_WIDTH }}>
        <DashboardView spec={spec} />
      </div>
    )
    for (const el of container.querySelectorAll<HTMLElement>(
      '[data-slot=data-card-label], [data-slot=data-card-context]'
    )) {
      expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth)
    }
  })
})

describe('a donut card', () => {
  const donutCard = (size: 'sm' | 'md' | 'lg' | 'full') => ({
    version: 1 as const,
    title: 'Audience',
    sections: [
      {
        title: 'Tickets',
        cards: [
          {
            id: 'types',
            kind: 'chart' as const,
            size,
            label: 'Tickets by type',
            source: 'Oztix sales.',
            plot: { kind: 'donut' as const, ...ticketTypeExample }
          }
        ]
      }
    ]
  })

  // A 390px phone leaves 358px; a 1440px desktop, about 1376px.
  it.each([
    ['phone', 358, 'md'],
    ['phone', 358, 'full'],
    ['desktop', 1376, 'sm'],
    ['desktop', 1376, 'full']
  ] as const)(
    'draws its slices with labels apart and inside the card on a %s, at %i px, %s',
    async (_, width, size) => {
      const { container } = render(
        <div style={{ width }}>
          <DashboardView spec={donutCard(size)} />
        </div>
      )
      await afterResize()
      const card = container.querySelector<HTMLElement>(
        '[data-slot=data-card]'
      )!
      expect(
        card.querySelectorAll('[data-ts-key^="series-"] path')
      ).toHaveLength(5)
      expectNoOverlap(card, '[data-ts-key^="label-"] text')
      expectLabelsInsideSvg(card)
    }
  )
})
