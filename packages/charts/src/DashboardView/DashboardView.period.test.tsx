import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type {
  DashboardCard,
  DashboardPeriodSpec,
  DashboardSpec
} from '@oztix/roadie-core/dashboard'

import { DashboardView } from '.'
import { cardTable } from '../tables/cardTable'

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
  rows: [{ name: 'Lampshade Disco' }],
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
      within(group).getByRole('button', { name: /, Period$/ })
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
    fireEvent.click(screen.getByRole('button', { name: /, Period$/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Previous year' })
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
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

  it('treats an app’s own comparison as no Roadie comparison', () => {
    render(
      <DashboardView
        spec={dashboard({
          range: 'this-month',
          compare: 'similar',
          history: 'partial'
        })}
        periodProps={{
          ...periodProps,
          compareOptions: [
            'previous-period',
            { value: 'similar', label: 'Similar venues' }
          ]
        }}
      />
    )
    expect(deltaIn('Tickets sold')).toBeNull()
    expect(contextIn('Tickets sold')).toBeUndefined()
    expect(deltaIn('Sell-through')).toHaveTextContent('9 pts')
    expect(
      screen.getByRole('button', { name: /, Period$/ })
    ).toHaveAccessibleName(/vs similar venues, Period$/)
  })

  it('hands an app’s own comparison to the app', async () => {
    const onPeriodChange = vi.fn()
    render(
      <DashboardView
        spec={dashboard({ range: 'this-month', compare: 'previous-period' })}
        periodProps={{
          ...periodProps,
          compareOptions: [
            'previous-period',
            { value: 'similar', label: 'Similar venues' }
          ]
        }}
        onPeriodChange={onPeriodChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /, Period$/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Similar venues' })
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    expect(onPeriodChange).toHaveBeenCalledWith({
      range: 'this-month',
      compare: 'similar'
    })
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

describe('DashboardView cards that set the period', () => {
  const selecting = (id: string): DashboardCard => ({
    id,
    kind: 'chart',
    size: 'full',
    label: 'Tickets sold each day',
    source: 'Oztix sales.',
    plot: {
      kind: 'line',
      data: [
        { day: '2026-10-01', sold: 120 },
        { day: '2026-10-02', sold: 180 }
      ],
      x: 'day',
      y: 'sold',
      selectsPeriod: true
    }
  })
  const withCard = (card: DashboardCard): DashboardSpec => ({
    ...dashboard({ range: 'this-month' }),
    sections: [{ title: 'Sales', cards: [card] }]
  })

  it('warns in development when the app can’t change the period', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<DashboardView spec={withCard(selecting('daily-unwired'))} />)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('"daily-unwired" sets selectsPeriod')
    )
    warn.mockRestore()
  })

  it('stays quiet when the app takes the period', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <DashboardView
        spec={withCard(selecting('daily-wired'))}
        onPeriodChange={() => {}}
      />
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('DashboardView charts that compare', () => {
  const days = ['2026-10-01', '2026-10-02', '2026-10-03']
  const charts: DashboardCard[] = (['line', 'bar'] as const).map((kind) => ({
    id: kind,
    kind: 'chart',
    size: 'md',
    label: `Daily sales ${kind}`,
    source: 'Oztix sales.',
    plot: {
      kind,
      data: days.map((day, i) => ({ day, sold: 10 + i, lastPeriod: 8 + i })),
      x: 'day',
      y: 'sold',
      comparison: { y: 'lastPeriod' }
    }
  }))
  const spec = (period?: DashboardPeriodSpec): DashboardSpec => ({
    version: 1,
    title: 'Sales',
    ...(period && { period }),
    sections: [{ title: 'Trend', cards: charts }]
  })
  const headersIn = (name: string) =>
    within(card(name))
      .queryAllByRole('columnheader', { hidden: true })
      .map((cell) => cell.textContent)

  it.each(['line', 'bar'])(
    'draws a %s card’s comparison, named by the period’s',
    (kind) => {
      render(
        <DashboardView
          spec={spec({ range: 'this-month', compare: 'previous-period' })}
          periodProps={periodProps}
        />
      )
      expect(headersIn(`Daily sales ${kind}`)).toContain('Previous period')
    }
  )

  it.each([
    ['no period', undefined],
    ['no comparison', { range: 'this-month' }],
    ['an app’s own comparison', { range: 'this-month', compare: 'similar' }],
    [
      'unavailable history',
      {
        range: 'this-month',
        compare: 'previous-year',
        history: 'unavailable'
      }
    ]
  ] as const)('leaves the comparison off with %s', (_, period) => {
    render(
      <DashboardView
        spec={spec(period as DashboardPeriodSpec | undefined)}
        periodProps={periodProps}
      />
    )
    for (const kind of ['line', 'bar'])
      expect(headersIn(`Daily sales ${kind}`)).toEqual(['Day', 'Sold'])
  })
})

describe('DashboardView charts that compare with custom dates', () => {
  const chart: DashboardCard = {
    id: 'daily',
    kind: 'chart',
    size: 'md',
    label: 'Daily sales',
    source: 'Oztix sales.',
    plot: {
      kind: 'line',
      data: [{ day: '2026-10-01', sold: 10, lastPeriod: 8 }],
      x: 'day',
      y: 'sold',
      comparison: { y: 'lastPeriod' }
    }
  }
  const withCompare = (compare: DashboardPeriodSpec['compare']) => (
    <DashboardView
      spec={{
        version: 1,
        title: 'Sales',
        period: { range: 'this-month', compare },
        sections: [{ title: 'Trend', cards: [chart] }]
      }}
      periodProps={{ ...periodProps, locale: 'en-AU' }}
    />
  )
  const headers = () =>
    within(card('Daily sales'))
      .queryAllByRole('columnheader', { hidden: true })
      .map((cell) => cell.textContent)

  it('names the comparison by its dates when they fit a series label', () => {
    render(withCompare({ start: '2026-09-01', end: '2026-09-30' }))
    expect(headers()).toEqual(['Day', 'Sold', '1 to 30 Sept 2026'])
  })

  it('names dates too long for a series label as custom dates', () => {
    render(withCompare({ start: '2025-12-15', end: '2026-01-14' }))
    expect(headers()).toEqual(['Day', 'Sold', 'Custom dates'])
  })
})

describe('DashboardView small multiples that compare', () => {
  const panels: DashboardCard = {
    id: 'venues',
    kind: 'chart',
    size: 'full',
    label: 'Sales by venue',
    source: 'Oztix sales.',
    plot: {
      kind: 'small-multiples',
      by: 'venue',
      data: ['Corner Hotel', 'Northcote Theatre'].map((venue) => ({
        venue,
        day: '2026-10-01',
        sold: 10,
        lastPeriod: 8
      })),
      chart: {
        kind: 'line',
        x: 'day',
        y: 'sold',
        comparison: { y: 'lastPeriod' }
      }
    }
  }
  const headers = (period: DashboardPeriodSpec) => {
    render(
      <DashboardView
        spec={{
          version: 1,
          title: 'Sales',
          period,
          sections: [{ title: 'Venues', cards: [panels] }]
        }}
        periodProps={periodProps}
      />
    )
    return within(card('Sales by venue'))
      .queryAllByRole('columnheader', { hidden: true })
      .map((cell) => cell.textContent)
  }

  it('draws each panel’s comparison, named by the period’s', () => {
    expect(headers({ range: 'this-month', compare: 'previous-year' })).toEqual([
      'Venue',
      'Day',
      'Sold',
      'Previous year'
    ])
  })

  it('leaves each panel’s comparison off with no comparison', () => {
    expect(headers({ range: 'this-month' })).toEqual(['Venue', 'Day', 'Sold'])
  })
})

describe('DashboardView card actions', () => {
  it('get the card as drawn, so a CSV of it matches its Table view', () => {
    const tables: (string | undefined)[][] = []
    render(
      <DashboardView
        spec={{
          version: 1,
          title: 'Sales',
          period: { range: 'this-month' },
          sections: [
            {
              title: 'Trend',
              cards: [
                {
                  id: 'daily',
                  kind: 'chart',
                  size: 'md',
                  label: 'Daily sales',
                  source: 'Oztix sales.',
                  plot: {
                    kind: 'line',
                    data: [{ day: '2026-10-01', sold: 10, lastPeriod: 8 }],
                    x: 'day',
                    y: 'sold',
                    comparison: { y: 'lastPeriod' }
                  }
                }
              ]
            }
          ]
        }}
        periodProps={periodProps}
        cardActions={(shown) => {
          tables.push(cardTable(shown)?.columns.map((c) => c.header) ?? [])
          return null
        }}
      />
    )
    expect(tables.at(-1)).toEqual(['Day', 'Sold'])
  })
})
