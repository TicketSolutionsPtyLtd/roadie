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

const withoutKey = <T extends Record<string, unknown>>(
  object: T,
  key: keyof T
) =>
  Object.fromEntries(
    Object.entries(object).filter(([k]) => k !== key)
  ) as Partial<T>

describe('dashboardSchema', () => {
  it('accepts only chart tokens as legend colours', () => {
    const withLegendColor = (color: string) =>
      dashboardSchema.safeParse(
        spec([{ ...chart, legend: [{ label: 'Similar shows', color }] }])
      ).success
    expect(withLegendColor('var(--chart-band)')).toBe(true)
    expect(withLegendColor('var(--chart-1)')).toBe(true)
    for (const color of ['url(https://example.com/x.svg)', 'red', '#fff'])
      expect(withLegendColor(color)).toBe(false)
  })

  it('accepts a valid description', () => {
    expect(dashboardSchema.safeParse(spec([stat, chart])).success).toBe(true)
  })

  it('rejects an unknown card kind', () => {
    expect(
      dashboardSchema.safeParse(spec([{ ...stat, kind: 'pie' }])).success
    ).toBe(false)
  })

  it('requires a source and table on chart cards', () => {
    expect(
      dashboardSchema.safeParse(spec([withoutKey(chart, 'source')])).success
    ).toBe(false)
    expect(
      dashboardSchema.safeParse(spec([withoutKey(chart, 'table')])).success
    ).toBe(false)
  })

  it.each(['javascript:alert(1)', 'data:image/svg+xml,<svg/>', 'vbscript:x'])(
    'rejects unsafe plot src %s',
    (src) => {
      const card = { ...chart, plot: { ...chart.plot, src } }
      expect(dashboardSchema.safeParse(spec([card])).success).toBe(false)
    }
  )

  it('rejects an unsafe src on a plot rendition', () => {
    const card = {
      ...chart,
      plot: { ...chart.plot, narrow: { src: 'javascript:alert(1)' } }
    }
    expect(dashboardSchema.safeParse(spec([card])).success).toBe(false)
  })

  it('accepts narrow and wide plot renditions', () => {
    const card = {
      ...chart,
      plot: {
        ...chart.plot,
        narrow: { src: '/charts/pace-narrow-light.svg' },
        wide: { src: '/charts/pace-wide-light.svg', srcDark: '/p-dark.svg' }
      }
    }
    expect(dashboardSchema.safeParse(spec([card])).success).toBe(true)
  })

  it('accepts a reserved data binding', () => {
    const card = { ...stat, data: { source: 'oztix.sales', params: { id: 1 } } }
    expect(dashboardSchema.safeParse(spec([card])).success).toBe(true)
  })

  it('rejects an unknown key on a card', () => {
    const result = dashboardSchema.safeParse(
      spec([{ ...stat, lable: 'Tickets sold' }])
    )
    expect(result.success).toBe(false)
    if (result.success) return
    const issue = result.error.issues.find((issue) =>
      issue.message.includes('lable')
    )
    expect(issue?.path.join('.')).toMatch(/cards\.0$/)
  })

  it('exports JSON Schema for tool inputs', () => {
    expect(dashboardJsonSchema).toMatchObject({ type: 'object' })
    expect(JSON.stringify(dashboardJsonSchema)).toContain('"stat"')
  })
})
