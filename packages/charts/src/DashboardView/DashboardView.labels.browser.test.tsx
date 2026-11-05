import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { DataCard } from '@oztix/roadie-components/data-card'
import type { ChartCard, DashboardCard } from '@oztix/roadie-core/dashboard'

import { DashboardView } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})
afterEach(() => cleanup())

// Past two lines even on a desktop md card.
const LONG_LABEL = [
  'Tickets sold by ticket type across every show this season,',
  'against similar shows in the same week before each show,',
  'at every venue on the tour, for general admission, VIP, and',
  'every add-on, with resale and complimentary tickets left out'
].join(' ')

const days = Array.from({ length: 8 }, (_, i) => ({
  day: `2026-10-0${i + 1}`,
  sold: [120, 180, 150, 240, 310, 260, 400, 380][i]!
}))

const chartCard = (id: string, label: string): ChartCard => ({
  id,
  kind: 'chart',
  size: 'md',
  label,
  source: 'Oztix sales.',
  plot: { kind: 'line', data: days, x: 'day', y: 'sold' }
})

const moreFor = (card: DashboardCard) => (
  <DataCard.MoreButton label={card.label} />
)

const rectOf = (element: Element) => element.getBoundingClientRect()
const lineHeightOf = (element: Element) =>
  Number.parseFloat(getComputedStyle(element).lineHeight)

async function renderRow(width: number, height: number) {
  await page.viewport(width, height)
  const { container } = render(
    <div style={{ padding: 16 }}>
      <DashboardView
        spec={{
          version: 1,
          title: 'Sales',
          sections: [
            {
              title: 'Sales',
              cards: [
                chartCard('long', LONG_LABEL),
                chartCard('short', 'Sales pace')
              ]
            }
          ]
        }}
        cardActions={moreFor}
      />
    </div>
  )
  return [
    ...container.querySelectorAll<HTMLElement>('[data-slot=data-card]')
  ].map((card) => ({
    card,
    label: card.querySelector<HTMLElement>('[data-slot=data-card-label]')!,
    actions: card.querySelector<HTMLElement>('[data-slot=data-card-actions]')!
  }))
}

describe.each([
  [390, 844],
  [1440, 900]
])('a chart card label at %i px', (width, height) => {
  it('wraps to two lines, then clamps', async () => {
    const [long, short] = await renderRow(width, height)
    const lineHeight = lineHeightOf(long!.label)
    expect(rectOf(long!.label).height).toBeCloseTo(lineHeight * 2, 0)
    expect(long!.label.scrollHeight).toBeGreaterThan(long!.label.clientHeight)
    expect(long!.label).toHaveAttribute('title', LONG_LABEL)
    expect(rectOf(short!.label).height).toBeCloseTo(lineHeight, 0)
  })

  it('keeps every control on the first line of its label', async () => {
    const cards = await renderRow(width, height)
    for (const { label, actions } of cards) {
      const firstLineMiddle = rectOf(label).top + lineHeightOf(label) / 2
      expect(actions.children.length).toBeGreaterThan(1)
      for (const control of actions.children) {
        const { top, bottom } = rectOf(control)
        expect((top + bottom) / 2).toBeCloseTo(firstLineMiddle, 0)
      }
    }
  })
})

it('lines up the controls of cards that share a row at 1440 px', async () => {
  const [long, short] = await renderRow(1440, 900)
  expect(rectOf(long!.card).top).toBeCloseTo(rectOf(short!.card).top, 0)
  const moreOf = (actions: HTMLElement) =>
    rectOf(actions.querySelector('[data-slot=data-card-more]')!)
  expect(
    Math.abs(moreOf(long!.actions).top - moreOf(short!.actions).top)
  ).toBeLessThan(1)
})
