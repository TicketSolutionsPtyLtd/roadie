import { StrictMode, useLayoutEffect, useMemo, useRef } from 'react'

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  RecordFilter,
  RecordsRangeRequest
} from '@oztix/roadie-core/records'

import { MAX_RANGE_ROWS } from './ranges'
import { type TestShow, showFields, testShows } from './testUtils'
import type { RecordsRangeResult } from './useRangeLoading'
import { type UseRecordsOptions, useRecords } from './useRecords'

type Call = {
  start: number
  end: number
  /** Resolves with the server's rows for the range and its count. */
  resolve: () => void
  reject: (error: Error) => void
}

function useRangeHarness({
  total,
  rowCount,
  rowCountExact,
  respond = 'sync',
  ...options
}: {
  /** How many records the server holds. */
  total: number
  /** The count each result carries; left out, results carry none. */
  rowCount?: number
  rowCountExact?: boolean
  respond?: 'sync' | 'manual'
} & Partial<UseRecordsOptions<TestShow>>) {
  const all = useMemo(() => testShows(total), [total])
  const calls = useRef<Call[]>([])
  // Read when a reply leaves, so a count changed by a rerender applies.
  const latest = useRef({ rowCount, rowCountExact })
  useLayoutEffect(() => {
    latest.current = { rowCount, rowCountExact }
  })
  const records = useRecords({
    fields: showFields,
    getRowId: (row) => row.id,
    loadRange: ({ start, end }) => {
      const reply = (): RecordsRangeResult<TestShow> => ({
        rows: all.slice(start, end),
        ...(latest.current.rowCount !== undefined && {
          rowCount: latest.current.rowCount
        }),
        ...(latest.current.rowCountExact !== undefined && {
          rowCountExact: latest.current.rowCountExact
        })
      })
      if (respond === 'sync') {
        calls.current.push({ start, end, resolve() {}, reject() {} })
        return Promise.resolve(reply())
      }
      return new Promise((resolve, reject) => {
        calls.current.push({
          start,
          end,
          resolve: () => resolve(reply()),
          reject
        })
      })
    },
    ...options
  })
  return { records, calls }
}

type Harness = { current: ReturnType<typeof useRangeHarness> }

const requests = (result: Harness) =>
  result.current.calls.current.map(({ start, end }) => ({ start, end }))

const view = (result: Harness, first: number, last: number) =>
  act(async () => result.current.records.range!.show(first, last))

/** Loads the first range, so the count the server sends is known. */
const loadFirst = async (result: Harness) => {
  await view(result, 0, 15)
  const first = result.current.calls.current[0]
  if (first) await act(async () => first.resolve())
}

const fakeTimers = () =>
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

/** Types a search and waits out the pause before it applies. */
async function search(result: Harness, text: string) {
  fakeTimers()
  await act(async () => {
    result.current.records.setSearch(text)
    vi.advanceTimersByTime(300)
  })
  vi.useRealTimers()
}

const perth: RecordFilter = { field: 'city', operator: 'is', values: ['Perth'] }

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useRecords range mode', () => {
  it('is range mode only when loadRange is given', () => {
    const { result } = renderHook(() => useRangeHarness({ total: 100 }))
    expect(result.current.records.mode).toBe('range')
    expect(result.current.records.range).toBeDefined()

    const browser = renderHook(() =>
      useRecords({ data: testShows(3), fields: showFields })
    )
    expect(browser.result.current.mode).toBe('browser')
    expect(browser.result.current.range).toBeUndefined()

    const server = renderHook(() =>
      useRecords({ data: testShows(3), fields: showFields, rowCount: 9 })
    )
    expect(server.result.current.mode).toBe('server')
    expect(server.result.current.range).toBeUndefined()
  })

  it('holds the rows each range returns at their index', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000 })
    )
    await loadFirst(result)
    await view(result, 120, 135)
    expect(result.current.records.range!.rowAt(120)).toEqual({
      id: 'show-120',
      row: expect.objectContaining({ id: 'show-120' })
    })
    expect(result.current.records.range!.rowAt(60)).toBeUndefined()
    expect(result.current.records.data).toHaveLength(150)
    expect(result.current.records.rows[50]!.id).toBe('show-100')
  })

  it.each(['sync', 'manual'] as const)(
    'sizes for the count a range returns and requests the window once (%s)',
    async (respond) => {
      const { result } = renderHook(() =>
        useRangeHarness({ total: 1000, rowCount: 1000, respond })
      )
      expect(result.current.records.range!.count).toBe(50)
      await loadFirst(result)
      expect(result.current.records.range!.count).toBe(1000)
      expect(result.current.records.range!.total).toBe(1000)
      expect(result.current.records.resultCount).toBe(1000)
      await view(result, 120, 135)
      expect(requests(result)).toEqual([
        { start: 0, end: 50 },
        { start: 100, end: 150 },
        { start: 150, end: 200 }
      ])
      await view(result, 120, 135)
      expect(requests(result)).toHaveLength(3)
    }
  )

  it('keeps the count when a later range leaves it out', async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount?: number }) =>
        useRangeHarness({ total: 1000, rowCount }),
      { initialProps: { rowCount: 1000 } as { rowCount?: number } }
    )
    await loadFirst(result)
    rerender({ rowCount: undefined })
    await view(result, 120, 135)
    expect(result.current.records.range!.total).toBe(1000)
  })

  it('reads the count from its ranges, not rowCount', async () => {
    const { result } = renderHook(() =>
      useRecords<TestShow>({
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 5000,
        loadRange: async ({ start, end }) => ({
          rows: testShows(70).slice(start, end)
        })
      })
    )
    expect(result.current.range!.count).toBe(50)
    await act(async () => result.current.range!.show(0, 15))
    await act(async () => result.current.range!.show(40, 60))
    expect(result.current.range!.total).toBe(70)
  })

  it('asks for ranges of the page size', async () => {
    const loadRange = vi.fn(async (_: RecordsRangeRequest) => ({
      rows: [] as TestShow[]
    }))
    const { result } = renderHook(() =>
      useRecords({
        fields: showFields,
        getRowId: (row) => row.id,
        defaultPosition: { pageSize: 25 },
        loadRange
      })
    )
    await act(async () => result.current.range!.show(0, 15))
    expect(
      loadRange.mock.calls.map(([{ start, end }]) => ({ start, end }))
    ).toEqual([{ start: 0, end: 25 }])
  })

  it('hands each range the request to fetch, with the scope first', async () => {
    const loadRange = vi.fn(async (_: RecordsRangeRequest) => ({
      rows: [] as TestShow[]
    }))
    const { result } = renderHook(() =>
      useRecords({
        fields: showFields,
        getRowId: (row) => row.id,
        timeZone: 'Australia/Perth',
        scope: [{ field: 'city', operator: 'is', values: ['Perth'] }],
        defaultView: { query: { search: 'ocean' } },
        defaultPosition: { pageSize: 25 },
        loadRange
      })
    )
    await act(async () => result.current.range!.show(0, 10))
    expect(loadRange.mock.calls[0]![0]).toEqual({
      version: 1,
      query: {
        search: 'ocean',
        filters: [{ field: 'city', operator: 'is', values: ['Perth'] }],
        sort: [],
        timeZone: 'Australia/Perth'
      },
      start: 0,
      end: 25
    })
  })

  it('grows a range at a time without a count, then stops at a short range', async () => {
    const { result } = renderHook(() => useRangeHarness({ total: 70 }))
    expect(result.current.records.range!.count).toBe(50)
    expect(result.current.records.range!.total).toBeUndefined()

    await view(result, 0, 15)
    expect(result.current.records.range!.count).toBe(100)
    expect(result.current.records.range!.total).toBeUndefined()

    await view(result, 40, 60)
    expect(result.current.records.range!.count).toBe(70)
    expect(result.current.records.range!.total).toBe(70)
    expect(result.current.records.resultCount).toBe(70)
  })

  it('requests the first range without a count', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual' })
    )
    await view(result, 0, 15)
    expect(requests(result)).toEqual([{ start: 0, end: 50 }])
    expect(result.current.records.range!.loading).toBe(true)
  })

  it('knows an empty list once the first range is empty', async () => {
    const { result } = renderHook(() => useRangeHarness({ total: 0 }))
    await view(result, 0, 15)
    expect(result.current.records.range!.count).toBe(0)
    expect(result.current.records.range!.total).toBe(0)
  })

  it('shows an empty list once a range returns a count of 0', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 0, rowCount: 0 })
    )
    await view(result, 0, 15)
    expect(result.current.records.range!.count).toBe(0)
    expect(result.current.records.range!.total).toBe(0)
  })

  it('stops after a failed range until Retry, which plans again', async () => {
    const onRetry = vi.fn()
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual', onRetry })
    )
    await view(result, 0, 15)
    await act(async () =>
      result.current.calls.current[0]!.reject(new Error('Offline'))
    )
    expect(result.current.records.range!.loading).toBe(false)
    expect(result.current.records.error).toBe(true)
    await view(result, 0, 15)
    expect(requests(result)).toHaveLength(1)

    await act(async () => result.current.records.onRetry!())
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
  })

  it('keeps loaded records and no error state when a later range fails', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000, respond: 'manual' })
    )
    await loadFirst(result)
    await view(result, 40, 55)
    await act(async () =>
      result.current.calls.current[1]!.reject(new Error('Offline'))
    )
    expect(result.current.records.error).toBe(false)
    expect(result.current.records.range!.failed).toEqual([
      { start: 50, end: 100 }
    ])
    expect(result.current.records.rows).toHaveLength(50)
  })

  it('fails a range whose result holds no rows', async () => {
    const { result } = renderHook(() =>
      useRecords<TestShow>({
        fields: showFields,
        getRowId: (row) => row.id,
        loadRange: async () =>
          undefined as unknown as RecordsRangeResult<TestShow>
      })
    )
    await act(async () => result.current.range!.show(0, 15))
    expect(result.current.range!.failed).toEqual([{ start: 0, end: 50 }])
    expect(result.current.error).toBe(true)
  })

  it('retries no window from an earlier query', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 5000, rowCount: 5000 })
    )
    await loadFirst(result)
    await view(result, 500, 515)
    const before = requests(result).length
    await act(async () => result.current.records.addFilter(perth))
    await act(async () => result.current.records.onRetry!())
    expect(requests(result)).toHaveLength(before)
  })

  it('offers Retry without an onRetry option', () => {
    const { result } = renderHook(() => useRangeHarness({ total: 70 }))
    expect(result.current.records.onRetry).toBeInstanceOf(Function)
  })

  it('turns a synchronous throw into a failed range', async () => {
    const { result } = renderHook(() =>
      useRecords<TestShow>({
        fields: showFields,
        getRowId: (row) => row.id,
        loadRange: () => {
          throw new Error('Offline')
        }
      })
    )
    await act(async () => result.current.range!.show(0, 15))
    expect(result.current.range!.loading).toBe(false)
    expect(result.current.range!.failed).toEqual([{ start: 0, end: 50 }])
    expect(result.current.range!.count).toBe(50)
  })

  it('drops a reply for an earlier query', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, rowCount: 70, respond: 'manual' })
    )
    await view(result, 0, 15)
    await search(result, 'Perth')
    await view(result, 0, 15)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
    await act(async () => result.current.calls.current[0]!.resolve())
    expect(result.current.records.range!.rowAt(0)).toBeUndefined()
    expect(result.current.records.range!.loading).toBe(true)
    expect(result.current.records.range!.total).toBeUndefined()
  })

  it("drops the rows when the query changes, holding the last count until the new query's first range", async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount?: number }) =>
        useRangeHarness({ total: 1000, rowCount, respond: 'manual' }),
      { initialProps: { rowCount: 1000 } as { rowCount?: number } }
    )
    await loadFirst(result)
    expect(result.current.records.range!.rowAt(0)?.id).toBe('show-0')
    await act(async () => result.current.records.addFilter(perth))
    expect(result.current.records.range!.rowAt(0)).toBeUndefined()
    expect(result.current.records.range!.count).toBe(1000)
    await view(result, 0, 15)
    expect(requests(result).at(-1)).toEqual({ start: 0, end: 50 })
    rerender({ rowCount: 200 })
    await act(async () => result.current.calls.current.at(-1)!.resolve())
    expect(result.current.records.range!.rowAt(0)?.id).toBe('show-0')
    expect(result.current.records.range!.count).toBe(200)
  })

  it("drops the last query's count when the new query's first range has none", async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount?: number }) =>
        useRangeHarness({ total: 70, rowCount }),
      { initialProps: { rowCount: 1000 } as { rowCount?: number } }
    )
    await loadFirst(result)
    rerender({ rowCount: undefined })
    await act(async () => result.current.records.addFilter(perth))
    await view(result, 0, 15)
    await view(result, 40, 60)
    expect(result.current.records.range!.total).toBe(70)
  })

  it('starts over when the zone changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeZone }: { timeZone: string }) =>
        useRangeHarness({ total: 1000, rowCount: 1000, timeZone }),
      { initialProps: { timeZone: 'Australia/Perth' } }
    )
    await loadFirst(result)
    const before = result.current.records.range!.key
    rerender({ timeZone: 'Australia/Sydney' })
    expect(result.current.records.range!.key).not.toBe(before)
    expect(result.current.records.range!.rowAt(0)).toBeUndefined()
  })

  it('starts over when a new now moves a relative date, and not otherwise', async () => {
    const upcoming: RecordFilter = {
      field: 'starts',
      operator: 'within',
      value: 'upcoming'
    }
    const { result, rerender } = renderHook(
      ({ now, filters }: { now: Date; filters: RecordFilter[] }) =>
        useRangeHarness({
          total: 1000,
          rowCount: 1000,
          timeZone: 'Australia/Perth',
          now,
          defaultView: { query: { filters } }
        }),
      {
        initialProps: {
          now: new Date('2026-10-03T00:00:00Z'),
          filters: [] as RecordFilter[]
        }
      }
    )
    await loadFirst(result)
    rerender({ now: new Date('2026-10-04T00:00:00Z'), filters: [] })
    expect(result.current.records.range!.rowAt(0)?.id).toBe('show-0')

    const dated = renderHook(
      ({ now }: { now: Date }) =>
        useRangeHarness({
          total: 1000,
          rowCount: 1000,
          timeZone: 'Australia/Perth',
          now,
          defaultView: { query: { filters: [upcoming] } }
        }),
      { initialProps: { now: new Date('2026-10-03T00:00:00Z') } }
    )
    await loadFirst(dated.result)
    expect(dated.result.current.records.range!.rowAt(0)?.id).toBe('show-0')
    dated.rerender({ now: new Date('2026-10-04T00:00:00Z') })
    expect(dated.result.current.records.range!.rowAt(0)).toBeUndefined()
  })

  it('asks for a whole page past a count that may be stale', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 3 })
    )
    await loadFirst(result)
    await act(async () => result.current.records.setPageSize(20))
    await view(result, 0, 2)
    expect(requests(result).at(-1)).toEqual({ start: 0, end: 20 })
  })

  it('asks no further than a count the server stopped at', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 10_000,
        rowCount: 10_000,
        rowCountExact: false,
        defaultPosition: { pageSize: 30 },
        respond: 'manual'
      })
    )
    await loadFirst(result)
    expect(result.current.records.resultCountExact).toBe(false)
    await view(result, 9980, 9999)
    expect(requests(result).at(-1)).toEqual({ start: 9990, end: 10_000 })
  })

  it('holds a floor with its count until the new query answers', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 10_000,
        rowCount: 10_000,
        rowCountExact: false,
        respond: 'manual'
      })
    )
    await loadFirst(result)
    await act(async () => result.current.records.addFilter(perth))
    expect(result.current.records.range!.count).toBe(10_000)
    expect(result.current.records.resultCountExact).toBe(false)
  })

  it('keeps only the rows a range asked for', async () => {
    const all = testShows(100)
    const { result } = renderHook(() =>
      useRecords({
        fields: showFields,
        getRowId: (row) => row.id,
        loadRange: ({ start }) =>
          Promise.resolve({ rows: all.slice(start, start + 60) })
      })
    )
    await act(async () => result.current.range!.show(0, 15))
    expect(result.current.range!.rowAt(49)?.id).toBe('show-49')
    expect(result.current.range!.rowAt(50)).toBeUndefined()
  })

  it('loads a new query after one with no matches', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 0, respond: 'manual' })
    )
    await loadFirst(result)
    expect(result.current.records.range!.count).toBe(0)
    await act(async () => result.current.records.addFilter(perth))
    expect(result.current.records.range!.count).toBe(50)
    await view(result, 0, 15)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
  })

  it('loads the rows a count that grows within a query adds', async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount: number }) =>
        useRangeHarness({ total: 120, rowCount, respond: 'manual' }),
      { initialProps: { rowCount: 120 } }
    )
    await loadFirst(result)
    await view(result, 100, 119)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 50, end: 100 },
      { start: 100, end: 150 }
    ])
    rerender({ rowCount: 125 })
    await act(async () => {
      result.current.calls.current[1]!.resolve()
      result.current.calls.current[2]!.resolve()
    })
    expect(result.current.records.range!.count).toBe(125)
    await view(result, 105, 124)
    expect(requests(result).slice(3)).toEqual([{ start: 100, end: 150 }])
    // The server has 120 rows, short of its count, so the page stays short.
    await act(async () => result.current.calls.current[3]!.resolve())
    await view(result, 105, 124)
    expect(requests(result)).toHaveLength(4)
  })

  it('loads the first record added to an empty list', async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount: number }) =>
        useRangeHarness({ total: 1, rowCount, respond: 'manual' }),
      { initialProps: { rowCount: 0 } }
    )
    await loadFirst(result)
    expect(result.current.records.range!.count).toBe(0)
    rerender({ rowCount: 1 })
    await view(result, 0, 0)
    expect(requests(result)).toEqual([{ start: 0, end: 50 }])
  })

  it('requests each range once under StrictMode', async () => {
    const { result } = renderHook(
      () => useRangeHarness({ total: 1000, respond: 'manual' }),
      { wrapper: StrictMode }
    )
    await view(result, 0, 15)
    expect(requests(result)).toEqual([{ start: 0, end: 50 }])
    expect(result.current.records.range!.loading).toBe(true)
  })

  it('asks again when a pending search gains a trailing space', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual' })
    )
    await search(result, 'Perth')
    await view(result, 0, 15)
    await search(result, 'Perth ')
    await view(result, 0, 15)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
  })

  it('asks for larger pages after the page size grows', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000, respond: 'manual' })
    )
    await loadFirst(result)
    await act(async () => result.current.records.setPageSize(100))
    await view(result, 40, 70)
    expect(requests(result).slice(1)).toContainEqual({ start: 0, end: 100 })
  })

  it('drops a reply for a query that changed and came back', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual' })
    )
    await view(result, 0, 15)
    await act(async () => result.current.records.addFilter(perth))
    await act(async () => result.current.records.removeFilter(0))
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.resolve())
    expect(result.current.records.range!.loading).toBe(true)
    expect(result.current.records.range!.rowAt(0)).toBeUndefined()
    await act(async () => result.current.calls.current[1]!.resolve())
    expect(result.current.records.range!.loading).toBe(false)
    expect(result.current.records.range!.rowAt(0)?.id).toBe('show-0')
  })

  it('gives index ids from the index in the list', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 1000,
        rowCount: 1000,
        getRowId: undefined
      })
    )
    await loadFirst(result)
    await view(result, 120, 135)
    expect(result.current.records.range!.rowAt(120)?.id).toBe('120')
  })

  it('starts the row over on a search, filter or sort change', async () => {
    const onPositionChange = vi.fn()
    const { result } = renderHook(() =>
      useRangeHarness({ total: 100, onPositionChange })
    )
    const row = () => result.current.records.position.row
    await act(async () => result.current.records.setRow(40))
    expect(row()).toBe(40)
    await search(result, 'x')
    expect(row()).toBe(0)

    await act(async () => result.current.records.setRow(40))
    await act(async () => result.current.records.addFilter(perth))
    expect(row()).toBe(0)

    await act(async () => result.current.records.setRow(40))
    await act(async () => result.current.records.clearQuery())
    expect(row()).toBe(0)

    await act(async () => result.current.records.setRow(40))
    await act(async () =>
      result.current.records.setSort([
        { field: 'sold', direction: 'descending' }
      ])
    )
    expect(row()).toBe(0)
  })

  it('reports a new row once and skips an unchanged one', async () => {
    const onPositionChange = vi.fn()
    const { result } = renderHook(() =>
      useRangeHarness({ total: 100, onPositionChange })
    )
    await act(async () => result.current.records.setRow(30))
    expect(onPositionChange).toHaveBeenCalledTimes(1)
    expect(onPositionChange).toHaveBeenLastCalledWith({
      page: 0,
      pageSize: 50,
      row: 30
    })
    expect(result.current.records.position.row).toBe(30)
    await act(async () => result.current.records.setRow(30))
    expect(onPositionChange).toHaveBeenCalledTimes(1)
  })

  it('keeps the row to itself when nobody listens', async () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useRangeHarness({ total: 100 }).records
    })
    const before = renders
    await act(async () => result.current.setRow(30))
    expect(renders).toBe(before)
    expect(result.current.position.row).toBe(0)
  })

  it('counts and clears an all-matching selection like the server', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000, selectable: true })
    )
    await loadFirst(result)
    expect(
      result.current.records.countSelection({
        allMatching: true,
        except: ['a']
      })
    ).toBe(999)
    await act(async () => result.current.records.selectAllMatching())
    expect(result.current.records.selection).toEqual({
      allMatching: true,
      except: []
    })
    await act(async () => result.current.records.addFilter(perth))
    expect(result.current.records.selection).toEqual({ ids: [] })
  })

  it('counts all-matching against the loaded rows without rowCount', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 100, selectable: true })
    )
    await view(result, 0, 15)
    expect(result.current.records.range!.total).toBeUndefined()
    expect(
      result.current.records.countSelection({
        allMatching: true,
        except: ['a']
      })
    ).toBe(49)
    expect(result.current.records.countSelection({ ids: ['a', 'b'] })).toBe(2)
  })

  it('selects the loaded rows as its page', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000, selectable: true })
    )
    await view(result, 0, 15)
    await act(async () => result.current.records.selectPage(true))
    expect(result.current.records.selectedCount).toBe(50)
  })

  it('never clamps the page, and has one', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { result } = renderHook(() =>
      useRangeHarness({ total: 0, defaultPosition: { page: 3 } })
    )
    expect(result.current.records.position.page).toBe(3)
    expect(result.current.records.pageCount).toBe(1)
  })

  describe('dev warnings', () => {
    it('warns once when given a page', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { rerender } = renderHook(() =>
        useRangeHarness({ total: 100, defaultPosition: { page: 2 } })
      )
      rerender()
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange ignore the page: the list scrolls, and position.row keeps the place.'
        ]
      ])
    })

    it('warns once without getRowId', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { rerender } = renderHook(() =>
        useRecords<TestShow>({
          fields: showFields,
          selectable: true,
          loadRange: async () => ({ rows: [] })
        })
      )
      rerender()
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange need getRowId, so a selection survives refetching.'
        ]
      ])
    })

    it('warns once and caps the count above the row limit', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result, rerender } = renderHook(() =>
        useRangeHarness({ total: 0, rowCount: MAX_RANGE_ROWS + 1 })
      )
      await loadFirst(result)
      rerender()
      expect(result.current.records.range!.count).toBe(MAX_RANGE_ROWS)
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
        ]
      ])
    })

    it(
      'warns once and stops at the row limit without a count',
      { timeout: 30_000 },
      async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const rows = Array.from<TestShow>({ length: MAX_RANGE_ROWS }).fill(
          testShows(1)[0]!
        )
        const { result, rerender } = renderHook(() =>
          useRecords<TestShow>({
            fields: showFields,
            getRowId: (row) => row.id,
            defaultPosition: { pageSize: MAX_RANGE_ROWS },
            loadRange: async () => ({ rows })
          })
        )
        await act(async () => result.current.range!.show(0, 15))
        rerender()
        expect(result.current.range!.count).toBe(MAX_RANGE_ROWS)
        expect(warn.mock.calls).toEqual([
          [
            '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
          ]
        ])
      }
    )

    it('stays quiet for a long browser list', { timeout: 30_000 }, () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      renderHook(() =>
        useRecords({
          data: Array.from<TestShow>({ length: MAX_RANGE_ROWS }).fill(
            testShows(1)[0]!
          ),
          fields: showFields
        })
      )
      expect(warn).not.toHaveBeenCalled()
    })

    it('stays quiet for a large paged server count', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      renderHook(() =>
        useRecords({
          data: testShows(3),
          fields: showFields,
          rowCount: MAX_RANGE_ROWS + 1
        })
      )
      expect(warn).not.toHaveBeenCalled()
    })
  })
})
