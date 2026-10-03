import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type {
  DashboardCard,
  DashboardPeriodSpec,
  DashboardSpec
} from '@oztix/roadie-core/dashboard'

import { DashboardView } from '.'

// Wed 7 Oct 2026.
const TODAY = '2026-10-07'

const sold: DashboardCard = {
  id: 'sold',
  kind: 'stat',
  size: 'stat',
  label: 'Tickets sold',
  value: 1842,
  delta: { value: 214, comparison: true }
}
const sellThrough: DashboardCard = {
  id: 'sell-through',
  kind: 'stat',
  size: 'stat',
  label: 'Sell-through',
  value: 0.77,
  format: 'percent',
  delta: { value: 9, format: 'points' },
  context: 'Week target is 85%'
}
const shows: DashboardCard = {
  id: 'shows',
  kind: 'table',
  size: 'full',
  label: 'Shows on sale',
  value: 12,
  delta: { value: 2, comparison: true },
  columns: [{ key: 'name', header: 'Show', kind: 'text' }],
  rows: [{ name: 'Neon Harbour' }],
  source: 'Oztix sales'
}

const dashboard = (period?: DashboardPeriodSpec): DashboardSpec => ({
  version: 1,
  title: 'Sales',
  ...(period && { period }),
  sections: [{ title: 'At a glance', cards: [sold, sellThrough, shows] }]
})

const card = (name: string) => screen.getByRole('article', { name })
const deltaIn = (name: string) =>
  card(name).querySelector('[data-slot="delta"]')
const contextIn = (name: string) =>
  card(name).querySelector('[data-slot="data-card-context"]')?.textContent

const periodProps = { today: TODAY }

describe('DashboardView periods', () => {
  it('shows no period controls without a period', () => {
    render(<DashboardView spec={dashboard()} />)
    expect(screen.queryByRole('group', { name: 'Dashboard period' })).toBeNull()
  })

  it('shows the period read-only when the app can’t change it', () => {
    render(
      <DashboardView
        spec={dashboard({ range: 'this-month', compare: 'previous-period' })}
        periodProps={periodProps}
      />
    )
    const group = screen.getByRole('group', { name: 'Dashboard period' })
    expect(
      within(group).getByRole('button', { name: /^Choose dates, Period/ })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('hands a new comparison to the app, without the old history', async () => {
    const onPeriodChange = vi.fn()
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: 'previous-period',
          history: 'partial'
        })}
        periodProps={periodProps}
        onPeriodChange={onPeriodChange}
      />
    )
    const trigger = screen.getByRole('combobox', { name: 'Compare with' })
    fireEvent.pointerDown(trigger, { pointerType: 'mouse' })
    fireEvent.mouseDown(trigger)
    fireEvent.click(trigger)
    const option = await screen.findByRole('option', { name: /^Previous year/ })
    fireEvent.pointerDown(option, { pointerType: 'mouse' })
    fireEvent.mouseDown(option)
    fireEvent.pointerUp(option, { pointerType: 'mouse' })
    fireEvent.mouseUp(option)
    fireEvent.click(option)
    expect(onPeriodChange).toHaveBeenCalledWith({
      range: 'this-month',
      compare: 'previous-year'
    })
  })

  it('names the comparison under a comparison delta', () => {
    render(
      <DashboardView
        spec={dashboard({ range: 'this-month', compare: 'previous-period' })}
      />
    )
    expect(deltaIn('Tickets sold')).toHaveTextContent('214')
    expect(contextIn('Tickets sold')).toBe('vs previous period')
    expect(deltaIn('Shows on sale')).toHaveTextContent('2')
    expect(contextIn('Shows on sale')).toBe('vs previous period')
  })

  it('names the comparison over a card’s own context, so it can’t go stale', () => {
    render(
      <DashboardView
        spec={{
          ...dashboard({ range: 'this-month', compare: 'previous-year' }),
          sections: [
            {
              title: 'At a glance',
              cards: [{ ...sold, context: 'vs previous period' }]
            }
          ]
        }}
      />
    )
    expect(contextIn('Tickets sold')).toBe('vs previous year')
  })

  it('names custom comparison dates', () => {
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: { start: '2026-09-01', end: '2026-09-14' }
        })}
      />
    )
    expect(contextIn('Tickets sold')).toBe('vs 1 to 14 Sept 2026')
  })

  it('hides a comparison delta when there is no comparison', () => {
    render(<DashboardView spec={dashboard({ range: 'this-month' })} />)
    expect(deltaIn('Tickets sold')).toBeNull()
    expect(contextIn('Tickets sold')).toBeUndefined()
    expect(deltaIn('Shows on sale')).toBeNull()
  })

  it.each([
    ['partial', 'Not enough history'],
    ['unavailable', 'Nothing to compare']
  ] as const)(
    'says so in place of the delta when history is %s',
    (history, message) => {
      render(
        <DashboardView
          spec={dashboard({
            range: 'this-month',
            compare: 'previous-year',
            history
          })}
        />
      )
      expect(deltaIn('Tickets sold')).toBeNull()
      expect(contextIn('Tickets sold')).toBe(message)
      expect(card('Tickets sold')).toHaveTextContent('1,842')
      expect(deltaIn('Shows on sale')).toBeNull()
      expect(contextIn('Shows on sale')).toBe(message)
    }
  )

  it('leaves other deltas alone', () => {
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: 'previous-year',
          history: 'unavailable'
        })}
      />
    )
    expect(deltaIn('Sell-through')).toHaveTextContent('9 pts')
    expect(contextIn('Sell-through')).toBe('Week target is 85%')
  })

  it('names custom dates in the toolbar’s locale', () => {
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: { start: '2026-09-01', end: '2026-09-14' }
        })}
        periodProps={{ ...periodProps, locale: 'en-US' }}
      />
    )
    expect(contextIn('Tickets sold')).toBe('vs 1 to 14 Sep 2026')
  })

  it('falls back to words for custom date-times it can’t place', () => {
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: { start: '2026-09-01T09:00', end: '2026-09-02' }
        })}
      />
    )
    expect(contextIn('Tickets sold')).toBe('vs custom dates')
  })

  it('keeps the comparison flag out of the page', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <DashboardView
        spec={dashboard({ range: 'this-month', compare: 'previous-period' })}
      />
    )
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('places the app’s own controls beside the period', () => {
    render(
      <DashboardView
        spec={dashboard({ range: 'this-month' })}
        periodProps={{
          ...periodProps,
          children: <button type='button'>Similar venues</button>
        }}
      />
    )
    expect(
      within(screen.getByRole('group', { name: 'Dashboard period' })).getByRole(
        'button',
        { name: 'Similar venues' }
      )
    ).toBeInTheDocument()
  })

  it('renders the period on the server', () => {
    const html = renderToString(
      <DashboardView
        spec={dashboard({ range: 'this-month', compare: 'previous-period' })}
      />
    )
    expect(html).toContain('vs previous period')
    expect(html).toContain('data-slot="dashboard-period"')
  })
})
