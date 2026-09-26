import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DashboardView } from '.'
import { checkoutExample } from '../Funnel/examples'
import { lineChart } from '../LineChart/definition'
import { paceExample, salesByTypeExample } from '../LineChart/examples'
import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard
} from '../examples'

describe('DashboardView', () => {
  // Rendering every chart of a dashboard in jsdom is slow on a CI runner.
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
  }, 30_000)

  // Rendering every chart of a dashboard in jsdom is slow on a CI runner.
  it('renders the portfolio table with inline visuals', () => {
    render(<DashboardView spec={createPortfolioDashboard()} />)
    expect(
      screen.getByRole('table', { name: 'Upcoming shows' })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('meter').length).toBeGreaterThanOrEqual(7)
  }, 15_000)

  it('renders on the server', () => {
    expect(
      renderToString(<DashboardView spec={createShowDashboard()} />)
    ).toContain('At a glance')
  })

  // Rendering every chart of a dashboard in jsdom is slow on a CI runner.
  it('asks for actions once per card, with its spec, on every card kind', () => {
    const spec = createShowDashboard()
    const cards = spec.sections.flatMap((section) => section.cards)
    const cardActions = vi.fn((card: (typeof cards)[number]) => (
      <button type='button'>More actions for {card.label}</button>
    ))
    render(<DashboardView spec={spec} cardActions={cardActions} />)
    expect(cardActions.mock.calls.map(([card]) => card)).toEqual(cards)
    expect(new Set(cards.map((card) => card.kind))).toEqual(
      new Set(['stat', 'table', 'chart', 'note'])
    )
    for (const { label } of cards)
      expect(screen.getByRole('article', { name: label })).toContainElement(
        screen.getByRole('button', { name: `More actions for ${label}` })
      )
  }, 20_000)

  // Rendering every chart of every dashboard in jsdom is slow on a CI runner.
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
    },
    15_000
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

describe('DashboardView with a legend', () => {
  it('keys a band with its median from the description', () => {
    const { container } = render(
      <DashboardView
        spec={{
          version: 1,
          title: 'Pace',
          sections: [
            {
              title: 'Sales',
              cards: [
                {
                  id: 'pace',
                  kind: 'chart',
                  size: 'md',
                  label: 'Sales pace',
                  source: 'Oztix sales.',
                  plot: { kind: 'static', src: '/pace.svg', alt: 'Pace' },
                  table: {
                    columns: [{ key: 'day', header: 'Day', kind: 'number' }],
                    rows: [{ day: 90 }]
                  },
                  legend: [
                    { label: 'Sold', shape: 'line' },
                    { label: 'Similar shows', shape: 'band', median: true }
                  ]
                }
              ]
            }
          ]
        }}
      />
    )
    const band = container.querySelector(
      '[data-slot=chart-legend] [data-shape=band]'
    )
    expect(band?.querySelector('line')).toHaveAttribute(
      'stroke',
      'var(--chart-median)'
    )
  })
})

describe('DashboardView when a plot fails to draw', () => {
  it('recovers once the spec brings data that draws', () => {
    const build = lineChart.build
    const spy = vi
      .spyOn(lineChart, 'build')
      .mockImplementation((props, paint, frame) => {
        if (props.takeaway === 'Broken') throw new Error('No scale range')
        return build(props, paint, frame)
      })
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    const withTakeaway = (takeaway: string) => ({
      ...lineDashboard,
      sections: [
        {
          ...lineDashboard.sections[0]!,
          cards: [
            {
              ...lineDashboard.sections[0]!.cards[0]!,
              plot: { ...lineDashboard.sections[0]!.cards[0]!.plot, takeaway }
            }
          ]
        }
      ]
    })
    const card = () => document.querySelector("[data-slot='data-card']")
    const { rerender } = render(<DashboardView spec={withTakeaway('Broken')} />)
    expect(card()).toHaveAttribute('data-state', 'error')
    rerender(<DashboardView spec={withTakeaway('Tracking ahead')} />)
    quiet.mockRestore()
    spy.mockRestore()
    expect(card()).not.toHaveAttribute('data-state', 'error')
    expect(
      screen.getByRole('img', { name: 'Tracking ahead' })
    ).toBeInTheDocument()
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
