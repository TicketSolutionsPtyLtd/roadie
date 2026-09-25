import { describe, expect, it } from 'vitest'

import { validateDashboard } from '@oztix/roadie-core/dashboard'

import { createPortfolioDashboard, createShowDashboard } from '.'

describe('reference dashboards', () => {
  it.each([
    ['show', createShowDashboard()],
    ['portfolio', createPortfolioDashboard()]
  ])('the %s dashboard validates with no problems', (_, spec) => {
    expect(validateDashboard(spec).problems).toEqual([])
  })

  it('prefixes static assets', () => {
    const spec = createShowDashboard('/roadie')
    expect(JSON.stringify(spec)).toContain(
      '/roadie/charts/pace-ahead-light.svg'
    )
  })
})
