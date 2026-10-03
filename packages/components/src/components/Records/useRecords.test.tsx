import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RecordPosition, RecordView } from '@oztix/roadie-core/records'

import { type TestShow, showFields, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

const shows = testShows(120)
const names = (result: {
  current: { rows: readonly { record: TestShow }[] }
}) => result.current.rows.map((row) => row.record.show)

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
    expect(result.current.rows[3]).toEqual({ id: 'show-3', record: shows[3] })
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
    const gross = result.current.rows.map((row) => row.record.gross)
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
          row.record.city === 'Perth' && row.record.starts.startsWith('2026-03')
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
    expect(result.current.filtered).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toMatch(/\[Roadie\] Records.*venue/s)
    warn.mockRestore()
  })

  it('sets the layout', async () => {
    const onViewChange = vi.fn()
    const { result } = setup({ onViewChange })
    const layout = { type: 'table' as const, columns: { hidden: ['sold'] } }
    await act(() => result.current.setLayout(layout))
    expect(result.current.view.layout).toEqual(layout)
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ layout })
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
    expect(
      result.current.rows.every((row) => row.record.city === 'Hobart')
    ).toBe(true)
    await act(() => result.current.setSearch('Perth'))
    expect(onViewChange).toHaveBeenCalledWith(view({ search: 'Perth' }))
    expect(result.current.view.query.search).toBe('Hobart')
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
