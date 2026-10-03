import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type {
  RecordPosition,
  RecordSelection,
  RecordView
} from '@oztix/roadie-core/records'

import { type TestShow, showFields, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

const shows = testShows(120)
const names = (result: { current: { rows: readonly { row: TestShow }[] } }) =>
  result.current.rows.map((row) => row.row.show)

const setup = (options: Partial<UseRecordsOptions<TestShow>> = {}) =>
  renderHook(
    (props: Partial<UseRecordsOptions<TestShow>>) =>
      useRecords({ data: shows, fields: showFields, ...options, ...props }),
    { initialProps: {} }
  )

const view = (query: Partial<RecordView['query']> = {}): RecordView => ({
  query: { search: '', filters: [], sort: [], ...query },
  layout: { type: 'table' }
})

describe('useRecords', () => {
  it('pages rows 50 at a time', () => {
    const { result } = setup()
    expect(result.current.mode).toBe('browser')
    expect(result.current.rows).toHaveLength(50)
    expect(result.current.pageCount).toBe(3)
    expect(result.current.resultCount).toBe(120)
    expect(result.current.position).toEqual({ page: 0, pageSize: 50, row: 0 })
  })

  it('ids rows by getRowId, or by their index in data', () => {
    expect(setup().result.current.rows[3]!.id).toBe('3')
    const { result } = setup({ getRowId: (row) => row.id })
    expect(result.current.rows[3]).toEqual({ id: 'show-3', row: shows[3] })
  })

  it('gives each occurrence of a repeated record its own index id', () => {
    const show = shows[0]!
    const { result } = setup({ data: [show, shows[1]!, show] })
    expect(result.current.rows.map((row) => row.id)).toEqual(['0', '1', '2'])
  })

  it('searches every word, trimmed and ignoring case', async () => {
    const { result } = setup()
    await act(() => result.current.setSearch('  OCEAN alley 1 '))
    const expected = shows
      .map((show) => show.show)
      .filter((name) =>
        ['ocean', 'alley', '1'].every((word) =>
          name.toLowerCase().includes(word)
        )
      )
    expect(names(result)).toEqual(expected)
    expect(expected).toContain('Ocean Alley 19')
    expect(result.current.view.query.search).toBe('  OCEAN alley 1 ')
    expect(result.current.filtered).toBe(true)
  })

  it('treats regex characters as plain text', async () => {
    const { result } = setup()
    await act(() => result.current.setSearch('('))
    expect(result.current.resultCount).toBe(0)
  })

  it('searches a text field whose first value is empty', async () => {
    const data = [{ ...shows[0]!, city: null as unknown as string }, ...shows]
    const { result } = setup({ data })
    await act(() => result.current.setSearch('Hobart'))
    expect(result.current.resultCount).toBe(24)
  })

  it('sorts numbers largest first with missing values last', async () => {
    const { result } = setup({ defaultPosition: { pageSize: 200 } })
    await act(() =>
      result.current.setSort([{ field: 'gross', direction: 'descending' }])
    )
    const gross = result.current.rows.map((row) => row.row.gross)
    const numbers = gross.filter((value) => typeof value === 'number')
    expect(numbers).toEqual([...numbers].sort((a, b) => b - a))
    expect(
      gross.slice(numbers.length).every((value) => typeof value !== 'number')
    ).toBe(true)
    expect(result.current.view.query.sort).toEqual([
      { field: 'gross', direction: 'descending' }
    ])
  })

  it('filters by the view, resolving dates in the viewer zone', () => {
    const { result } = setup({
      timeZone: 'Australia/Perth',
      now: new Date('2026-03-01T00:00:00Z'),
      defaultView: {
        query: {
          filters: [
            { field: 'city', operator: 'is', values: ['perth'] },
            { field: 'starts', operator: 'within', value: 'this-month' }
          ]
        }
      }
    })
    expect(result.current.resultCount).toBeGreaterThan(0)
    expect(
      result.current.rows.every(
        (row) =>
          row.row.city === 'Perth' && row.row.starts.startsWith('2026-03')
      )
    ).toBe(true)
  })

  it('adds, updates and removes filters, and clears the query', async () => {
    const { result } = setup()
    await act(() =>
      result.current.addFilter({
        field: 'city',
        operator: 'is',
        values: ['hobart']
      })
    )
    expect(result.current.resultCount).toBe(24)
    await act(() =>
      result.current.updateFilter(0, {
        field: 'city',
        operator: 'is',
        values: ['hobart', 'perth']
      })
    )
    expect(result.current.resultCount).toBe(48)
    await act(() => result.current.setSearch('Ocean'))
    await act(() => result.current.removeFilter(0))
    expect(result.current.view.query.filters).toEqual([])
    expect(result.current.filtered).toBe(true)
    await act(() =>
      result.current.addFilter({ field: 'sold', operator: 'is-set' })
    )
    await act(() => result.current.clearQuery())
    expect(result.current.view.query).toEqual({
      search: '',
      filters: [],
      sort: []
    })
    expect(result.current.filtered).toBe(false)
  })

  it('keeps the sort when it clears the query', async () => {
    const sort = [{ field: 'sold', direction: 'ascending' as const }]
    const { result } = setup({ defaultView: { query: { search: 'x', sort } } })
    await act(() => result.current.clearQuery())
    expect(result.current.view.query.sort).toEqual(sort)
  })

  it('applies what it can of a view and warns about the rest once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result, rerender } = setup({
      defaultView: {
        query: {
          filters: [
            { field: 'venue', operator: 'is', values: ['x'] },
            { field: 'city', operator: 'is', values: ['perth'] },
            {
              field: 'starts',
              operator: 'between',
              value: ['2026-05-01', '2026-01-01']
            }
          ],
          sort: [{ field: 'nope', direction: 'ascending' }]
        }
      }
    })
    rerender({})
    expect(result.current.resultCount).toBe(24)
    expect(result.current.skippedFilters).toEqual([0, 2])
    expect(result.current.filtered).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toMatch(/\[Roadie\] Records.*venue/s)
    warn.mockRestore()
  })

  it.each<[string, RecordView['query']['filters'][number]]>([
    [
      'an operator its field does not take',
      { field: 'city', operator: 'gt', value: 1 }
    ],
    [
      'a field that does not filter',
      { field: 'show', operator: 'contains', value: 'zzz' }
    ]
  ])('skips %s', (_, filter) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fields = showFields.map((field) =>
      field.key === 'show' ? { ...field, filterable: false } : field
    )
    const { result } = setup({
      fields,
      defaultView: { query: { filters: [filter] } }
    })
    expect(result.current.skippedFilters).toEqual([0])
    expect(result.current.resultCount).toBe(120)
    warn.mockRestore()
  })

  it('skips a sort on a field that does not sort', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fields = showFields.map((field) =>
      field.key === 'sold' ? { ...field, sortable: false } : field
    )
    const { result } = setup({
      fields,
      defaultView: {
        query: { sort: [{ field: 'sold', direction: 'ascending' }] }
      }
    })
    expect(result.current.resolvedQuery.sort).toEqual([])
    expect(names(result)[0]).toBe(shows[0]!.show)
    warn.mockRestore()
  })

  it('sets the layout', async () => {
    const onViewChange = vi.fn()
    const { result } = setup({ onViewChange })
    const layout = { type: 'table' as const, columns: { hidden: ['sold'] } }
    await act(() => result.current.setLayout(layout))
    expect(result.current.view.layout).toEqual(layout)
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ layout }),
      { page: 0, pageSize: 50, row: 0 }
    )
  })

  it('returns to the first page when the query changes', async () => {
    const onPositionChange = vi.fn()
    const { result } = setup({
      defaultPosition: { page: 2 },
      onPositionChange
    })
    await act(() => result.current.setSearch('Perth'))
    expect(result.current.position.page).toBe(0)
    expect(onPositionChange).toHaveBeenLastCalledWith({
      page: 0,
      pageSize: 50,
      row: 0
    })
    await act(() => result.current.setPage(0))
    await act(() =>
      result.current.setSort([{ field: 'show', direction: 'ascending' }])
    )
    expect(onPositionChange).toHaveBeenCalledTimes(1)
  })

  it('goes to a page and sets the page size from the first page', async () => {
    const { result } = setup()
    await act(() => result.current.setPage(2))
    expect(names(result)[0]).toBe(shows[100]!.show)
    await act(() => result.current.setPageSize(25))
    expect(result.current.position).toEqual({ page: 0, pageSize: 25, row: 0 })
    expect(result.current.pageCount).toBe(5)
  })

  it('clamps the page when data shrinks, and again later', async () => {
    const { result, rerender } = setup({ defaultPosition: { page: 2 } })
    await act(async () => rerender({ data: testShows(60) }))
    expect(result.current.position.page).toBe(1)
    await act(() => result.current.setPage(99))
    expect(result.current.position.page).toBe(1)
  })

  it('reports a clamped page for a controlled position', async () => {
    const onPositionChange = vi.fn()
    const position: RecordPosition = { page: 2, pageSize: 50 }
    const { result, rerender } = setup({ position, onPositionChange })
    await act(async () => rerender({ data: testShows(60) }))
    expect(onPositionChange).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      row: 0
    })
    expect(result.current.position.page).toBe(2)
  })

  it('keeps a deep-linked page while loading or erroring', async () => {
    const onPositionChange = vi.fn()
    const position: RecordPosition = { page: 5, pageSize: 25 }
    const { result, rerender } = setup({
      data: [],
      position,
      onPositionChange,
      loading: true
    })
    await act(async () => rerender({ loading: false, error: true }))
    expect(onPositionChange).not.toHaveBeenCalled()
    expect(result.current.position.page).toBe(5)
    await act(async () =>
      rerender({ loading: false, error: false, data: testShows(30) })
    )
    expect(onPositionChange).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      row: 0
    })
  })

  it('reports every change and follows a controlled view', async () => {
    const onViewChange = vi.fn()
    const { result } = setup({
      view: view({ search: 'Hobart' }),
      onViewChange
    })
    expect(result.current.rows.every((row) => row.row.city === 'Hobart')).toBe(
      true
    )
    await act(() => result.current.setSearch('Perth'))
    expect(onViewChange).toHaveBeenCalledWith(view({ search: 'Perth' }), {
      page: 0,
      pageSize: 50,
      row: 0
    })
    expect(result.current.view.query.search).toBe('Hobart')
  })

  it('reports the page it resets first, then the view with that position', async () => {
    const calls: string[] = []
    const onViewChange = vi.fn((_view: RecordView, position: unknown) =>
      calls.push(`view ${JSON.stringify(position)}`)
    )
    const onPositionChange = vi.fn(() => calls.push('position'))
    const { result } = setup({
      defaultPosition: { page: 2 },
      onViewChange,
      onPositionChange
    })
    await act(() => result.current.setSearch('Perth'))
    expect(calls).toEqual(['position', 'view {"page":0,"pageSize":50,"row":0}'])
  })

  it('keeps its work for a view that is new but the same', () => {
    const { result, rerender } = setup({ view: view({ search: 'Perth' }) })
    const resolved = result.current.resolvedQuery
    rerender({ view: view({ search: 'Perth' }) })
    expect(result.current.resolvedQuery).toBe(resolved)
    rerender({ view: view({ search: 'Hobart' }) })
    expect(result.current.resolvedQuery).not.toBe(resolved)
  })

  it.each<[RecordPosition, Required<RecordPosition>]>([
    [
      { page: -1, pageSize: 0 },
      { page: 0, pageSize: 1, row: 0 }
    ],
    [
      { page: 1.5, pageSize: Number.NaN },
      { page: 1, pageSize: 50, row: 0 }
    ],
    [{ pageSize: -10 }, { page: 0, pageSize: 1, row: 0 }]
  ])('reads position %j as %j', (position, expected) => {
    const { result } = setup({ position })
    expect(result.current.position).toEqual(expected)
  })

  it('survives a new data array every render', () => {
    const { result } = renderHook(() =>
      useRecords({ data: testShows(10), fields: showFields })
    )
    expect(result.current.resultCount).toBe(10)
  })

  it('names records, and passes loading, error and retry through', () => {
    const onRetry = vi.fn()
    const { result } = setup({ loading: true, error: 'Offline', onRetry })
    expect(result.current.recordName).toEqual({
      one: 'record',
      other: 'records'
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe('Offline')
    expect(result.current.onRetry).toBe(onRetry)
  })
})

describe('useRecords selection', () => {
  const byId = (options: Partial<UseRecordsOptions<TestShow>> = {}) =>
    setup({ getRowId: (row) => row.id, ...options })

  it('starts empty and unselectable unless asked', () => {
    const { result } = byId()
    expect(result.current.selectable).toBe(false)
    expect(result.current.selection).toEqual({ ids: [] })
    expect(result.current.selectedCount).toBe(0)
    expect(byId({ selectable: true }).result.current.selectable).toBe(true)
  })

  it('toggles a row and counts it', async () => {
    const { result } = byId()
    await act(() => result.current.toggleRow('show-3'))
    expect(result.current.selectedCount).toBe(1)
    expect(result.current.isSelected('show-3')).toBe(true)
  })

  it('selects a range with shift in the sorted order, across pages', async () => {
    const { result } = byId({
      defaultView: {
        query: { sort: [{ field: 'show', direction: 'ascending' }] }
      }
    })
    const order = result.current.matchingRows.map((row) => row.id)
    await act(() => result.current.toggleRow(order[48]!))
    await act(() => result.current.toggleRow(order[52]!, { range: true }))
    expect(result.current.selectedCount).toBe(5)
    expect(order.slice(48, 53).every(result.current.isSelected)).toBe(true)
  })

  it('selects the page, then every matching row', async () => {
    const { result } = byId()
    await act(() => result.current.selectPage(true))
    expect(result.current.selectedCount).toBe(50)
    await act(() => result.current.selectAllMatching())
    expect(result.current.selectedCount).toBe(120)
    await act(() => result.current.clearSelection())
    expect(result.current.selection).toEqual({ ids: [] })
  })

  it('drops all-matching when the search changes, keeping picked ids', async () => {
    const { result } = byId()
    await act(() => result.current.toggleRow('show-4'))
    await act(() => result.current.setSearch('Hobart'))
    expect(result.current.selectedCount).toBe(1)
    await act(() => result.current.selectAllMatching())
    await act(() => result.current.setSearch('Perth'))
    expect(result.current.selection).toEqual({ ids: [] })
  })

  it('drops picked rows a new search or filter hides', async () => {
    const { result } = byId()
    await act(() => result.current.toggleRow('show-0'))
    await act(() => result.current.setSearch('Perth'))
    await act(() => result.current.toggleRow('show-3'))
    expect(result.current.selection).toEqual({ ids: ['show-3'] })
    await act(() =>
      result.current.addFilter({
        field: 'status',
        operator: 'is',
        values: ['cancelled']
      })
    )
    expect(result.current.selection).toEqual({ ids: [] })
  })

  it('keeps the selection when only the sort or page changes', async () => {
    const { result } = byId()
    await act(() => result.current.selectAllMatching())
    await act(() =>
      result.current.setSort([{ field: 'sold', direction: 'descending' }])
    )
    await act(() => result.current.setPage(1))
    expect(result.current.selectedCount).toBe(120)
  })

  it('keeps the selection when a relative filter resolves against a new now', async () => {
    const { result, rerender } = byId({
      now: new Date('2026-03-01T12:00:00Z'),
      defaultView: {
        query: {
          filters: [{ field: 'starts', operator: 'within', value: 'past' }]
        }
      }
    })
    await act(() => result.current.selectAllMatching())
    rerender({ now: new Date('2026-03-02T12:00:00Z') })
    expect('allMatching' in result.current.selection).toBe(true)
  })

  it('reports changes and follows a controlled selection', async () => {
    const onSelectionChange = vi.fn()
    const { result } = byId({
      selection: { ids: ['show-1'] },
      onSelectionChange
    })
    await act(() => result.current.toggleRow('show-2'))
    expect(onSelectionChange).toHaveBeenCalledWith({
      ids: ['show-1', 'show-2']
    })
    expect(result.current.selectedCount).toBe(1)
  })

  it('tells a controlled parent when a search hides picked rows', async () => {
    const onSelectionChange = vi.fn()
    const { result } = byId({
      selection: { ids: ['show-0', 'show-3'] },
      onSelectionChange
    })
    await act(() => result.current.setSearch('Perth'))
    expect(onSelectionChange).toHaveBeenLastCalledWith({ ids: ['show-3'] })
    expect(result.current.selection).toEqual({ ids: ['show-3'] })
  })

  it('lists every matching row, sorted, across pages', async () => {
    const { result } = byId()
    await act(() => result.current.setSearch('Perth'))
    expect(result.current.matchingRows).toHaveLength(24)
    expect(result.current.matchingRows[0]).toEqual({
      id: 'show-3',
      row: shows[3]
    })
  })

  it('enters Select mode only when selectable, and leaving clears', async () => {
    expect(
      (() => {
        const { result } = byId()
        act(() => result.current.setSelecting(true))
        return result.current.selecting
      })()
    ).toBe(false)
    const { result } = byId({ selectable: true })
    await act(() => result.current.setSelecting(true))
    await act(() => result.current.toggleRow('show-1'))
    expect(result.current.selecting).toBe(true)
    await act(() => result.current.setSelecting(false, { keep: true }))
    expect(result.current.selectedCount).toBe(1)
    await act(() => result.current.setSelecting(true))
    await act(() => result.current.setSelecting(false))
    expect(result.current.selectedCount).toBe(0)
  })

  it('passes row actions and links through', () => {
    const rowActions = () => null
    const getRowHref = (row: TestShow) => `/shows/${row.id}`
    const { result } = byId({ rowActions, getRowHref })
    expect(result.current.rowActions).toBe(rowActions)
    expect(result.current.getRowHref).toBe(getRowHref)
  })
})

describe('useRecords selection set with its query', () => {
  it('keeps a selection the parent sets in the same update as a new search', async () => {
    const changes: unknown[] = []
    const { result, rerender } = renderHook(
      ({ view, selection }: { view: RecordView; selection: RecordSelection }) =>
        useRecords({
          data: shows,
          fields: showFields,
          getRowId: (row) => row.id,
          view,
          selection,
          onSelectionChange: (next) => changes.push(next)
        }),
      {
        initialProps: {
          view: view(),
          selection: { ids: [] } as RecordSelection
        }
      }
    )
    await act(async () =>
      rerender({
        view: view({ search: 'Ocean' }),
        selection: { allMatching: true, except: [] }
      })
    )
    expect(result.current.selection).toEqual({ allMatching: true, except: [] })
    expect(changes).toEqual([])
  })
})
