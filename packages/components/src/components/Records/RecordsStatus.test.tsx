import { useEffect, useRef } from 'react'

import { act, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Records } from '.'
import { type TestShow, showFields, testShows } from './testUtils'
import { type RecordsState, useRecordsState } from './useRecords'

const holder: { records?: RecordsState<TestShow> } = {}

function Shows({ selectable = false }: { selectable?: boolean }) {
  const records = useRecordsState({
    data: testShows(120),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable
  })
  useEffect(() => {
    holder.records = records
  })
  return (
    <Records.Root records={records} layouts={[]}>
      <Records.Status />
    </Records.Root>
  )
}

const status = () => screen.getByRole('status')

describe('Records.Status', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('announces the count once typing settles, not on every keystroke', () => {
    render(<Shows />)
    for (const search of ['P', 'Pe', 'Per', 'Pert', 'Perth']) {
      act(() => holder.records!.setSearch(search))
      act(() => vi.advanceTimersByTime(100))
      expect(status()).toHaveTextContent('')
    }
    act(() => vi.advanceTimersByTime(500))
    expect(status()).toHaveTextContent('24 results')
  })

  it('announces a selection at once, with the settled count', () => {
    render(<Shows selectable />)
    act(() => holder.records!.setSearch('Perth'))
    act(() => vi.advanceTimersByTime(600))
    act(() => holder.records!.toggleRow('show-3'))
    expect(status()).toHaveTextContent('1 selected, 24 results')
    act(() => holder.records!.clearSelection())
    expect(status()).toHaveTextContent('24 results')
  })

  // RecordsSelectMode.test.tsx covers the announcement where Select mode shows.
  it('keeps quiet about Select mode where no layout selects through it', () => {
    render(<Shows selectable />)
    act(() => holder.records!.setSelecting(true))
    expect(status()).not.toHaveTextContent('Select mode')
  })

  it('waits for a server search to load before announcing its count', () => {
    function Server({
      rowCount,
      loading
    }: {
      rowCount: number
      loading: boolean
    }) {
      const records = useRecordsState({
        data: testShows(50),
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount,
        loading,
        defaultView: { query: { search: 'Perth' } }
      })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Status />
        </Records.Root>
      )
    }
    const { rerender } = render(<Server rowCount={120} loading />)
    act(() => vi.advanceTimersByTime(1000))
    expect(status()).toHaveTextContent('')
    rerender(<Server rowCount={24} loading={false} />)
    act(() => vi.advanceTimersByTime(500))
    expect(status()).toHaveTextContent('24 results')
  })

  it('announces a count the server stopped at as a floor', () => {
    function Server() {
      const records = useRecordsState({
        data: testShows(50),
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 10_000,
        rowCountExact: false,
        defaultView: { query: { search: 'Perth' } }
      })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Status />
        </Records.Root>
      )
    }
    render(<Server />)
    act(() => vi.advanceTimersByTime(600))
    expect(status()).toHaveTextContent('10,000+ results')
  })
})

describe('Records.Pagination', () => {
  it('offers no Previous on a deep link that reads as the first page', () => {
    function Linked() {
      const records = useRecordsState({
        data: testShows(10),
        fields: showFields,
        rowCount: 10,
        loading: true,
        position: { page: 3, pageSize: 20 }
      })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Pagination />
        </Records.Root>
      )
    }
    render(<Linked />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('steps back from the page it shows for a deep link past the old count', async () => {
    vi.useRealTimers()
    const onPositionChange = vi.fn()
    function Linked() {
      const records = useRecordsState({
        data: testShows(10),
        fields: showFields,
        rowCount: 60,
        loading: true,
        position: { page: 3, pageSize: 20 },
        onPositionChange
      })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Pagination />
        </Records.Root>
      )
    }
    render(<Linked />)
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPositionChange).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      row: 0
    })
  })

  it('reads a page past the end, which the parent never clamped, as the last page', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    function Paged() {
      const records = useRecordsState({
        data: testShows(100),
        fields: showFields,
        position: { page: 3, pageSize: 50 }
      })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Pagination />
        </Records.Root>
      )
    }
    render(<Paged />)
    expect(screen.getByText('51–100 of 100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    vi.restoreAllMocks()
  })
})

describe('Records.Status in range mode', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function Ranged() {
    const loads = useRef(0)
    const records = useRecordsState<TestShow>({
      fields: showFields,
      getRowId: (row) => row.id,
      // The first query's range loads; the next one's never does.
      loadRange: async () =>
        loads.current++ === 0
          ? { rows: testShows(50), rowCount: 500 }
          : new Promise(() => {})
    })
    useEffect(() => {
      holder.records = records
    })
    return (
      <Records.Root records={records} layouts={[]}>
        <Records.Status />
      </Records.Root>
    )
  }

  it("announces loading, not the last query's count, while the new query's range loads", async () => {
    vi.useFakeTimers()
    render(<Ranged />)
    await act(async () => holder.records!.range!.show(0, 15))
    act(() =>
      holder.records!.addFilter({
        field: 'city',
        operator: 'is',
        values: ['Perth']
      })
    )
    act(() => holder.records!.range!.show(100, 115))
    expect(holder.records!.range!.loading).toBe(true)
    act(() => vi.advanceTimersByTime(600))
    expect(status()).toHaveTextContent('Loading')
  })
})
