import { describe, expect, it, vi } from 'vitest'

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

// The first and last tracks carry the frame's inset.
const inset = (rem: string, edges = 1) =>
  `calc(${rem} + ${edges} * var(--content-inset))`

describe('columnLayout', () => {
  it('builds one grid template shared by header and rows', () => {
    const columns = [fixed('a', 10, 2), fixed('b', 6)]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe(
      `minmax(${inset('10rem')}, 2fr) ${inset('6rem')}`
    )
    expect(layout.minWidth).toBe(16)
    expect(layout.pinnedStart).toEqual([undefined, undefined])
  })

  it('drops priority columns tier by tier, 3 first', () => {
    const columns = [
      fixed('a', 10, 2, true),
      column('b', { width: { min: 6 }, priority: 1 }),
      column('c', { width: { min: 5 }, priority: 3 }),
      column('d', { width: { min: 4 }, priority: 2 })
    ]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC), {
      actions: true
    })
    expect(layout.tiers).toEqual([
      {
        template: `minmax(${inset('10rem')}, 2fr) 6rem 5rem 4rem ${inset('3rem')}`,
        minWidth: 28
      },
      {
        template: `minmax(${inset('10rem')}, 2fr) ${inset('3rem')}`,
        minWidth: 13
      },
      {
        template: `minmax(${inset('10rem')}, 2fr) 6rem ${inset('3rem')}`,
        minWidth: 19
      },
      {
        template: `minmax(${inset('10rem')}, 2fr) 6rem 4rem ${inset('3rem')}`,
        minWidth: 23
      }
    ])
    expect(layout.template).toBe(layout.tiers[0]!.template)
  })

  it('never hides the title column, which carries the row link', () => {
    const columns = [
      column('sold', {
        field: { key: 'sold', label: 'Sold', type: 'number' },
        width: { min: 5 }
      }),
      column('name', { narrow: 'title', priority: 1, width: { min: 5 } }),
      column('city', { priority: 1, width: { min: 5 } })
    ]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.priority).toEqual([undefined, undefined, 1])
    expect(layout.tiers[1]!.template).toBe(`${inset('5rem')} ${inset('5rem')}`)
  })

  it('warns once about a priority on a pinned column built by hand', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const columns = [
      column('name', { pin: true, priority: 2 }),
      column('city', { pin: true, priority: 1 })
    ]
    columnLayout(columns, columnWidths(columns, [], UTC))
    columnLayout(columns, columnWidths(columns, [], UTC))
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('marks the last shown cell at each tier, so it drops its end padding', () => {
    const columns = [
      column('a'),
      column('b', { priority: 2 }),
      column('c', { priority: 3 })
    ]
    expect(
      columnLayout(columns, columnWidths(columns, [], UTC)).lastAt
    ).toEqual([[1, 2], [3], undefined])
  })

  it('fixes pinned columns that another pinned column follows', () => {
    const columns = [
      fixed('a', 12, 2, true),
      fixed('b', 8, 1, true),
      fixed('c', 6, 1)
    ]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe(
      `${inset('12rem')} minmax(8rem, 1fr) minmax(${inset('6rem')}, 1fr)`
    )
    expect(layout.pinnedStart).toEqual([0, 12, undefined])
  })

  it('puts a pinned select track first and an actions track last', () => {
    const columns = [fixed('a', 12, 2, true), fixed('b', 6, 1)]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC), {
      select: true,
      actions: true
    })
    expect(layout.template).toBe(
      `${inset('2.5rem')} minmax(12rem, 2fr) minmax(6rem, 1fr) ${inset('3rem')}`
    )
    expect(layout.minWidth).toBe(23.5)
    expect(layout.pinnedStart).toEqual([2.5, undefined])
  })

  it('gives a lone track both edges’ inset', () => {
    const columns = [fixed('a', 10, 2)]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe(`minmax(${inset('10rem', 2)}, 2fr)`)
  })

  it('lets a lone pinned column grow like any other', () => {
    const columns = [fixed('a', 10, 2, true), fixed('b', 10, 2)]
    const layout = columnLayout(columns, columnWidths(columns, [], UTC))
    expect(layout.template).toBe(
      `minmax(${inset('10rem')}, 2fr) minmax(${inset('10rem')}, 2fr)`
    )
    expect(layout.pinnedStart).toEqual([0, undefined])
  })
})

describe('columnWidths', () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({
    show: `Ball Park Music at Kazoo Hollow Room ${index}`,
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
      full('Ball Park Music at Kazoo Hollow Room 29'.length)
    )
  })

  it('never lets the header truncate', () => {
    const [city] = widths([
      column('city', { field: text('city', 'City of the performance') })
    ])
    expect(city!.grow).toBeGreaterThanOrEqual('City of the performance'.length)
  })

  it('makes room for the empty text a column shows', () => {
    const [sold] = columnWidths(
      [
        column('sold', { field: { key: 'sold', label: 'Sold', type: 'money' } })
      ],
      [{ sold: 5 }, { sold: null }, { sold: null }],
      'UTC'
    )
    expect(sold!.min).toBeGreaterThanOrEqual('Not available'.length * 0.55)
  })

  it('keeps an explicit width', () => {
    const width: RecordColumnWidth = { min: 7 }
    expect(widths([column('show', { width })])).toEqual([width])
  })
})
