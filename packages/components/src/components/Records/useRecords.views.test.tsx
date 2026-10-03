import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RecordView } from '@oztix/roadie-core/records'

import { type TestShow, showFields, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

const shows = testShows(120)

const setup = (options: Partial<UseRecordsOptions<TestShow>> = {}) =>
  renderHook(
    (props: Partial<UseRecordsOptions<TestShow>>) =>
      useRecords({ data: shows, fields: showFields, ...options, ...props }),
    { initialProps: {} }
  )

const upcoming: RecordView = {
  id: 'upcoming',
  name: 'Upcoming',
  query: {
    search: '',
    filters: [{ field: 'city', operator: 'contains', value: 'Perth' }],
    sort: [{ field: 'sold', direction: 'descending' }]
  },
  layout: { type: 'table', columns: { hidden: ['gross'] } }
}

describe('useRecords baseline', () => {
  it('is never modified without a baseline', async () => {
    const { result } = setup()
    expect(result.current.baseline).toBeUndefined()
    await act(() => result.current.setSearch('Perth'))
    expect(result.current.modified).toBe(false)
  })

  it('reads as modified once the view differs from its baseline', async () => {
    const { result } = setup({ defaultView: upcoming, baseline: upcoming })
    expect(result.current.baseline).toBe(upcoming)
    expect(result.current.modified).toBe(false)
    await act(() => result.current.setSort([]))
    expect(result.current.modified).toBe(true)
    await act(() =>
      result.current.setSort([{ field: 'sold', direction: 'descending' }])
    )
    expect(result.current.modified).toBe(false)
  })

  it('compares as equalViews does, ignoring id, name and chip order', () => {
    const { result } = setup({
      view: {
        query: {
          ...upcoming.query,
          search: '  ',
          filters: [...upcoming.query.filters]
        },
        layout: upcoming.layout
      },
      baseline: upcoming
    })
    expect(result.current.modified).toBe(false)
  })

  it('reads a layout change as modified', async () => {
    const { result } = setup({ defaultView: upcoming, baseline: upcoming })
    await act(() => result.current.setLayout({ type: 'table' }))
    expect(result.current.modified).toBe(true)
  })

  it('follows a new baseline, as when a view is saved', () => {
    const { result, rerender } = setup({
      defaultView: { query: { search: 'Perth' } },
      baseline: upcoming
    })
    expect(result.current.modified).toBe(true)
    const saved = { ...result.current.view, id: 'mine', name: 'Perth' }
    rerender({ baseline: saved })
    expect(result.current.modified).toBe(false)
  })

  it('leaves the page scope out of the comparison', () => {
    const { result } = setup({
      defaultView: upcoming,
      baseline: upcoming,
      scope: [{ field: 'status', operator: 'is', values: ['on_sale'] }]
    })
    expect(result.current.modified).toBe(false)
  })

  it('resets to the baseline from the first page, position first', async () => {
    const onViewChange = vi.fn()
    const onPositionChange = vi.fn()
    const { result } = setup({
      defaultView: upcoming,
      baseline: upcoming,
      defaultPosition: { page: 1 },
      onViewChange,
      onPositionChange
    })
    await act(() => result.current.setLayout({ type: 'table' }))
    await act(() => result.current.removeFilter(0))
    await act(() => result.current.setPage(1))
    expect(result.current.position.page).toBe(1)
    onViewChange.mockClear()
    onPositionChange.mockClear()
    const calls: string[] = []
    onViewChange.mockImplementation(() => calls.push('view'))
    onPositionChange.mockImplementation(() => calls.push('position'))

    await act(() => result.current.resetView())

    expect(result.current.view).toEqual(upcoming)
    expect(result.current.modified).toBe(false)
    expect(result.current.position.page).toBe(0)
    expect(calls).toEqual(['position', 'view'])
    expect(onViewChange).toHaveBeenCalledWith(upcoming, {
      page: 0,
      pageSize: 50,
      row: 0
    })
  })

  it('does nothing on reset without a baseline', async () => {
    const onViewChange = vi.fn()
    const { result } = setup({ onViewChange })
    await act(() => result.current.setSearch('Perth'))
    onViewChange.mockClear()
    await act(() => result.current.resetView())
    expect(onViewChange).not.toHaveBeenCalled()
    expect(result.current.view.query.search).toBe('Perth')
  })

  it('replaces a waiting server search on reset', async () => {
    vi.useFakeTimers()
    try {
      const onViewChange = vi.fn()
      const { result } = setup({
        rowCount: 120,
        data: shows.slice(0, 50),
        defaultView: upcoming,
        baseline: upcoming,
        onViewChange
      })
      act(() => result.current.setSearch('Hobart'))
      expect(result.current.searchText).toBe('Hobart')
      act(() => result.current.resetView())
      expect(result.current.searchText).toBe('')
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.view.query.search).toBe('')
      expect(
        onViewChange.mock.calls.every(([view]) => view.query.search === '')
      ).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
