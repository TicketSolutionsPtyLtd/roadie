import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RecordSelection, RecordView } from '@oztix/roadie-core/records'

import { type TestShow, showFields, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const shows = testShows(120)
const page = shows.slice(0, 50)

type Options = Partial<UseRecordsOptions<TestShow>>
const setup = (options: Options = {}) =>
  renderHook(
    (props: Options) =>
      useRecords({
        data: page,
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 120,
        ...options,
        ...props
      }),
    { initialProps: {} }
  )

const view = (query: Partial<RecordView['query']> = {}): RecordView => ({
  query: { search: '', filters: [], sort: [], ...query },
  layout: { type: 'table' }
})

const fakeTimers = () =>
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

describe('useRecords server mode', () => {
  it('shows the page it is given, in its order, counted by rowCount', () => {
    const reversed = [...page].reverse()
    const { result } = setup({
      data: reversed,
      defaultView: {
        query: {
          search: 'Perth',
          filters: [{ field: 'city', operator: 'is', values: ['Hobart'] }],
          sort: [{ field: 'show', direction: 'ascending' }]
        }
      }
    })
    expect(result.current.mode).toBe('server')
    expect(result.current.rows.map((row) => row.id)).toEqual(
      reversed.map((row) => row.id)
    )
    expect(result.current.matchingRows).toEqual(result.current.rows)
    expect(result.current.resultCount).toBe(120)
    expect(result.current.pageCount).toBe(3)
    expect(result.current.filtered).toBe(true)
  })

  it('stays in browser mode without rowCount', () => {
    expect(setup({ rowCount: undefined }).result.current.mode).toBe('browser')
  })

  it.each([
    [-5, 0],
    [Number.NaN, 0],
    [12.7, 12]
  ])('reads a rowCount of %s as %s', (rowCount, expected) => {
    expect(setup({ rowCount }).result.current.resultCount).toBe(expected)
  })

  it('goes to pages the server has, past the rows it holds', async () => {
    const onPositionChange = vi.fn()
    const { result } = setup({ onPositionChange })
    await act(() => result.current.setPage(2))
    expect(onPositionChange).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 50,
      row: 0
    })
    await act(() => result.current.setPage(3))
    expect(result.current.position.page).toBe(2)
  })

  it('counts picked ids on any page, and every match but the exceptions', async () => {
    const { result } = setup({ selectable: true })
    await act(() => result.current.setSelection({ ids: ['show-0', 'show-99'] }))
    expect(result.current.selectedCount).toBe(2)
    await act(() =>
      result.current.setSelection({ allMatching: true, except: ['show-3'] })
    )
    expect(result.current.selectedCount).toBe(119)
    expect(
      result.current.countSelection({
        allMatching: true,
        except: shows.map((show) => show.id).concat('extra')
      })
    ).toBe(0)
  })

  it.each<[string, RecordSelection]>([
    ['picked ids', { ids: ['show-0'] }],
    ['every match', { allMatching: true, except: [] }]
  ])(
    'drops %s once a filter changes, as only the server knows what matches',
    async (_, selection) => {
      const onSelectionChange = vi.fn()
      const { result } = setup({
        selectable: true,
        defaultSelection: selection,
        onSelectionChange
      })
      await act(() =>
        result.current.addFilter({
          field: 'city',
          operator: 'is',
          values: ['Brisbane']
        })
      )
      expect(result.current.selection).toEqual({ ids: [] })
      expect(onSelectionChange).toHaveBeenLastCalledWith({ ids: [] })
    }
  )

  it('keeps the selection when the sort or page changes', async () => {
    const { result } = setup({
      selectable: true,
      defaultSelection: { ids: ['show-0'] }
    })
    await act(() =>
      result.current.setSort([{ field: 'sold', direction: 'descending' }])
    )
    await act(() => result.current.setPage(1))
    expect(result.current.selection).toEqual({ ids: ['show-0'] })
  })

  it('applies only what the fields can, so an adapter gets a usable view', () => {
    const asked = view({
      filters: [
        { field: 'nope', operator: 'is', values: ['x'] },
        { field: 'city', operator: 'is', values: ['Perth'] }
      ],
      sort: [
        { field: 'nope', direction: 'ascending' },
        { field: 'sold', direction: 'descending' }
      ]
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = setup({ view: asked })
    expect(result.current.skippedFilters).toEqual([0])
    expect(result.current.appliedView.query).toEqual({
      search: '',
      filters: [{ field: 'city', operator: 'is', values: ['Perth'] }],
      sort: [{ field: 'sold', direction: 'descending' }]
    })
  })

  it('keeps one applied view while the view keeps its content', () => {
    const { result, rerender } = setup({ view: view({ search: 'Perth' }) })
    const first = result.current.appliedView
    rerender({ view: view({ search: 'Perth' }) })
    expect(result.current.appliedView).toBe(first)
    rerender({ view: view({ search: 'Hobart' }) })
    expect(result.current.appliedView.query.search).toBe('Hobart')
  })

  it('keeps the applied query when only the layout changes', async () => {
    const { result } = setup()
    const query = result.current.appliedView.query
    await act(() =>
      result.current.setLayout({
        type: 'table',
        columns: { hidden: ['city'] }
      })
    )
    expect(result.current.appliedView.query).toBe(query)
  })

  it('warns once when selectable records have no getRowId', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = setup({ getRowId: undefined, selectable: true })
    rerender({})
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]![0]).toContain('getRowId')
  })
})

describe('useRecords server search', () => {
  it('shows each keystroke and sets the search once typing pauses', async () => {
    fakeTimers()
    const onViewChange = vi.fn()
    const { result } = setup({ onViewChange })
    await act(() => result.current.setSearch('Per'))
    await act(() => result.current.setSearch('Perth'))
    expect(result.current.searchText).toBe('Perth')
    expect(result.current.view.query.search).toBe('')
    expect(onViewChange).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(result.current.view.query.search).toBe('Perth')
    expect(result.current.appliedView.query.search).toBe('Perth')
  })

  it('clears at once', async () => {
    fakeTimers()
    const onViewChange = vi.fn()
    const { result } = setup({
      defaultView: { query: { search: 'Perth' } },
      onViewChange
    })
    await act(() => result.current.setSearch('Pert'))
    await act(() => result.current.setSearch(''))
    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(result.current.view.query.search).toBe('')
    await act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenCalledTimes(1)
  })

  it('drops a pending search when the query is cleared', async () => {
    fakeTimers()
    const { result } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }
      }
    })
    await act(() => result.current.setSearch('Oce'))
    await act(() => result.current.clearQuery())
    await act(() => vi.advanceTimersByTime(250))
    expect(result.current.searchText).toBe('')
    expect(result.current.view.query).toMatchObject({
      search: '',
      filters: []
    })
  })

  it('commits with the view as it is then, not as it was typed against', async () => {
    fakeTimers()
    const { result } = setup()
    await act(() => result.current.setSearch('Perth'))
    await act(() =>
      result.current.setSort([{ field: 'sold', direction: 'ascending' }])
    )
    await act(() => vi.advanceTimersByTime(250))
    expect(result.current.view.query).toMatchObject({
      search: 'Perth',
      sort: [{ field: 'sold', direction: 'ascending' }]
    })
  })

  it('stops its timer on unmount', async () => {
    fakeTimers()
    const onViewChange = vi.fn()
    const { result, unmount } = setup({ onViewChange })
    await act(() => result.current.setSearch('Perth'))
    unmount()
    act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).not.toHaveBeenCalled()
  })

  it('sets the search at once in browser mode', async () => {
    const onViewChange = vi.fn()
    const { result } = setup({ rowCount: undefined, onViewChange })
    await act(() => result.current.setSearch('Perth'))
    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(result.current.searchText).toBe('Perth')
  })
})

describe('useRecords server search before its echo', () => {
  const controlled = (onViewChange = vi.fn()) =>
    renderHook(
      (props: { search: string; rowCount?: number }) =>
        useRecords({
          data: page,
          fields: showFields,
          rowCount: 'rowCount' in props ? props.rowCount : 120,
          view: view({ search: props.search }),
          onViewChange
        }),
      { initialProps: { search: '' } as { search: string; rowCount?: number } }
    )

  it('clears at once, even before the last search echoes', async () => {
    fakeTimers()
    const onViewChange = vi.fn()
    const { result, rerender } = controlled(onViewChange)
    await act(() => result.current.setSearch('f'))
    await act(() => vi.advanceTimersByTime(300))
    await act(() => result.current.setSearch(''))
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: '' })
      }),
      expect.anything()
    )
    rerender({ search: 'f' })
    rerender({ search: '' })
    expect(result.current.searchText).toBe('')
  })

  it('sends a search that goes back to the one the parent still holds', async () => {
    fakeTimers()
    const onViewChange = vi.fn()
    const { result, rerender } = controlled(onViewChange)
    rerender({ search: 'x' })
    await act(() => result.current.setSearch('xy'))
    await act(() => vi.advanceTimersByTime(300))
    await act(() => result.current.setSearch('x'))
    await act(() => vi.advanceTimersByTime(300))
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: 'x' })
      }),
      expect.anything()
    )
  })

  it('stays in server mode on the last count, whatever loading says', () => {
    const { result, rerender } = controlled()
    rerender({ search: '', rowCount: undefined })
    expect(result.current.mode).toBe('server')
    expect(result.current.resultCount).toBe(120)
  })
})

describe('useRecords server search with a parent that keeps only the last', () => {
  const coalescing = () =>
    renderHook(
      (props: { search: string }) =>
        useRecords({
          data: page,
          fields: showFields,
          rowCount: 120,
          view: view({ search: props.search }),
          onViewChange: () => {}
        }),
      { initialProps: { search: '' } }
    )

  it('reads a later outside search as outside after a clear it never echoed', async () => {
    fakeTimers()
    const { result, rerender } = coalescing()
    await act(() => result.current.setSearch('f'))
    await act(() => vi.advanceTimersByTime(300))
    await act(() => result.current.setSearch(''))
    rerender({ search: '' })
    rerender({ search: 'f' })
    expect(result.current.searchText).toBe('f')
  })

  it('reads a later outside search as outside after a backspace it never echoed', async () => {
    fakeTimers()
    const { result, rerender } = coalescing()
    rerender({ search: 'x' })
    await act(() => result.current.setSearch('xy'))
    await act(() => vi.advanceTimersByTime(300))
    await act(() => result.current.setSearch('x'))
    await act(() => vi.advanceTimersByTime(300))
    rerender({ search: 'xy' })
    expect(result.current.searchText).toBe('xy')
  })
})

describe('useRecords browser page past the end', () => {
  it('shows the last page for a controlled page the parent never clamped', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useRecords({
        data: shows.slice(0, 100),
        fields: showFields,
        getRowId: (row) => row.id,
        position: { page: 3, pageSize: 50 }
      })
    )
    expect(result.current.rows).toHaveLength(50)
    expect(result.current.rows[0]!.id).toBe('show-50')
  })
})
