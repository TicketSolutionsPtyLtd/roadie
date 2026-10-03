import { describe, expect, it } from 'vitest'

import { showFields } from '../Records/testUtils'
import type { TestShow } from '../Records/testUtils'
import { shownColumns, tableColumns } from './columns'

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
