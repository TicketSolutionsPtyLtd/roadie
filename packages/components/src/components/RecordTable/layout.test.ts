import { describe, expect, it } from 'vitest'

import type { RecordField } from '@oztix/roadie-core/records'

import { columnLayout, columnWidths } from './layout'
import type { RecordColumnWidth, RecordTableColumn } from './types'

const text = (key: string, label = key): RecordField => ({
  key,
  label,
  type: 'text'
})

const column = (
  key: string,
  options: Partial<RecordTableColumn> & { field?: RecordField } = {}
): RecordTableColumn => ({ key, field: text(key), ...options })

const fixed = (key: string, min: number, grow?: number, pin = false) =>
  column(key, { width: { min, grow }, pin })

const UTC = 'UTC'

describe('columnLayout', () => {
  it('builds one grid template shared by header and rows', () => {
    const columns = [fixed('a', 10, 2), fixed('b', 6)]
    expect(columnLayout(columns, columnWidths(columns, [], UTC))).toEqual({
      template: 'minmax(10rem, 2fr) 6rem',
      minWidth: 16,
      pinnedStart: [undefined, undefined]
    })
  })

  it('fixes pinned columns that another pinned column follows', () => {
    const columns = [
      fixed('a', 12, 2, true),
      fixed('b', 8, 1, true),
      fixed('c', 6, 1)
    ]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe('12rem minmax(8rem, 1fr) minmax(6rem, 1fr)')
    expect(layout.pinnedStart).toEqual([0, 12, undefined])
  })

  it('lets a lone pinned column grow like any other', () => {
    const columns = [fixed('a', 10, 2, true), fixed('b', 10, 2)]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe('minmax(10rem, 2fr) minmax(10rem, 2fr)')
    expect(layout.pinnedStart).toEqual([0, undefined])
  })
})

describe('columnWidths', () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    show: `Ball Park Music at The Lantern Room ${index}`,
    city: index % 2 ? 'Brisbane' : 'Perth',
    sold: index * 37,
    state: 'x',
    starts: '2026-11-27T19:30:00+11:00'
  }))

  const widths = (columns: RecordTableColumn[]) =>
    columnWidths(columns, rows, 'Australia/Sydney')

  it('gives longer content more of the spare width', () => {
    const [show, city, sold] = widths([
      column('show', { field: text('show', 'Show') }),
      column('city', { field: text('city', 'City') }),
      column('sold', { field: { key: 'sold', label: 'Sold', type: 'number' } })
    ])
    expect(show!.grow).toBeGreaterThan(city!.grow! * 3)
    expect(city!.grow).toBeGreaterThanOrEqual(sold!.grow!)
    expect(show!.min).toBeGreaterThan(city!.min)
  })

  it('sizes a status by its badge label, not its key', () => {
    const [status] = widths([
      column('state', {
        field: {
          key: 'state',
          label: 'St',
          type: 'option',
          status: { x: { intent: 'success', label: 'Awaiting payment' } }
        }
      })
    ])
    expect(status!.grow).toBeGreaterThanOrEqual('Awaiting payment'.length)
  })

  it('sizes a date by the text it shows', () => {
    const [starts] = widths([
      column('starts', {
        field: { key: 'starts', label: 'Starts', type: 'date', moment: 'event' }
      })
    ])
    expect(starts!.grow).toBeGreaterThanOrEqual(
      'Fri 27 Nov 2026, 7:30pm'.length
    )
    expect(starts!.min).toBeGreaterThanOrEqual(
      'Fri 27 Nov 2026, 7:30pm'.length * 0.55
    )
  })

  it('keeps short text whole and only lets long text truncate', () => {
    const [show, city] = widths([
      column('show', { field: text('show', 'Show') }),
      column('city', { field: text('city', 'City') })
    ])
    const full = (characters: number) => characters * 0.55 + 1.25
    expect(city!.min).toBeGreaterThanOrEqual(full('Brisbane'.length))
    expect(show!.min).toBeLessThan(
      full('Ball Park Music at The Lantern Room 29'.length)
    )
  })

  it('never lets the header truncate', () => {
    const [city] = widths([
      column('city', { field: text('city', 'City of the performance') })
    ])
    expect(city!.grow).toBeGreaterThanOrEqual('City of the performance'.length)
  })

  it('keeps an explicit width', () => {
    const width: RecordColumnWidth = { min: 7 }
    expect(widths([column('show', { width })])).toEqual([width])
  })
})
