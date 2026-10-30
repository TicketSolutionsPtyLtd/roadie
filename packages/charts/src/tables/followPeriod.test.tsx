import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type {
  DashboardCard,
  DashboardPeriodSpec
} from '@oztix/roadie-core/dashboard'

import { DashboardView } from '../DashboardView'
import { cardTable } from './cardTable'
import { followPeriod } from './followPeriod'

const rows = [{ venue: 'Corner Hotel', day: '2026-10-01', sold: 10, last: 8 }]
const compared = { x: 'day', y: 'sold', comparison: { y: 'last' } } as const

const daily = (kind: 'line' | 'bar'): DashboardCard => ({
  id: kind,
  kind: 'chart',
  size: 'md',
  label: `Daily sales ${kind}`,
  source: 'Oztix sales.',
  plot: { kind, data: rows, ...compared }
})

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
  {
    id: 'sold',
    kind: 'stat',
    size: 'stat',
    label: 'Tickets sold',
    value: 1842,
    delta: { value: 214, comparison: true }
  }
]

function comparisonLabel(card: DashboardCard) {
  if (card.kind !== 'chart') return 'not a chart'
  const { plot } = card
  if (plot.kind === 'small-multiples') return plot.chart.comparison?.label
  if (plot.kind === 'line' || plot.kind === 'bar') return plot.comparison?.label
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

describe('followPeriod', () => {
  it.each<[string, DashboardPeriodSpec | undefined, string | undefined]>([
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
  ])('draws each card as DashboardView does with %s', (_, period, label) => {
    const where = { locale: 'en-AU' }
    const shown = drawn(period, where.locale)
    for (const card of cards) {
      const followed = followPeriod(card, period, where)
      expect(followed).toEqual(shown.get(card.id))
      expect(comparisonLabel(followed)).toBe(
        card.kind === 'chart' ? label : 'not a chart'
      )
    }
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
