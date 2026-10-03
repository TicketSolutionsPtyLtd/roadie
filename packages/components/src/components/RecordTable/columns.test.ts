import { describe, expect, it } from 'vitest'

import { showFields } from '../Records/testUtils'
import type { TestShow } from '../Records/testUtils'
import {
  columnSettings,
  shownColumns,
  tableColumns,
  tableColumnsLayout
} from './columns'

const column = tableColumns<TestShow>(showFields)

describe('tableColumns', () => {
  it('presents a field, keeping its definition', () => {
    const gross = column.field('gross', { width: { min: 7 } })
    expect(gross).toEqual({
      key: 'gross',
      field: showFields[3],
      width: { min: 7 }
    })
  })

  it('takes presentation options only', () => {
    const show = column.field('show', { pin: true })
    expect(show.pin).toBe(true)
    expect(column.field('city').pin).toBeUndefined()
  })

  it('throws for a key with no field', () => {
    const loose = tableColumns<TestShow & { venue: string }>(showFields)
    expect(() => loose.field('venue')).toThrow(/no field "venue"/)
  })
})

describe('shownColumns', () => {
  const columns = [
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('sold'),
    column.field('gross')
  ]
  const keys = (layout: Parameters<typeof shownColumns>[1]) =>
    shownColumns(columns, layout).map((c) => c.key)

  it('shows every column in order by default', () => {
    expect(keys({ type: 'table' })).toEqual(['show', 'city', 'sold', 'gross'])
  })

  it('reorders by the view, unnamed columns after, unknown keys ignored', () => {
    expect(
      keys({ type: 'table', columns: { order: ['gross', 'nope', 'city'] } })
    ).toEqual(['show', 'gross', 'city', 'sold'])
  })

  it('hides columns, but never a pinned one, and keeps pinned columns first', () => {
    expect(
      keys({
        type: 'table',
        columns: { order: ['sold', 'show'], hidden: ['show', 'city'] }
      })
    ).toEqual(['show', 'sold', 'gross'])
  })

  it('reads any other layout as the default', () => {
    expect(keys({ type: 'grid', fields: ['city'] })).toEqual([
      'show',
      'city',
      'sold',
      'gross'
    ])
  })
})

describe('columnSettings', () => {
  const columns = [
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('sold'),
    column.field('gross')
  ]
  const listed = (layout: Parameters<typeof columnSettings>[1]) => {
    const settings = columnSettings(columns, layout)
    return {
      pinned: settings.pinned.map((c) => c.key),
      columns: settings.columns.map(
        ({ column, hidden }) => `${column.key}${hidden ? ' (hidden)' : ''}`
      )
    }
  }

  it('lists pinned columns apart and the rest in order', () => {
    expect(listed({ type: 'table' })).toEqual({
      pinned: ['show'],
      columns: ['city', 'sold', 'gross']
    })
  })

  it('keeps hidden columns in their place in the view order', () => {
    expect(
      listed({
        type: 'table',
        columns: { order: ['gross', 'show'], hidden: ['sold', 'show'] }
      })
    ).toEqual({
      pinned: ['show'],
      columns: ['gross', 'city', 'sold (hidden)']
    })
  })
})

describe('tableColumnsLayout', () => {
  const columns = [
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('sold'),
    column.field('gross')
  ]

  it.each([
    [
      'leaves out the default order and no hidden columns',
      { order: ['city', 'sold', 'gross'], hidden: [] },
      { type: 'table' }
    ],
    [
      'writes the whole order of the columns that move',
      { order: ['gross', 'city', 'sold'], hidden: [] },
      { type: 'table', columns: { order: ['gross', 'city', 'sold'] } }
    ],
    [
      'writes hidden columns in column order',
      { order: ['city', 'sold', 'gross'], hidden: ['gross', 'city'] },
      { type: 'table', columns: { hidden: ['city', 'gross'] } }
    ],
    [
      'drops pinned and unknown keys',
      {
        order: ['show', 'nope', 'sold', 'city', 'gross'],
        hidden: ['show', 'nope']
      },
      { type: 'table', columns: { order: ['sold', 'city', 'gross'] } }
    ],
    [
      'keeps columns the order leaves out after it, as the table shows them',
      { order: ['gross'], hidden: [] },
      { type: 'table', columns: { order: ['gross', 'city', 'sold'] } }
    ]
  ])('%s', (_, settings, layout) => {
    expect(tableColumnsLayout(columns, settings)).toEqual(layout)
  })

  it('round-trips through shownColumns and columnSettings', () => {
    const layout = tableColumnsLayout(columns, {
      order: ['sold', 'gross', 'city'],
      hidden: ['gross']
    })
    expect(shownColumns(columns, layout).map((c) => c.key)).toEqual([
      'show',
      'sold',
      'city'
    ])
    expect(
      columnSettings(columns, layout).columns.map(({ column }) => column.key)
    ).toEqual(['sold', 'gross', 'city'])
  })
})
