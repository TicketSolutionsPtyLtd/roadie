import { describe, expect, it } from 'vitest'

import type { TableColumn, TableRow } from './schema'
import { isSummable, resolveTableTotals } from './totals'
import { validateDashboard } from './validate'

const columns: TableColumn[] = [
  { key: 'show', header: 'Show', kind: 'text' },
  { key: 'sold', header: 'Sold', kind: 'number' },
  { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' },
  { key: 'share', header: 'Share', kind: 'number', format: 'percent' },
  { key: 'pace', header: 'Pace', kind: 'delta' },
  { key: 'capacity', header: 'Capacity', kind: 'number', total: false }
]
const rows: TableRow[] = [
  { show: 'Ocean Alley', sold: 10, gross: 0.1, share: 0.4, capacity: 900 },
  { show: 'Ball Park Music', sold: 'Soon', gross: null, share: 0.6 },
  { show: 'Julia Jacklin', sold: 5, gross: 0.2, share: 0, capacity: 400 }
]

describe('isSummable', () => {
  it('sums counts and amounts, not shares, deltas or opted out columns', () => {
    expect(columns.filter(isSummable).map((column) => column.key)).toEqual([
      'sold',
      'gross'
    ])
  })
})

describe('resolveTableTotals', () => {
  it('sums count and currency columns over every row', () => {
    expect(resolveTableTotals(columns, rows, 'sum')).toEqual({
      label: 'Totals for 3 records',
      values: { sold: 15, gross: 0.3 }
    })
  })

  it('rounds a currency sum to cents', () => {
    const { values } = resolveTableTotals(
      [columns[2]!],
      [{ gross: 10.005 }, { gross: 0.001 }],
      'sum'
    )
    expect(values.gross).toBe(10.01)
  })

  it('rounds a negative currency sum away from zero, as its cells do', () => {
    const { values } = resolveTableTotals(
      [columns[2]!],
      [{ gross: -1.125 }],
      'sum'
    )
    expect(values.gross).toBe(-1.13)
  })

  it('rounds a tiny negative currency sum to zero, not minus zero', () => {
    const { values } = resolveTableTotals(
      [columns[2]!],
      [{ gross: -0.001 }],
      'sum'
    )
    expect(Object.is(values.gross, 0)).toBe(true)
  })

  it('keeps a total for any column key, __proto__ included', () => {
    const { values } = resolveTableTotals(
      [{ key: '__proto__', header: 'Sold', kind: 'number' }],
      [JSON.parse('{"__proto__": 4}'), JSON.parse('{"__proto__": 5}')],
      'sum'
    )
    expect(Object.hasOwn(values, '__proto__')).toBe(true)
    expect(values['__proto__']).toBe(9)
  })

  it('names the rows and counts them in house format', () => {
    const many = Array.from({ length: 1240 }, () => rows[0]!)
    expect(
      resolveTableTotals(columns, many, {}, { one: 'event', other: 'events' })
        .label
    ).toBe('Totals for 1,240 events')
    expect(
      resolveTableTotals(columns, [rows[0]!], 'sum', {
        one: 'event',
        other: 'events'
      }).label
    ).toBe('Totals for 1 event')
  })

  it('uses explicit values and their label as given, summing nothing', () => {
    expect(
      resolveTableTotals(columns, rows, {
        label: 'Season to date',
        values: { gross: 90000 }
      })
    ).toEqual({ label: 'Season to date', values: { gross: 90000 } })
  })

  it("never counts rows it was given for values that aren't theirs", () => {
    expect(
      resolveTableTotals(columns, rows, { values: { gross: 9 } }).label
    ).toBe('Totals')
  })

  it('leaves a column with no numbers out', () => {
    expect(
      resolveTableTotals(columns, [{ show: 'Ocean Alley', sold: null }], 'sum')
        .values
    ).toEqual({})
  })
})

describe('validateDashboard totals rows', () => {
  const reportTable = (
    totals: unknown,
    gross: Record<string, unknown> = { kind: 'number' }
  ) => ({
    version: 1,
    title: 'Reports',
    sections: [
      {
        title: 'This month',
        cards: [
          {
            id: 'report',
            kind: 'table',
            size: 'full',
            label: 'Shows this month',
            source: 'Oztix sales.',
            columns: [
              { key: 'show', header: 'Show', kind: 'text' },
              { key: 'gross', header: 'Gross', format: 'currency', ...gross }
            ],
            rows: [{ show: 'Ocean Alley', gross: 1200 }],
            totals
          }
        ]
      }
    ]
  })

  it.each([
    'sum',
    { label: 'Totals for 12 events' },
    { label: 'Season to date', values: { gross: 9 } }
  ])('accepts %j', (totals) => {
    const result = validateDashboard(reportTable(totals))
    expect(result.ok).toBe(true)
    expect(result.problems).toEqual([])
  })

  it('accepts a column that opts out of the sum', () => {
    expect(
      validateDashboard(
        reportTable(undefined, { kind: 'number', total: false })
      ).ok
    ).toBe(true)
  })

  it('rejects an unknown form', () => {
    expect(validateDashboard(reportTable('average')).ok).toBe(false)
  })

  it('needs a label with values, to say what they cover', () => {
    const result = validateDashboard(reportTable({ values: { gross: 9 } }))
    expect(result.ok).toBe(false)
    expect(result.problems).toContainEqual({
      path: 'sections[0].cards[0].totals.label',
      message:
        'Give a label with values, so readers know what the figures cover',
      severity: 'error'
    })
  })

  it('rejects a value for a column the table lacks', () => {
    const result = validateDashboard(
      reportTable({ label: 'All shows', values: { gross: 9, net: 4 } })
    )
    expect(result.ok).toBe(false)
    expect(result.problems).toContainEqual({
      path: 'sections[0].cards[0].totals.values.net',
      message: 'No column has the key "net"',
      severity: 'error'
    })
  })

  it('warns when there is nothing to sum', () => {
    expect(
      validateDashboard(reportTable('sum', { kind: 'delta' })).problems
    ).toEqual([
      {
        path: 'sections[0].cards[0].totals',
        message:
          'No number column to sum, so the row shows only its label. Pass values',
        severity: 'warning'
      }
    ])
  })

  it('warns when the first column, which holds the label, is a sum', () => {
    const table = reportTable('sum')
    const card = table.sections[0]!.cards[0]!
    card.columns = [card.columns[1]!, card.columns[0]!]
    expect(validateDashboard(table).problems).toEqual([
      {
        path: 'sections[0].cards[0].totals',
        message:
          'The first column holds the label, so its sum never shows. Lead with a text column',
        severity: 'warning'
      }
    ])
  })

  it('reads only the values given for the first column', () => {
    const table = reportTable({ label: 'All shows', values: { gross: 9 } })
    const card = table.sections[0]!.cards[0]!
    card.columns = [
      { ...card.columns[0]!, key: 'constructor' },
      card.columns[1]!
    ]
    expect(validateDashboard(table).problems).toEqual([])
  })

  it('checks the label copy', () => {
    expect(
      validateDashboard(reportTable({ label: 'Totals – all shows' })).problems
    ).toContainEqual(
      expect.objectContaining({ path: 'sections[0].cards[0].totals.label' })
    )
  })
})
