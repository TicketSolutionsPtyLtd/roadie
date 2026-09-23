import { describe, expect, it } from 'vitest'

import { dashboardJsonSchema, dashboardSchema } from './schema'

const stat = {
  id: 'sold',
  kind: 'stat',
  size: 'stat',
  label: 'Tickets sold',
  value: 1842,
  delta: { value: 214, goodWhen: 'up' },
  context: 'This week, of 2,400',
  trend: [40, 62, 70, 88, 95]
}

const chart = {
  id: 'pace',
  kind: 'chart',
  size: 'lg',
  label: 'Sales pace',
  value: 0.61,
  format: 'percent',
  plot: { kind: 'static', src: '/charts/pace-light.svg', alt: 'Sales pace' },
  table: {
    columns: [{ key: 'day', header: 'Days to show', kind: 'number' }],
    rows: [{ day: 90 }]
  },
  source: 'Oztix sales. 38 similar shows.'
}

const spec = (cards: unknown[]) => ({
  version: 1,
  title: 'Ball Park Music at The Lantern Room',
  sections: [{ title: 'At a glance', cards }]
})

describe('dashboardSchema', () => {
  it('accepts a valid description', () => {
    expect(dashboardSchema.safeParse(spec([stat, chart])).success).toBe(true)
  })

  it('rejects an unknown card kind', () => {
    expect(
      dashboardSchema.safeParse(spec([{ ...stat, kind: 'pie' }])).success
    ).toBe(false)
  })

  it('requires a source and table on chart cards', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source, ...noSource } = chart
    expect(dashboardSchema.safeParse(spec([noSource])).success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { table, ...noTable } = chart
    expect(dashboardSchema.safeParse(spec([noTable])).success).toBe(false)
  })

  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'vbscript:x'])(
    'rejects unsafe plot src %s',
    (src) => {
      const card = { ...chart, plot: { ...chart.plot, src } }
      expect(dashboardSchema.safeParse(spec([card])).success).toBe(false)
    }
  )

  it('accepts a reserved data binding', () => {
    const card = { ...stat, data: { source: 'oztix.sales', params: { id: 1 } } }
    expect(dashboardSchema.safeParse(spec([card])).success).toBe(true)
  })

  it('exports JSON Schema for tool inputs', () => {
    expect(dashboardJsonSchema).toMatchObject({ type: 'object' })
    expect(JSON.stringify(dashboardJsonSchema)).toContain('"stat"')
  })
})
