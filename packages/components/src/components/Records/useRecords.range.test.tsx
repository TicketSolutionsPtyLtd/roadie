import { StrictMode, useMemo, useRef, useState } from 'react'

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type RecordFilter, placeRange } from '@oztix/roadie-core/records'

import { MAX_RANGE_ROWS } from './ranges'
import { type TestShow, showFields, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

type Call = {
  start: number
  end: number
  resolve: () => void
  /** Resolves without placing rows, as a consumer dropping a stale reply. */
  settle: () => void
  reject: (error: Error) => void
}

function useRangeHarness({
  total,
  rowCount,
  respond = 'sync',
  seed = 0,
  ...options
}: {
  total: number
  rowCount?: number
  respond?: 'sync' | 'manual'
  /** Rows already in `data` at mount, as from a cache or a remount. */
  seed?: number
} & Partial<UseRecordsOptions<TestShow>>) {
  const all = useMemo(() => testShows(total), [total])
  const [data, setData] = useState<(TestShow | undefined)[]>(() =>
    all.slice(0, seed)
  )
  const calls = useRef<Call[]>([])
  const records = useRecords({
    data,
    fields: showFields,
    getRowId: (row) => row.id,
    rowCount,
    loadRange: ({ start, end }) => {
      const fill = () =>
        setData((current) => placeRange(current, start, all.slice(start, end)))
      if (respond === 'sync') {
        calls.current.push({
          start,
          end,
          resolve() {},
          settle() {},
          reject() {}
        })
        return fill()
      }
      return new Promise<void>((resolve, reject) => {
        calls.current.push({
          start,
          end,
          resolve: () => {
            fill()
            resolve()
          },
          settle: resolve,
          reject
        })
      })
    },
    ...options
  })
  // A consumer whose own key changed while the records' didn't.
  const clear = () => setData([])
  return { records, calls, clear }
}

type Harness = { current: ReturnType<typeof useRangeHarness> }

const requests = (result: Harness) =>
  result.current.calls.current.map(({ start, end }) => ({ start, end }))

const view = (result: Harness, first: number, last: number) =>
  act(async () => result.current.records.range!.show(first, last))

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

  it.each(['sync', 'manual'] as const)(
    'sizes for rowCount and requests the window once (%s)',
    async (respond) => {
      const { result } = renderHook(() =>
        useRangeHarness({ total: 1000, rowCount: 1000, respond })
      )
      expect(result.current.records.range!.count).toBe(1000)
      expect(result.current.records.range!.total).toBe(1000)
      await view(result, 120, 135)
      expect(requests(result)).toEqual([
        { start: 100, end: 150 },
        { start: 150, end: 200 }
      ])
      await view(result, 120, 135)
      expect(requests(result)).toHaveLength(2)
    }
  )

  it('asks for ranges of the page size', async () => {
    const loadRange = vi.fn()
    const { result } = renderHook(() =>
      useRecords({
        data: [] as (TestShow | undefined)[],
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 1000,
        defaultPosition: { pageSize: 25 },
        loadRange
      })
    )
    await act(async () => result.current.range!.show(120, 135))
    expect(loadRange.mock.calls.map(([range]) => range)).toEqual([
      { start: 100, end: 125 },
      { start: 125, end: 150 },
      { start: 150, end: 175 }
    ])
  })

  it('grows a range at a time without rowCount, then stops at a short range', async () => {
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

  it('requests the first range without rowCount', async () => {
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
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.resolve())
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

  it('retries no window from an earlier query', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 5000, rowCount: 5000, respond: 'manual' })
    )
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
      useRecords({
        data: [] as (TestShow | undefined)[],
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

  it('ignores a reply for an earlier query', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual' })
    )
    await view(result, 0, 15)
    await search(result, 'Perth')
    await view(result, 0, 15)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
    await act(async () => result.current.calls.current[0]!.settle())
    expect(result.current.records.range!.loading).toBe(true)
    expect(result.current.records.range!.count).toBe(50)
    expect(result.current.records.range!.total).toBeUndefined()
  })

  it('starts over when the zone changes', async () => {
    const { result, rerender } = renderHook(
      ({ timeZone }: { timeZone: string }) =>
        useRangeHarness({ total: 1000, rowCount: 1000, timeZone }),
      { initialProps: { timeZone: 'Australia/Perth' } }
    )
    const before = result.current.records.range!.key
    rerender({ timeZone: 'Australia/Sydney' })
    expect(result.current.records.range!.key).not.toBe(before)
  })

  it('asks for a whole page past a count that may be stale', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 3, respond: 'manual' })
    )
    await view(result, 0, 2)
    expect(requests(result)).toEqual([{ start: 0, end: 50 }])
  })

  it('loads a list whose count reads 0 until a range of its query says so', async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount: number }) =>
        useRangeHarness({ total: 1000, rowCount, respond: 'manual' }),
      { initialProps: { rowCount: 0 } }
    )
    expect(result.current.records.range!.count).toBe(50)
    await view(result, 0, 15)
    expect(requests(result)).toEqual([{ start: 0, end: 50 }])
    await act(async () => result.current.calls.current[0]!.resolve())
    rerender({ rowCount: 1000 })
    expect(result.current.records.range!.count).toBe(1000)
  })

  it('shows an empty list once a range confirms a count of 0', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 0, rowCount: 0 })
    )
    await view(result, 0, 15)
    expect(result.current.records.range!.count).toBe(0)
    expect(result.current.records.range!.total).toBe(0)
  })

  it('loads a new query after one with no matches', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 0, respond: 'manual' })
    )
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.settle())
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
    await view(result, 100, 119)
    expect(requests(result)).toEqual([
      { start: 50, end: 100 },
      { start: 100, end: 150 }
    ])
    rerender({ rowCount: 125 })
    await view(result, 105, 124)
    expect(requests(result)).toHaveLength(2)
    await act(async () => {
      result.current.calls.current[0]!.resolve()
      result.current.calls.current[1]!.resolve()
    })
    await view(result, 105, 124)
    expect(requests(result).slice(2)).toEqual([{ start: 100, end: 150 }])
    // The server has 120 rows, short of its count, so the page stays short.
    await act(async () => result.current.calls.current[2]!.resolve())
    await view(result, 105, 124)
    expect(requests(result)).toHaveLength(3)
  })

  it('loads the first record added to an empty list', async () => {
    const { result, rerender } = renderHook(
      ({ rowCount }: { rowCount: number }) =>
        useRangeHarness({ total: 1, rowCount, respond: 'manual' }),
      { initialProps: { rowCount: 0 } }
    )
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.settle())
    expect(result.current.records.range!.count).toBe(0)
    rerender({ rowCount: 1 })
    await view(result, 0, 0)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
  })

  it('treats the rows a last page holds as held', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 120,
        rowCount: 120,
        respond: 'manual',
        seed: 120
      })
    )
    await view(result, 100, 119)
    expect(requests(result)).toEqual([])
  })

  it('never requests rows already held, with rowCount', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 1000,
        rowCount: 1000,
        respond: 'manual',
        seed: 100
      })
    )
    await view(result, 0, 15)
    await view(result, 60, 75)
    expect(requests(result)).toEqual([])
    await view(result, 80, 95)
    expect(requests(result)).toEqual([{ start: 100, end: 150 }])
  })

  it('continues from the page holding the last row held, without rowCount', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, respond: 'manual', seed: 120 })
    )
    await view(result, 100, 115)
    expect(requests(result)).toEqual([{ start: 100, end: 150 }])
  })

  it('requests each range once under StrictMode', async () => {
    const { result } = renderHook(
      () => useRangeHarness({ total: 1000, rowCount: 1000, respond: 'manual' }),
      { wrapper: StrictMode }
    )
    await view(result, 120, 135)
    expect(requests(result)).toEqual([
      { start: 100, end: 150 },
      { start: 150, end: 200 }
    ])
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
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.resolve())
    await act(async () => result.current.records.setPageSize(100))
    await view(result, 40, 70)
    expect(requests(result).slice(1)).toContainEqual({ start: 0, end: 100 })
  })

  it('ignores a reply for a query that changed and came back', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 70, respond: 'manual' })
    )
    await view(result, 0, 15)
    await act(async () => result.current.records.addFilter(perth))
    await act(async () => result.current.records.removeFilter(0))
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.settle())
    expect(result.current.records.range!.loading).toBe(true)
    await act(async () => result.current.calls.current[1]!.settle())
    expect(result.current.records.range!.loading).toBe(false)
  })

  it.each([
    ['with rowCount', 1000],
    ['without rowCount', undefined]
  ] as const)(
    'reloads rows the consumer cleared under the same key (%s)',
    async (_, rowCount) => {
      const { result } = renderHook(() =>
        useRangeHarness({ total: 1000, rowCount })
      )
      await view(result, 0, 15)
      expect(requests(result)).toEqual([{ start: 0, end: 50 }])
      await act(async () => result.current.clear())
      expect(requests(result)).toEqual([
        { start: 0, end: 50 },
        { start: 0, end: 50 }
      ])
      expect(result.current.records.range!.rowAt(0)?.id).toBe('show-0')
    }
  )

  it('ignores a reply from before the consumer cleared rows', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000, respond: 'manual' })
    )
    await view(result, 0, 15)
    await act(async () => result.current.calls.current[0]!.resolve())
    await view(result, 40, 55)
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 50, end: 100 }
    ])
    await act(async () => result.current.clear())
    expect(requests(result)).toEqual([
      { start: 0, end: 50 },
      { start: 50, end: 100 },
      { start: 0, end: 50 },
      { start: 50, end: 100 }
    ])
    await act(async () => result.current.calls.current[1]!.settle())
    expect(result.current.records.range!.loading).toBe(true)
    await act(async () => {
      result.current.calls.current[2]!.resolve()
      result.current.calls.current[3]!.resolve()
    })
    expect(result.current.records.range!.loading).toBe(false)
  })

  it('finds the loaded record at an index and nothing in a gap', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({ total: 1000, rowCount: 1000 })
    )
    await view(result, 120, 135)
    expect(result.current.records.range!.rowAt(120)).toEqual({
      id: 'show-120',
      row: expect.objectContaining({ id: 'show-120' })
    })
    expect(result.current.records.range!.rowAt(10)).toBeUndefined()
    expect(result.current.records.data).toHaveLength(100)
    expect(result.current.records.rows[0]!.id).toBe('show-100')
  })

  it('gives index ids from the index in data', async () => {
    const { result } = renderHook(() =>
      useRangeHarness({
        total: 1000,
        rowCount: 1000,
        getRowId: undefined
      })
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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
        useRecords({
          data: [] as (TestShow | undefined)[],
          fields: showFields,
          selectable: true,
          loadRange: () => {}
        })
      )
      rerender()
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange need getRowId, so a selection survives refetching.'
        ]
      ])
    })

    it('warns once and caps the count above the row limit', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result, rerender } = renderHook(() =>
        useRangeHarness({ total: 0, rowCount: MAX_RANGE_ROWS + 1 })
      )
      rerender()
      expect(result.current.records.range!.count).toBe(MAX_RANGE_ROWS)
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
        ]
      ])
    })

    it('warns once and stops at the row limit without rowCount', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const data = placeRange<TestShow>([], MAX_RANGE_ROWS - 1, testShows(1))
      const { result, rerender } = renderHook(() =>
        useRecords({
          data,
          fields: showFields,
          getRowId: (row) => row.id,
          loadRange: () => {}
        })
      )
      rerender()
      expect(result.current.range!.count).toBe(MAX_RANGE_ROWS)
      expect(warn.mock.calls).toEqual([
        [
          '[Roadie] Records with loadRange stop at 300,000 rows. Filter the list or use paged server mode.'
        ]
      ])
    })

    it('stays quiet for a long browser list', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      renderHook(() =>
        useRecords({
          data: placeRange<TestShow>([], MAX_RANGE_ROWS, testShows(1)).map(
            (row) => row ?? testShows(1)[0]!
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
