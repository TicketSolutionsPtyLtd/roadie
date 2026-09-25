import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DashboardView } from '.'
import { createPortfolioDashboard, createShowDashboard } from '../examples'

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
      'What to do next'
    ])
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
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
})
