import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { DonutChart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  CARD_HEIGHTS,
  afterResize,
  expectFillsPlot,
  expectLabelsInsideSvg,
  expectMinFontSize,
  expectNoOverlap,
  expectTableKeepsHeight,
  renderInCard
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { ticketTypeExample } from './examples'
import type { DonutChartProps } from './types'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const ticketTypes = (counts: readonly [string, number][]): DonutChartProps => ({
  data: counts.map(([type, tickets]) => ({ type, tickets })),
  x: 'type',
  y: 'tickets'
})

// Five close parts crowd the labels the most, near 12 o'clock.
const close = ticketTypes([
  ['GA', 30],
  ['Early bird', 25],
  ['VIP', 20],
  ['Concession', 15],
  ['Companion', 10]
])
// Small slices side by side, where neighbouring labels would collide.
const tail = ticketTypes([
  ['GA', 80],
  ['Early bird', 8],
  ['VIP', 5],
  ['Concession', 4],
  ['Companion', 3]
])

describe('DonutChart in a card', () => {
  it.each(Object.entries(CARD_HEIGHTS))('fills the %s plot', (size, height) => {
    const { container } = renderInCard(<DonutChart {...ticketTypeExample} />, {
      size: size as keyof typeof CARD_HEIGHTS
    })
    expectFillsPlot(container, height)
  })

  // A 390px phone leaves 358px for the card; a 1440px desktop, a full card.
  // A narrow small card's legend wraps, leaving the plot shorter than the ring's reach.
  it.each([
    ['phone', 358, 'md'],
    ['narrow small card', 280, 'sm'],
    ['desktop', 1376, 'full']
  ] as const)(
    'keeps every slice label apart and inside the plot on a %s',
    async (_, width, size) => {
      for (const props of [ticketTypeExample, close, tail]) {
        const { container, unmount } = renderInCard(<DonutChart {...props} />, {
          size,
          width
        })
        await afterResize()
        expect(
          container.querySelectorAll('[data-ts-key^="label-values"] text')
        ).toHaveLength(5)
        expectNoOverlap(container, '[data-ts-key^="label-"] text')
        expectLabelsInsideSvg(container)
        expectMinFontSize(container)
        unmount()
      }
    }
  )

  it('walks the ring clockwise with arrows, and wraps', async () => {
    const { container } = renderInCard(<DonutChart {...ticketTypeExample} />)
    await afterResize()
    const svg = container.querySelector<SVGElement>('svg.ts-chart')!
    const live = container.querySelector('[data-slot=chart-plot-announcement]')!
    const heard = () => live.textContent ?? ''
    svg.focus()
    await expect.poll(heard).toBe('GA, 1,240 tickets, 52%')
    await userEvent.keyboard('{ArrowRight}')
    await expect.poll(heard).toBe('Early bird, 520 tickets, 22%')
    await userEvent.keyboard('{End}')
    await expect.poll(heard).toBe('Companion, 95 tickets, 4%')
    await userEvent.keyboard('{ArrowRight}')
    await expect.poll(heard).toBe('GA, 1,240 tickets, 52%')
    await userEvent.keyboard('{ArrowLeft}')
    await expect.poll(heard).toBe('Companion, 95 tickets, 4%')
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(heard).toBe('GA, 1,240 tickets, 52%')
    await userEvent.keyboard('{ArrowUp}')
    await expect.poll(heard).toBe('Companion, 95 tickets, 4%')
    await userEvent.keyboard('{Home}')
    await expect.poll(heard).toBe('GA, 1,240 tickets, 52%')
  })

  it('keeps its height in the Table view', async () => {
    const { container, getByRole } = renderInCard(
      <DonutChart {...ticketTypeExample} />
    )
    await afterResize()
    await expectTableKeepsHeight(container, getByRole)
  })
})
