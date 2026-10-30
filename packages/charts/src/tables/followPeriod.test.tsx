import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  DashboardCard,
  DashboardPeriodSpec
} from '@oztix/roadie-core/dashboard'

import { DashboardView } from '../DashboardView'
import { cardTable } from './cardTable'
import { followPeriod } from './followPeriod'

const rows = [
  { venue: 'Kazoo Hollow Room', day: '2026-10-01', sold: 10, last: 8 }
]
const compared = { x: 'day', y: 'sold', comparison: { y: 'last' } } as const

const daily = (kind: 'line' | 'bar'): DashboardCard => ({
  id: kind,
  kind: 'chart',
  size: 'md',
  label: `Daily sales ${kind}`,
  source: 'Oztix sales.',
  plot: { kind, data: rows, ...compared }
})

const sold: DashboardCard = {
  id: 'sold',
  kind: 'stat',
  size: 'stat',
  label: 'Tickets sold',
  value: 1842,
  delta: { value: 214, comparison: true }
}

const cards: DashboardCard[] = [
  daily('line'),
  daily('bar'),
  {
    id: 'venues',
    kind: 'chart',
    size: 'full',
    label: 'Sales by venue',
    source: 'Oztix sales.',
    plot: {
      kind: 'small-multiples',
      by: 'venue',
      data: rows,
      chart: { kind: 'line', ...compared }
    }
  },
  sold
]

function comparisonOf(card: DashboardCard) {
  if (card.kind !== 'chart') return undefined
  const { plot } = card
  if (plot.kind === 'small-multiples') return plot.chart.comparison
  if (plot.kind === 'line' || plot.kind === 'bar') return plot.comparison
}

function drawn(period: DashboardPeriodSpec | undefined, locale?: string) {
  const shown = new Map<string, DashboardCard>()
  render(
    <DashboardView
      spec={{
        version: 1,
        title: 'Sales',
        ...(period && { period }),
        sections: [{ title: 'Trend', cards }]
      }}
      periodProps={{ today: '2026-10-07', locale }}
      cardActions={(card) => {
        shown.set(card.id, card)
        return null
      }}
    />
  )
  return shown
}

const CASES: [string, DashboardPeriodSpec | undefined, string | undefined][] = [
  [
    'the previous period',
    { range: 'this-month', compare: 'previous-period' },
    'Previous period'
  ],
  [
    'the previous year',
    { range: 'this-month', compare: 'previous-year' },
    'Previous year'
  ],
  [
    'partial history',
    { range: 'this-month', compare: 'previous-period', history: 'partial' },
    'Previous period'
  ],
  ['no period', undefined, undefined],
  ['no comparison', { range: 'this-month' }, undefined],
  [
    'an app’s own comparison',
    { range: 'this-month', compare: 'similar' },
    undefined
  ],
  [
    'unavailable history',
    {
      range: 'this-month',
      compare: 'previous-year',
      history: 'unavailable'
    },
    undefined
  ],
  [
    'custom dates that fit a series label',
    {
      range: 'this-month',
      compare: { start: '2026-09-01', end: '2026-10-03' }
    },
    '1 Sept to 3 Oct 2026'
  ],
  [
    'custom dates too long for a series label',
    {
      range: 'this-month',
      compare: { start: '2026-09-01', end: '2026-10-13' }
    },
    'Custom dates'
  ]
]

const where = { locale: 'en-AU' }

describe('followPeriod', () => {
  it.each(CASES)('follows %s', (_, period, label) => {
    for (const card of cards.filter((card) => card.kind === 'chart'))
      expect(comparisonOf(followPeriod(card, period, where))).toEqual(
        label ? { y: 'last', label } : undefined
      )
  })

  it('leaves cards other than charts as they are', () => {
    expect(
      followPeriod(sold, { range: 'this-month', compare: 'previous-period' })
    ).toBe(sold)
  })

  it.each(CASES)(
    'returns the cards DashboardView draws with %s',
    (_, period) => {
      const shown = drawn(period, where.locale)
      for (const card of cards)
        expect(followPeriod(card, period, where)).toEqual(shown.get(card.id))
    }
  )

  it('names dates it can’t read as custom dates, with a development error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const followed = followPeriod(daily('line'), {
      range: 'this-month',
      compare: { start: 'not a date', end: '2026-09-30' }
    })
    expect(comparisonOf(followed)).toEqual({ y: 'last', label: 'Custom dates' })
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(/^Roadie: couldn't describe the comparison/)
    )
    error.mockRestore()
  })

  it('gives a server CSV the Table view’s columns', () => {
    const columns = (period: DashboardPeriodSpec) =>
      cardTable(followPeriod(daily('line'), period))?.columns.map(
        (c) => c.header
      )
    expect(
      columns({ range: 'this-month', compare: 'previous-period' })
    ).toEqual(['Day', 'Sold', 'Previous period'])
    expect(columns({ range: 'this-month' })).toEqual(['Day', 'Sold'])
  })
})
