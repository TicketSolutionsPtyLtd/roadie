import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { DataCard } from '@oztix/roadie-components/data-card'
import { StatTile } from '@oztix/roadie-components/stat-tile'
import type { DashboardCard } from '@oztix/roadie-core/dashboard'

import { DashboardView } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { Chart } from '../Chart'
import { createShowDashboard } from '../examples'
import { loadBrandFont, useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const PHONE_CONTENT_WIDTH = 328
const WIDTHS = [PHONE_CONTENT_WIDTH, 1920]

const moreFor = (card: DashboardCard) => (
  <DataCard.MoreButton label={card.label} />
)

const renderDashboard = (width: number) =>
  render(
    <div style={{ width }}>
      <DashboardView spec={createShowDashboard()} cardActions={moreFor} />
    </div>
  )

const rectOf = (element: Element) => element.getBoundingClientRect()

const middleOf = (element: Element) =>
  (rectOf(element).top + rectOf(element).bottom) / 2

function contentRight(inner: HTMLElement) {
  return (
    rectOf(inner).right -
    Number.parseFloat(getComputedStyle(inner).paddingRight)
  )
}

describe('card actions fit the header row', () => {
  it.each(WIDTHS)('at %i px', (width) => {
    const { container } = renderDashboard(width)
    const cards = container.querySelectorAll<HTMLElement>(
      '[data-slot=data-card]'
    )
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      const label = card.querySelector<HTMLElement>(
        '[data-slot=data-card-label]'
      )!
      const actions = card.querySelector<HTMLElement>(
        '[data-slot=data-card-actions]'
      )!
      const inner = card.querySelector<HTMLElement>(
        '[data-slot=data-card-inner]'
      )!
      const row = label.parentElement!
      expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth)
      expect(rectOf(actions).right).toBeLessThanOrEqual(contentRight(inner) + 1)
      expect(rectOf(label).right).toBeLessThanOrEqual(rectOf(actions).left)
      const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight)
      expect(rectOf(label).height).toBeLessThanOrEqual(lineHeight * 1.2)
      expect(actions.lastElementChild).toHaveAttribute(
        'data-slot',
        'data-card-more'
      )
      for (const action of actions.children)
        expect(
          Math.abs(middleOf(action) - middleOf(label))
        ).toBeLessThanOrEqual(1)
    }
  })
})

describe('a label beside actions', () => {
  const longLabel = 'Sales pace against similar shows this year'

  it.each([
    { size: 'md' as const, width: 292 },
    { size: 'full' as const, width: PHONE_CONTENT_WIDTH }
  ])('truncates on one line at $size, $width px', ({ size, width }) => {
    const { container } = render(
      <div style={{ width }}>
        <Chart
          label={longLabel}
          size={size}
          source='Oztix sales.'
          actions={<DataCard.MoreButton label={longLabel} />}
        >
          <svg role='img' aria-label='Pace chart' />
        </Chart>
      </div>
    )
    const label = container.querySelector<HTMLElement>(
      '[data-slot=data-card-label]'
    )!
    const lineHeight = Number.parseFloat(getComputedStyle(label).lineHeight)
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
    expect(getComputedStyle(label).textOverflow).toBe('ellipsis')
    expect(rectOf(label).height).toBeLessThanOrEqual(lineHeight * 1.2)
    expect(label).toHaveAttribute('title', longLabel)
  })

  // The budgets the Dashboard design page gives for a card with a More button.
  it.each([
    { size: 'sm' as const, width: 292, label: 'Julia Jacklin pace' },
    { size: 'md' as const, width: 292, label: 'Julia Jacklin pace' },
    { size: 'lg' as const, width: 328, label: 'Julia Jacklin sell rate' },
    { size: 'full' as const, width: 328, label: 'Julia Jacklin sell rate' }
  ])(
    'fits a chart label of the actions budget at $size, $width px',
    ({ size, width, label }) => {
      const { container } = render(
        <div style={{ width }}>
          <Chart
            label={label}
            size={size}
            source='Oztix sales.'
            actions={<DataCard.MoreButton label={label} />}
          >
            <svg role='img' aria-label='Pace chart' />
          </Chart>
        </div>
      )
      const labelEl = container.querySelector('[data-slot=data-card-label]')!
      expect(labelEl.scrollWidth).toBeLessThanOrEqual(labelEl.clientWidth)
    }
  )

  it('fits a stat label of the actions budget at 158 px', () => {
    const label = 'VIP sold vs GA'
    const { container } = render(
      <div style={{ width: 158 }}>
        <StatTile
          label={label}
          value={1842}
          actions={<DataCard.MoreButton label={label} />}
        />
      </div>
    )
    const labelEl = container.querySelector('[data-slot=data-card-label]')!
    expect(labelEl.scrollWidth).toBeLessThanOrEqual(labelEl.clientWidth)
  })
})

describe('a chart with a More button', () => {
  const table = {
    columns: [{ key: 'day', header: 'Day', kind: 'number' as const }],
    rows: [{ day: 30 }, { day: 60 }, { day: 90 }]
  }
  const renderChart = (width: number) =>
    render(
      <div style={{ width }}>
        <Chart
          label='Sales pace'
          value={0.61}
          format='percent'
          context='Ahead of similar shows'
          size='full'
          source='Oztix sales.'
          table={table}
          actions={<DataCard.MoreButton label='Sales pace' />}
        >
          <svg role='img' aria-label='Pace chart' className='size-full' />
        </Chart>
      </div>
    )

  it('tabs from the view switch to More', async () => {
    const { getByRole } = renderChart(PHONE_CONTENT_WIDTH)
    await userEvent.tab()
    expect(getByRole('tab', { name: 'Chart' })).toHaveFocus()
    await userEvent.tab()
    expect(
      getByRole('button', { name: 'More actions for Sales pace' })
    ).toHaveFocus()
  })

  it.each(WIDTHS)(
    'keeps the card height across the Chart and Table views at %i px',
    async (width) => {
      const { container, getByRole } = renderChart(width)
      const card = container.querySelector('[data-slot=data-card]')!
      const chartHeight = rectOf(card).height
      await userEvent.click(getByRole('tab', { name: 'Table' }))
      expect(getByRole('table')).toBeVisible()
      expect(Math.abs(rectOf(card).height - chartHeight)).toBeLessThanOrEqual(
        0.5
      )
      await userEvent.click(getByRole('tab', { name: 'Chart' }))
      expect(Math.abs(rectOf(card).height - chartHeight)).toBeLessThanOrEqual(
        0.5
      )
    }
  )
})

describe('a dashboard with card actions', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <main>
        <h1>Dashboard</h1>
        <DashboardView spec={createShowDashboard()} cardActions={moreFor} />
      </main>
    )
    const results = await axe.run(container)
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual(
      []
    )
  })
})
