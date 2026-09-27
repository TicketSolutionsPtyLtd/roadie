import { describe, expect, it } from 'vitest'

import { onSaleExample } from '../BarChart/examples'
import { barChartTable } from '../BarChart/table'
import { cardTable } from './cardTable'

const columns = [{ key: 'day', header: 'Day', kind: 'text' as const }]
const rows = [{ day: 'Fri 27 Nov' }]
const base = { id: 'orders', size: 'md', label: 'Orders' } as const
const plot = { kind: 'bar', ...onSaleExample } as const

describe('cardTable', () => {
  it('derives a chart card table from its plot', () => {
    expect(
      cardTable({ ...base, kind: 'chart', source: 'Oztix sales.', plot })
    ).toEqual(barChartTable(onSaleExample))
  })

  it('prefers a chart card table over the plot', () => {
    expect(
      cardTable({
        ...base,
        kind: 'chart',
        source: 'Oztix sales.',
        plot,
        table: { columns, rows }
      })
    ).toEqual({ columns, rows })
  })

  it('reads a table card rows', () => {
    expect(
      cardTable({
        ...base,
        kind: 'table',
        source: 'Oztix sales.',
        columns,
        rows
      })
    ).toEqual({ columns, rows })
  })

  it('has nothing for a stat', () => {
    expect(cardTable({ ...base, kind: 'stat', value: 1464 })).toBeUndefined()
  })
})
