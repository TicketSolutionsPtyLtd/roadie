import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { RecordSelection, RecordView } from '@oztix/roadie-core/records'

import { type TestShow, showFields, testShows } from './testUtils'
import { useRecords } from './useRecords'

// A search that hasn't applied yet, as useDeferredValue holds one back while
// a long list filters.
const lag: { held?: string } = {}
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>()
  return {
    ...react,
    useDeferredValue: <T,>(value: T) =>
      (lag.held !== undefined ? lag.held : value) as T
  }
})

const shows = testShows(12)
const view = (search: string): RecordView => ({
  query: { search, filters: [], sort: [] },
  layout: { type: 'table' }
})

describe('useRecords selection while a search lags', () => {
  it('prunes a record picked before the search applied', async () => {
    const { result, rerender } = renderHook(
      ({ current }: { current: RecordView }) =>
        useRecords<TestShow>({
          data: shows,
          fields: showFields,
          getRowId: (row) => row.id,
          view: current,
          defaultSelection: { ids: ['show-1'] }
        }),
      { initialProps: { current: view('') } }
    )
    lag.held = ''
    rerender({ current: view('Ocean') })
    await act(() => result.current.toggleRow('show-0'))
    lag.held = undefined
    rerender({ current: view('Ocean') })
    expect(result.current.selection).toEqual({ ids: ['show-0'] })
  })

  it('reads an outside selection as outside, even when it equals an old pick', async () => {
    const { result, rerender } = renderHook(
      ({
        current,
        selection
      }: {
        current: RecordView
        selection: RecordSelection
      }) =>
        useRecords<TestShow>({
          data: shows,
          fields: showFields,
          getRowId: (row) => row.id,
          view: current,
          selection
        }),
      {
        initialProps: {
          current: view(''),
          selection: { ids: [] } as RecordSelection
        }
      }
    )
    await act(() => result.current.selectAllMatching())
    rerender({
      current: view(''),
      selection: { allMatching: true, except: [] }
    })
    rerender({ current: view(''), selection: { ids: [] } })
    await act(async () =>
      rerender({
        current: view('Ocean'),
        selection: { allMatching: true, except: [] }
      })
    )
    expect(result.current.selection).toEqual({ allMatching: true, except: [] })
  })
})
