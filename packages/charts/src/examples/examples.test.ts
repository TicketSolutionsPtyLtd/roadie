import { describe, expect, it } from 'vitest'

import { validateDashboard } from '@oztix/roadie-core/dashboard'

import {
  createAudienceDashboard,
  createPortfolioDashboard,
  createShowDashboard
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
