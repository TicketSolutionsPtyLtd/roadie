import { describe, expect, it } from 'vitest'

import { ticketTypeExample } from './examples'
import { donutChartTable } from './table'

describe('donutChartTable', () => {
  it('lists each part, its value and its share, largest first', () => {
    const table = donutChartTable({
      data: [
        { type: 'VIP', tickets: 25 },
        { type: 'GA', tickets: 75 }
      ],
      x: 'type',
      y: 'tickets'
    })
    expect(table.columns.map((c) => c.header)).toEqual([
      'Type',
      'Tickets',
      'Share'
    ])
    expect(table.rows).toEqual([
      { type: 'GA', tickets: 75, share: 0.75 },
      { type: 'VIP', tickets: 25, share: 0.25 }
    ])
  })

  it('ends with a total row', () => {
    expect(donutChartTable(ticketTypeExample).totals).toEqual({
      label: 'Total',
      values: { tickets: 2385, share: 1 }
    })
  })

  it('lists every part, even those the ring rolls into Other', () => {
    const table = donutChartTable({
      data: [60, 50, 40, 30, 20, 10].map((sold, i) => ({
        type: `Type ${i + 1}`,
        sold
      })),
      x: 'type',
      y: 'sold'
    })
    expect(table.rows).toHaveLength(6)
  })

  it('keeps a value field named share apart from the share column', () => {
    const table = donutChartTable({
      data: [
        { channel: 'Web', share: 60 },
        { channel: 'Box office', share: 40 }
      ],
      x: 'channel',
      y: 'share'
    })
    expect(table.columns.map((c) => c.header)).toEqual([
      'Channel',
      'Share',
      'Share'
    ])
    expect(new Set(table.columns.map((c) => c.key)).size).toBe(3)
    expect(table.rows[0]).toMatchObject({ channel: 'Web', share: 60 })
    expect(Object.values(table.rows[0]!)).toContain(0.6)
  })

  it('has no total row when nothing has a value', () => {
    const table = donutChartTable({
      data: [{ type: 'GA', tickets: 0 }],
      x: 'type',
      y: 'tickets'
    })
    expect(table.rows).toEqual([])
    expect(table.totals).toBeUndefined()
  })

  it('reads values in the chart format and shares to its decimal places', () => {
    const table = donutChartTable({
      ...ticketTypeExample,
      format: 'currency',
      decimals: 1
    })
    expect(table.columns.map((c) => [c.key, c.format, c.decimals])).toEqual([
      ['type', undefined, undefined],
      ['tickets', 'currency', 1],
      ['share', 'percent', 1]
    ])
  })
})
