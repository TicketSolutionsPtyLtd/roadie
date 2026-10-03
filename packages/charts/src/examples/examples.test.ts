import { describe, expect, it } from 'vitest'

import { validateDashboard } from '@oztix/roadie-core/dashboard'

import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard,
  portfolioDates
} from '.'

const dashboards = [
  ['show', createShowDashboard()],
  ['portfolio', createPortfolioDashboard()],
  ['audience', createAudienceDashboard()]
] as const

const chartCards = (spec: ReturnType<typeof createShowDashboard>) =>
  spec.sections.flatMap((s) => s.cards).filter((c) => c.kind === 'chart')

describe('reference dashboards', () => {
  it.each(dashboards)(
    'the %s dashboard validates with no problems',
    (_, spec) => {
      expect(validateDashboard(spec).problems).toEqual([])
    }
  )

  it.each(dashboards)(
    'the %s dashboard has no static plots left',
    (_, spec) => {
      expect(chartCards(spec).map((c) => c.plot.kind)).not.toContain('static')
    }
  )

  it.each(dashboards)('the %s dashboard is plain JSON', (_, spec) => {
    expect(JSON.parse(JSON.stringify(spec))).toEqual(spec)
  })

  it('the audience dashboard covers demographics, the funnel, lead time and where buyers live', () => {
    const kinds = chartCards(createAudienceDashboard()).map((c) => c.plot.kind)
    expect(kinds).toEqual(
      expect.arrayContaining([
        'stacked-bars',
        'funnel',
        'histogram',
        'ranked-bars'
      ])
    )
  })
})

type Spec = ReturnType<typeof createPortfolioDashboard>
type Period = Parameters<typeof createPortfolioDashboard>[0]

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0)

const tile = (spec: Spec, id: string) => {
  const card = spec.sections.flatMap((s) => s.cards).find((c) => c.id === id)
  if (card?.kind !== 'stat') throw new Error(`No stat card ${id}`)
  return card
}

const PERIODS: [string, NonNullable<Period>][] = [
  ['today', { range: 'today', compare: 'previous-period' }],
  ['last month', { range: 'last-month', compare: 'previous-period' }],
  [
    'quarter to date, previous year',
    {
      range: { period: 'quarter', offset: 0, toDate: true },
      compare: 'previous-year'
    }
  ],
  [
    'past 90 days, no comparison',
    { range: { direction: 'past', amount: 90, unit: 'day' } }
  ],
  [
    'custom dates',
    {
      range: { start: '2026-09-01', end: '2026-09-14' },
      compare: { start: '2026-08-18', end: '2026-08-31' }
    }
  ]
]

describe('the portfolio dashboard period', () => {
  it('defaults to the past 30 days against the previous period', () => {
    expect(createPortfolioDashboard().period).toEqual({
      range: { direction: 'past', amount: 30, unit: 'day' },
      compare: 'previous-period'
    })
  })

  it('compares the period’s sales with the previous period', () => {
    const sold = tile(createPortfolioDashboard(), 'tickets')
    expect(sold.value).toBe(2531)
    expect(sold.delta).toEqual({
      value: 0.04,
      format: 'percent',
      comparison: true
    })
    expect(sold.trend).toHaveLength(30)
  })

  it('leaves the context line to the comparison', () => {
    const cards = createPortfolioDashboard().sections.flatMap((s) => s.cards)
    for (const card of cards)
      if (card.kind !== 'note' && card.delta?.comparison)
        expect(card.context).toBeUndefined()
  })

  it('keeps refunds falling and gross rising on the previous period', () => {
    const spec = createPortfolioDashboard()
    expect(tile(spec, 'refunds').delta).toEqual({
      value: -0.3,
      format: 'points',
      goodWhen: 'down',
      comparison: true
    })
    expect(tile(spec, 'gross').delta?.value).toBeGreaterThan(0)
  })

  it.each(PERIODS)('validates for %s', (_, period) => {
    expect(
      validateDashboard(createPortfolioDashboard(period)).problems
    ).toEqual([])
  })

  it('counts only the days in the period', () => {
    const lastMonth = tile(
      createPortfolioDashboard({
        range: 'last-month',
        compare: 'previous-period'
      }),
      'tickets'
    )
    expect(lastMonth.value).toBe(2111)
    expect(lastMonth.trend).toHaveLength(30)
  })

  it('sums weeks once the period runs past a month', () => {
    const spec = createPortfolioDashboard({
      range: { direction: 'past', amount: 12, unit: 'month' },
      compare: 'previous-period'
    })
    expect(tile(spec, 'tickets').value).toBe(6377)
    expect(tile(spec, 'tickets').trend).toHaveLength(13)
  })

  it('has nothing to compare a year back, before the shows went on sale', () => {
    const spec = createPortfolioDashboard({
      range: 'last-month',
      compare: 'previous-year'
    })
    expect(spec.period?.history).toBe('unavailable')
  })

  it('has not enough history when the comparison starts before the data', () => {
    const spec = createPortfolioDashboard({
      range: { start: '2026-08-01', end: '2026-08-31' },
      compare: 'previous-period'
    })
    expect(spec.period?.history).toBe('partial')
  })

  it('has no history to report without a comparison', () => {
    const spec = createPortfolioDashboard({ range: 'last-month' })
    expect(spec.period).toEqual({ range: 'last-month' })
  })

  it('shares its dates with the period toolbar', () => {
    expect(portfolioDates).toEqual({
      today: '2026-10-15',
      timeZone: 'Australia/Melbourne',
      dataStart: '2026-07-20',
      dataEnd: '2026-10-15'
    })
  })

  it('adds up every day of the period in its trend', () => {
    const sold = tile(
      createPortfolioDashboard({ range: { period: 'quarter', offset: -1 } }),
      'tickets'
    )
    expect(sum(sold.trend ?? [])).toBe(sold.value)
  })

  it('compares a day’s average when the comparison is a different length', () => {
    const sold = tile(
      createPortfolioDashboard({
        range: { direction: 'past', amount: 30, unit: 'day' },
        compare: { start: '2026-09-06', end: '2026-09-15' }
      }),
      'tickets'
    )
    expect(sold.delta?.value).toBeCloseTo(2531 / 30 / (734 / 10) - 1, 2)
  })

  it('has nothing to compare when the comparison holds no sales', () => {
    const spec = createPortfolioDashboard({
      range: { start: '2026-08-01', end: '2026-08-10' },
      compare: { start: '2026-01-01', end: '2026-03-01' }
    })
    expect(spec.period?.history).toBe('unavailable')
  })

  it('shows the period tiles empty when the period holds no sales', () => {
    const spec = createPortfolioDashboard({
      range: { start: '2026-01-01', end: '2026-03-01' },
      compare: { start: '2026-08-01', end: '2026-08-10' }
    })
    for (const id of ['tickets', 'gross', 'refunds'])
      expect(tile(spec, id).state).toBe('empty')
    expect(validateDashboard(spec).problems).toEqual([])
  })
})
