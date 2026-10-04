import { useMemo, useRef, useState } from 'react'

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  type RecordPosition,
  type RecordView,
  placeRange
} from '@oztix/roadie-core/records'

import { RecordTable, type RecordTableProps } from '.'
import type { RecordsBulkAction } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { failedRowAt } from './RecordTableRangeError'
import { firstVisibleRow, stuckInset } from './rowPosition'
import { bulkBar, countMenuItems, showColumns } from './testUtils'

const EMPTY_VIEW: RecordView = {
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'table' }
}

type Span = { start: number; end: number }

function Ranged({
  total = 5000,
  respond = 'sync',
  failFirst = false,
  failAt,
  spans,
  ...props
}: {
  total?: number
  respond?: 'sync' | 'never' | 'empty'
  /** Rejects the first request and shows the error until the next. */
  failFirst?: boolean
  /** Rejects the first request for the range starting here, with no error prop. */
  failAt?: number
  spans?: Span[]
} & Partial<RecordTableProps<TestShow>>) {
  const all = useMemo(() => testShows(total), [total])
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  const [error, setError] = useState(false)
  const failed = useRef(false)
  const failedAt = useRef(false)
  return (
    <RecordTable
      caption='Shows'
      data={data}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      error={error}
      loadRange={({ start, end }) => {
        spans?.push({ start, end })
        setError(false)
        if (failFirst && !failed.current) {
          failed.current = true
          setError(true)
          return Promise.reject(new Error('Offline'))
        }
        if (start === failAt && !failedAt.current) {
          failedAt.current = true
          return Promise.reject(new Error('Offline'))
        }
        if (respond === 'never') return new Promise<void>(() => {})
        if (respond === 'empty') return
        setData((current) => placeRange(current, start, all.slice(start, end)))
      }}
      {...props}
    />
  )
}

const settle = () => act(async () => {})
const dataRows = () =>
  document.querySelectorAll('[data-slot="record-table-row"]')
const placeholders = () =>
  document.querySelectorAll('[data-slot="record-table-placeholder-row"]')
const status = () =>
  document.querySelector('[data-slot="records-status"]')!.textContent

// The docs example: rows kept with the consumer's own key, which a trailing space changes.
function KeyedRanged({
  rowCount,
  loads
}: {
  rowCount?: number
  loads: string[]
}) {
  const all = useMemo(() => testShows(500), [])
  const [view, setView] = useState<RecordView>(EMPTY_VIEW)
  const key = JSON.stringify(view.query)
  const [result, setResult] = useState<{
    key: string
    data: (TestShow | undefined)[]
  }>({ key, data: [] })
  if (result.key !== key) setResult({ key, data: [] })
  return (
    <RecordTable
      caption='Shows'
      data={result.data}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      rowCount={rowCount}
      view={view}
      onViewChange={setView}
      loadRange={async ({ start, end }) => {
        loads.push(`${view.query.search} ${start}`)
        await Promise.resolve()
        setResult((current) =>
          current.key === key
            ? {
                key,
                data: placeRange(current.data, start, all.slice(start, end))
              }
            : current
        )
      }}
    />
  )
}

// The docs example: the total arrives with each range and is kept across a new query until then.
function CountedRanged() {
  const all = useMemo(() => testShows(500), [])
  const [view, setView] = useState<RecordView>(EMPTY_VIEW)
  const key = JSON.stringify(view.query)
  const [result, setResult] = useState<{
    key: string
    data: (TestShow | undefined)[]
    rowCount?: number
  }>({ key, data: [] })
  if (result.key !== key) setResult({ ...result, key, data: [] })
  return (
    <RecordTable
      caption='Shows'
      data={result.data}
      rowCount={result.rowCount}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      view={view}
      onViewChange={setView}
      loadRange={async ({ start, end }) => {
        await Promise.resolve()
        const needle = view.query.search.toLowerCase()
        const matching = all.filter((row) =>
          row.show.toLowerCase().includes(needle)
        )
        setResult((current) =>
          current.key === key
            ? {
                key,
                rowCount: matching.length,
                data: placeRange(
                  current.data,
                  start,
                  matching.slice(start, end)
                )
              }
            : current
        )
      }}
    />
  )
}

describe('RecordTable range mode', () => {
  it.each([
    ['with rowCount', 500],
    ['without rowCount', undefined]
  ] as const)(
    'loads a new search, then rows a consumer cleared for a key the table shares (%s)',
    { timeout: 20_000 },
    async (_, rowCount) => {
      const user = userEvent.setup()
      const loads: string[] = []
      render(<KeyedRanged rowCount={rowCount} loads={loads} />)
      const search = screen.getByRole('combobox', { name: 'Search and filter' })
      const loaded = async (key: string) => {
        await waitFor(() => expect(loads).toContain(`${key} 0`))
        await waitFor(() => expect(placeholders()).toHaveLength(0))
        expect(dataRows().length).toBeGreaterThan(0)
      }
      await user.type(search, 'Perth')
      await loaded('Perth')
      await user.type(search, ' ')
      await loaded('Perth ')
    }
  )

  it(
    'loads again after a search with no matches is cleared',
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup()
      render(<CountedRanged />)
      await waitFor(() => expect(dataRows().length).toBeGreaterThan(0))
      const search = screen.getByRole('combobox', { name: 'Search and filter' })
      await user.type(search, 'zzzz')
      await waitFor(() =>
        expect(screen.getByText('No records match')).toBeInTheDocument()
      )
      await user.clear(search)
      await waitFor(() => expect(dataRows().length).toBeGreaterThan(0))
    }
  )

  it(
    'fills the first page after a query with fewer matches',
    { timeout: 20_000 },
    async () => {
      const user = userEvent.setup()
      render(<CountedRanged />)
      await waitFor(() => expect(dataRows().length).toBeGreaterThan(0))
      const search = screen.getByRole('combobox', { name: 'Search and filter' })
      await user.type(search, 'Ocean Alley 7')
      await waitFor(() => expect(dataRows()).toHaveLength(11))
      await user.clear(search)
      await waitFor(() => expect(placeholders()).toHaveLength(0))
      expect(dataRows().length).toBeGreaterThan(11)
    }
  )

  it('sizes the table for rowCount without pagination', async () => {
    const spans: Span[] = []
    render(<Ranged rowCount={5000} spans={spans} />)
    await settle()
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '5001')
    expect(dataRows()[0]).toHaveAttribute('aria-rowindex', '2')
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).toBeNull()
    expect(spans[0]).toEqual({ start: 0, end: 50 })
  })

  it('shows static placeholders while a range loads', async () => {
    render(<Ranged rowCount={5000} respond='never' />)
    await settle()
    expect(placeholders().length).toBeGreaterThan(0)
    expect(dataRows()).toHaveLength(0)
    for (const row of placeholders()) {
      expect(row).toHaveAttribute('aria-hidden', 'true')
      expect(row.outerHTML).not.toMatch(/animate-(?!none)/)
    }
    expect(screen.getByRole('table', { hidden: true })).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(
      document.querySelector('[data-slot="record-table-scroller"]')
    ).not.toHaveClass('opacity-60')
  })

  it('ends at a short range without rowCount', async () => {
    render(<Ranged total={30} defaultView={{ query: { search: 'a' } }} />)
    await settle()
    // jsdom's window paints only the first rows, so the count stands in for 30 rows.
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '31')
    expect(dataRows().length).toBeGreaterThan(0)
    expect(placeholders()).toHaveLength(0)
    await waitFor(() => expect(status()).toBe('30 results'))
  })

  it('announces no count and an unknown row count while more may come', async () => {
    render(<Ranged total={120} defaultView={{ query: { search: 'a' } }} />)
    await settle()
    expect(dataRows().length).toBeGreaterThan(0)
    expect(status()).toBe('')
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '-1')
  })

  it('announces loading on the first range', async () => {
    render(<Ranged respond='never' />)
    await settle()
    expect(status()).toBe('Loading')
  })

  it('keys range rows by index, so duplicate ids never collide', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Ranged rowCount={5000} getRowId={() => 'same'} />)
    await settle()
    expect(dataRows().length).toBeGreaterThan(1)
    expect(
      error.mock.calls.some(([message]) => String(message).includes('same key'))
    ).toBe(false)
    error.mockRestore()
  })

  it('shows the empty state when the first range is empty', async () => {
    render(<Ranged respond='empty' />)
    await settle()
    expect(screen.getByText('No records yet')).toBeInTheDocument()
  })

  const bulkActions: RecordsBulkAction[] = [
    { label: 'Archive', onAction: () => {} }
  ]

  it('offers every matching row only once the total is known', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Ranged total={120} bulkActions={bulkActions} />)
    await settle()
    await user.click(
      screen.getByRole('checkbox', { name: 'Select loaded rows' })
    )
    expect(bulkBar()).toHaveTextContent('50 selected')
    expect(await countMenuItems(user)).toEqual(['Clear selection'])
    unmount()

    render(<Ranged rowCount={5000} bulkActions={bulkActions} />)
    await settle()
    await user.click(
      screen.getByRole('checkbox', { name: 'Select loaded rows' })
    )
    expect(await countMenuItems(user)).toContain('Select all 5,000 records')
  })

  it('offers no select all while the total is unknown, even with a repeated id', async () => {
    const user = userEvent.setup()
    const shows = testShows(100)
    render(
      <RecordTable
        caption='Shows'
        data={shows}
        fields={showFields}
        columns={showColumns}
        // A shifting offset API repeats the record on the boundary.
        getRowId={(row) => (row.id === 'show-50' ? 'show-49' : row.id)}
        bulkActions={bulkActions}
        loadRange={() => new Promise<void>(() => {})}
      />
    )
    await settle()
    await user.click(
      screen.getByRole('checkbox', { name: 'Select loaded rows' })
    )
    expect(await countMenuItems(user)).toEqual(['Clear selection'])
  })

  it('runs onRetry from an inline range error too', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <Ranged
        rowCount={5000}
        failAt={10}
        onRetry={onRetry}
        defaultPosition={{ pageSize: 10 }}
      />
    )
    await settle()
    const error = document.querySelector<HTMLElement>(
      '[data-slot="record-table-range-error"]'
    )!
    await user.click(within(error).getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('submits the selection as held, like server mode', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <Ranged
        rowCount={5000}
        bulkActions={[{ label: 'Archive', onAction }]}
        defaultSelection={{ ids: ['show-4000'] }}
      />
    )
    await settle()
    await user.click(screen.getByRole('button', { name: 'Archive' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-4000'] },
      expect.anything()
    )
  })

  it('labels the header checkbox by mode', async () => {
    const { unmount } = render(<Ranged rowCount={5000} selectable />)
    await settle()
    expect(
      screen.getByRole('checkbox', { name: 'Select loaded rows' })
    ).toHaveAttribute('data-slot', 'record-table-page-checkbox')
    unmount()

    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        selectable
      />
    )
    expect(
      screen.getByRole('checkbox', { name: 'Select page' })
    ).toHaveAttribute('data-slot', 'record-table-page-checkbox')
  })

  it.each([
    ['with rowCount', 5000],
    ['without rowCount', undefined]
  ] as const)(
    'shows a rejected range as the error state with no error prop (%s)',
    async (_, rowCount) => {
      const user = userEvent.setup()
      const spans: Span[] = []
      render(
        <Ranged rowCount={rowCount} failFirst error={false} spans={spans} />
      )
      await settle()
      const error = document.querySelector<HTMLElement>(
        '[data-slot="records-error"]'
      )!
      expect(error).toHaveTextContent("Couldn't load records")
      await user.click(within(error).getByRole('button', { name: 'Retry' }))
      await settle()
      expect(spans).toHaveLength(2)
      expect(document.querySelector('[data-slot="records-error"]')).toBeNull()
      expect(dataRows().length).toBeGreaterThan(0)
    }
  )

  it('keeps focus in the table when Retry replaces the error state', async () => {
    const user = userEvent.setup()
    render(<Ranged rowCount={5000} failFirst />)
    await settle()
    const retry = within(
      document.querySelector<HTMLElement>('[data-slot="records-error"]')!
    ).getByRole('button', { name: 'Retry' })
    retry.focus()
    await user.keyboard('{Enter}')
    await settle()
    expect(document.activeElement).toBe(
      document.querySelector('[data-slot="record-table-scroller"]')
    )
  })

  it('keeps focus in the table when Retry brings the empty state', async () => {
    const user = userEvent.setup()
    render(<Ranged failFirst respond='empty' />)
    await settle()
    within(document.querySelector<HTMLElement>('[data-slot="records-error"]')!)
      .getByRole('button', { name: 'Retry' })
      .focus()
    await user.keyboard('{Enter}')
    await settle()
    expect(screen.getByText('No records yet')).toBeInTheDocument()
    expect(document.activeElement).toBe(
      document.querySelector('[data-slot="record-table-scroller"]')
    )
  })

  it('retries the failed range without an onRetry option', async () => {
    const user = userEvent.setup()
    const spans: Span[] = []
    render(<Ranged rowCount={5000} failFirst spans={spans} />)
    await settle()
    const error = document.querySelector<HTMLElement>(
      '[data-slot="records-error"]'
    )!
    expect(spans).toEqual([{ start: 0, end: 50 }])
    await user.click(within(error).getByRole('button', { name: 'Retry' }))
    await settle()
    expect(spans).toEqual([
      { start: 0, end: 50 },
      { start: 0, end: 50 }
    ])
    expect(dataRows().length).toBeGreaterThan(0)
  })
})

describe('RecordTable range failure after rows loaded', () => {
  const tenAtATime = { pageSize: 10 }
  const inlineError = () =>
    document.querySelector<HTMLElement>(
      '[data-slot="record-table-range-error"]'
    )

  it.each([
    ['with rowCount', 5000],
    ['without rowCount', undefined]
  ] as const)(
    'keeps the loaded rows and shows the error in place of the failed range (%s)',
    async (_, rowCount) => {
      const user = userEvent.setup()
      const spans: Span[] = []
      render(
        <Ranged
          rowCount={rowCount}
          failAt={10}
          spans={spans}
          defaultPosition={tenAtATime}
          recordName={{ one: 'show', other: 'shows' }}
        />
      )
      await settle()
      expect(document.querySelector('[data-slot="records-error"]')).toBeNull()
      const loaded = dataRows().length
      expect(loaded).toBeGreaterThanOrEqual(10)
      const error = inlineError()!
      expect(error).toHaveTextContent("Couldn't load more shows")
      expect(error).toHaveAttribute('aria-rowindex', '12')
      expect(status()).toBe("Couldn't load more shows")
      const before = spans.length
      await user.click(within(error).getByRole('button', { name: 'Retry' }))
      await settle()
      expect(document.activeElement).toBe(
        document.querySelector('[data-slot="record-table-scroller"]')
      )
      expect(spans.slice(before)).toContainEqual({ start: 10, end: 20 })
      expect(spans.slice(before)).not.toContainEqual({ start: 0, end: 10 })
      expect(inlineError()).toBeNull()
      expect(dataRows().length).toBeGreaterThan(loaded)
    }
  )
})

describe('RecordTable range footer', () => {
  const footer = () =>
    document.querySelector('[data-slot="records-pagination"]')

  it('shows the total as a count of records', async () => {
    render(
      <Ranged
        total={1284}
        rowCount={1284}
        recordName={{ one: 'show', other: 'shows' }}
      />
    )
    await settle()
    expect(footer()!.textContent).toBe('1,284 shows')
    expect(footer()!.querySelector('button')).toBeNull()
  })

  it('shows only the count, with no page buttons or page size, loading by range', async () => {
    render(
      <Ranged
        total={240}
        rowCount={240}
        recordName={{ one: 'show', other: 'shows' }}
      />
    )
    await settle()
    expect(footer()!.textContent).toBe('240 shows')
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous page' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).toBeNull()
  })

  it('keeps page buttons and page size on a paged table', () => {
    render(
      <RecordTable
        data={testShows(240)}
        fields={showFields}
        columns={showColumns}
        recordName={{ one: 'show', other: 'shows' }}
      />
    )
    expect(footer()!.textContent).toContain('1–50 of 240')
    expect(
      screen.getByRole('button', { name: 'Next page' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Previous page' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Rows per page' })
    ).toBeInTheDocument()
  })

  it('shows the loaded rows with a plus while the total is unknown', async () => {
    render(<Ranged total={1284} recordName={{ one: 'show', other: 'shows' }} />)
    await settle()
    expect(footer()!.textContent).toBe('50+ shows')
  })

  it('renders no footer before any rows load without a total', async () => {
    render(<Ranged respond='never' />)
    await settle()
    expect(footer()).toBeNull()
  })
})

describe('failedRowAt', () => {
  const range = (loaded: number, count = 10) => ({
    failed: [{ start: 0, end: 50 }],
    count,
    rowAt: (index: number) =>
      index < loaded ? { id: String(index), row: {} } : undefined
  })

  it('shows the error at the first row on screen', () => {
    expect(failedRowAt(range(0), 3, 3)).toEqual({ start: 0, error: true })
    expect(failedRowAt(range(0), 4, 3)).toEqual({ start: 0, error: false })
  })

  it('shows the error at the first row not loaded when part of the page is', () => {
    expect(failedRowAt(range(5), 5, 0)).toEqual({ start: 0, error: true })
    expect(failedRowAt(range(5), 6, 0)).toEqual({ start: 0, error: false })
  })

  it('keeps the error within the count', () => {
    expect(failedRowAt(range(5), 5, 30)).toEqual({ start: 0, error: true })
    expect(failedRowAt(range(5), 30, 30)).toEqual({ start: 0, error: false })
  })
})

describe('firstVisibleRow', () => {
  const items = [0, 1, 2, 3].map((index) => ({
    index,
    end: 100 + (index + 1) * 48
  }))

  it('finds the first row ending below the stuck header', () => {
    expect(firstVisibleRow(items, 100, 36)).toBe(0)
    expect(firstVisibleRow(items, 112, 36)).toBe(1)
    expect(firstVisibleRow(items, 160, 36)).toBe(2)
  })

  it('finds nothing past the window', () => {
    expect(firstVisibleRow(items, 400, 0)).toBeUndefined()
    expect(firstVisibleRow([], 0, 0)).toBeUndefined()
  })
})

describe('stuckInset', () => {
  it('measures from the scroller top to the stuck header bottom', () => {
    const { container } = render(
      <div data-slot='record-table-content'>
        <div data-slot='record-table-head' style={{ top: '12px' }} />
        <div data-testid='body' />
      </div>
    )
    const head = container.querySelector<HTMLElement>(
      '[data-slot="record-table-head"]'
    )!
    Object.defineProperty(head, 'offsetHeight', { value: 36 })
    expect(stuckInset(screen.getByTestId('body'))).toBe(48)
    head.style.top = 'var(--pane-header-height, 0px)'
    expect(stuckInset(screen.getByTestId('body'))).toBe(36)
  })

  it('is zero outside a table', () => {
    const { container } = render(<div />)
    expect(stuckInset(container)).toBe(0)
  })
})

// jsdom has no layout, so the window stands in as the scroll element.
function scrollWindowTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  act(() => {
    window.dispatchEvent(new Event('scroll'))
  })
}

describe('RecordTable range position', () => {
  afterEach(() => {
    scrollWindowTo(0)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('never jumps back to an echo of a row it reported', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // Laid out at the page's top, so the table's offset holds as the window scrolls.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, -window.scrollY, 0, 0)
    )
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const reported: number[] = []
    let applied: Required<RecordPosition> = { page: 0, pageSize: 50, row: 0 }
    function Echoing() {
      const [position, setPosition] = useState<RecordPosition>({})
      return (
        <>
          <button
            type='button'
            onClick={() =>
              setPosition((current) => ({ ...current, row: 3000 }))
            }
          >
            Go to row 3000
          </button>
          <Ranged
            rowCount={5000}
            position={position}
            onPositionChange={(next) => {
              reported.push(next.row)
              // An async router applies each URL some time after the push.
              setTimeout(() => {
                applied = next
                setPosition(next)
              }, 400)
            }}
          />
        </>
      )
    }
    render(<Echoing />)
    await settle()
    // The virtualiser scrolls itself to its initial offset on mount.
    scrollTo.mockClear()

    scrollWindowTo(120 * 48)
    expect(reported).toEqual([120])
    await act(() => vi.advanceTimersByTimeAsync(350))
    scrollWindowTo(150 * 48)
    expect(reported).toEqual([120, 150])
    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(applied.row).toBe(120)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(applied.row).toBe(150)
    expect(reported).toEqual([120, 150])
    expect(scrollTo).not.toHaveBeenCalled()

    // jsdom's page has no height, so the scroll clamps; that it scrolls is the point.
    fireEvent.click(screen.getByRole('button', { name: 'Go to row 3000' }))
    expect(scrollTo).toHaveBeenCalled()
  })
})
