import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardView } from '.'
import { checkoutExample } from '../Funnel/examples'
import { paceExample, salesByTypeExample } from '../LineChart/examples'
import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard
} from '../examples'

describe('DashboardView', () => {
  it('renders every card of the show dashboard', () => {
    render(<DashboardView spec={createShowDashboard()} />)
    for (const name of [
      'Tickets sold',
      'Sell-through',
      'Pace index',
      'Gross revenue',
      'Sales pace',
      'Ticket types',
      'Where buyers are from',
      'What to do next',
      'Daily orders',
      'Ticket type mix',
      'When fans buy'
    ])
      expect(screen.getByRole('article', { name })).toBeInTheDocument()
    expect(
      screen.getAllByRole('img', { name: /similar shows/ }).length
    ).toBeGreaterThan(0)
  })

  it('renders the portfolio table with inline visuals', () => {
    render(<DashboardView spec={createPortfolioDashboard()} />)
    expect(
      screen.getByRole('table', { name: 'Upcoming shows' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('meter').length).toBeGreaterThanOrEqual(7)
  })

  it('renders on the server', () => {
    expect(
      renderToString(<DashboardView spec={createShowDashboard()} />)
    ).toContain('At a glance')
  })

  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()],
    ['audience', createAudienceDashboard()]
  ])(
    'draws every chart card of the %s dashboard, named by its takeaway',
    (_, spec) => {
      render(<DashboardView spec={spec} />)
      const names = spec.sections
        .flatMap((section) => section.cards)
        .flatMap((card) =>
          card.kind === 'chart' && card.plot.kind !== 'static'
            ? [card.plot.takeaway ?? card.takeaway]
            : []
        )
      expect(names.length).toBeGreaterThan(0)
      for (const name of names)
        expect(screen.getByRole('img', { name })).toBeInTheDocument()
    }
  )
})

const lineDashboard = {
  version: 1 as const,
  title: 'Pace',
  sections: [
    {
      title: 'Sales',
      cards: [
        {
          id: 'pace',
          kind: 'chart' as const,
          size: 'full' as const,
          label: 'Sales pace',
          source: 'Oztix sales.',
          plot: { kind: 'line' as const, ...paceExample }
        }
      ]
    }
  ]
}

describe('DashboardView with a line plot', () => {
  it('renders a real chart named by its takeaway', () => {
    render(<DashboardView spec={lineDashboard} />)
    expect(
      screen.getByRole('img', { name: paceExample.takeaway })
    ).toBeInTheDocument()
  })

  it('puts the derived table in the server HTML', () => {
    const html = renderToString(<DashboardView spec={lineDashboard} />)
    expect(html).toContain('Similar shows range')
    expect(html).toContain('var(--chart-highlight)')
  })
})

const severalChartCards = {
  version: 1 as const,
  title: 'Pace',
  sections: [
    {
      title: 'Sales',
      cards: [
        {
          id: 'pace',
          kind: 'chart' as const,
          size: 'full' as const,
          label: 'Sales pace',
          source: 'Oztix sales.',
          plot: { kind: 'line' as const, ...paceExample }
        },
        {
          id: 'by-type',
          kind: 'chart' as const,
          size: 'md' as const,
          label: 'Orders by type',
          source: 'Oztix sales.',
          plot: { kind: 'line' as const, ...salesByTypeExample }
        }
      ]
    }
  ]
}

describe('DashboardView with several chart cards', () => {
  it('never repeats a DOM id across the whole dashboard', () => {
    const { container } = render(<DashboardView spec={severalChartCards} />)
    const ids = [...container.querySelectorAll('[id]')].map((el) => el.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toHaveLength(new Set(ids).size)
  })

  it('renders on the server', () => {
    expect(() =>
      renderToString(<DashboardView spec={severalChartCards} />)
    ).not.toThrow()
  })
})

const funnelDashboard = {
  version: 1 as const,
  title: 'Checkout',
  sections: [
    {
      title: 'Conversion',
      cards: [
        {
          id: 'checkout',
          kind: 'chart' as const,
          size: 'full' as const,
          label: 'Checkout',
          source: 'Oztix sales.',
          plot: { kind: 'funnel' as const, ...checkoutExample }
        }
      ]
    }
  ]
}

describe('DashboardView with a plot other than a line', () => {
  it('renders the chart and its derived table on the server', () => {
    const html = renderToString(<DashboardView spec={funnelDashboard} />)
    expect(html).toContain(`aria-label="${checkoutExample.takeaway}`)
    expect(html).toContain('Started checkout')
    expect(html).toContain('<table')
  })
})
