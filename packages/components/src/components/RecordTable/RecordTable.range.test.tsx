import { useMemo, useRef, useState } from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RecordTable, type RecordTableProps } from '.'
import type { RecordsBulkAction } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { bulkBar, countMenuItems, showColumns } from './testUtils'

type Span = { start: number; end: number }

function Ranged({
  total = 5000,
  rowCount,
  rowCountExact,
  respond = 'sync',
  failFirst = false,
  failAt,
  spans,
  ...props
}: {
  total?: number
  /** The count each range's result carries. */
  rowCount?: number
  rowCountExact?: boolean
  respond?: 'sync' | 'never' | 'empty'
  /** Rejects the first request and shows the error until the next. */
  failFirst?: boolean
  /** Rejects the first request for the range starting here, with no error prop. */
  failAt?: number
  spans?: Span[]
} & Partial<RecordTableProps<TestShow>>) {
  const all = useMemo(() => testShows(total), [total])
  const [error, setError] = useState(false)
  const failed = useRef(false)
  const failedAt = useRef(false)
  return (
    <RecordTable
      caption='Shows'
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      error={error}
      loadRange={async ({ start, end }) => {
        spans?.push({ start, end })
        setError(false)
        if (failFirst && !failed.current) {
          failed.current = true
          setError(true)
          throw new Error('Offline')
        }
        if (start === failAt && !failedAt.current) {
          failedAt.current = true
          throw new Error('Offline')
        }
        if (respond === 'never') return new Promise(() => {})
        return {
          rows: respond === 'empty' ? [] : all.slice(start, end),
          rowCount,
          rowCountExact
        }
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

function SearchedRanged({
  counted = false,
  loads
}: {
  /** Each range's result carries the count of matches. */
  counted?: boolean
  loads?: string[]
}) {
  const all = useMemo(() => testShows(500), [])
  return (
    <RecordTable
      caption='Shows'
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      loadRange={async ({ query, start, end }) => {
        loads?.push(`${query.search} ${start}`)
        await Promise.resolve()
        const needle = query.search.trim().toLowerCase()
        const matching = all.filter((row) =>
          `${row.show} ${row.city}`.toLowerCase().includes(needle)
        )
        return {
          rows: matching.slice(start, end),
          ...(counted && { rowCount: matching.length })
        }
      }}
    />
  )
}

describe('RecordTable range mode', () => {
  it.each([
    ['with a count', true],
    ['without a count', false]
  ] as const)(
    'loads a new search, even one that only gains a trailing space (%s)',
    { timeout: 20_000 },
    async (_, counted) => {
      const user = userEvent.setup()
      const loads: string[] = []
      render(<SearchedRanged counted={counted} loads={loads} />)
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
      render(<SearchedRanged counted />)
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
      render(<SearchedRanged counted />)
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
        fields={showFields}
        columns={showColumns}
        // A shifting offset API repeats the record on the boundary.
        getRowId={(row) => (row.id === 'show-50' ? 'show-49' : row.id)}
        bulkActions={bulkActions}
        defaultPosition={{ pageSize: 100 }}
        loadRange={async ({ start, end }) =>
          start < 100
            ? { rows: shows.slice(start, end) }
            : new Promise(() => {})
        }
      />
    )
    await waitFor(() => expect(dataRows().length).toBeGreaterThan(0))
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
      expect.objectContaining({
        selection: { ids: ['show-4000'] }
      })
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

  it('reads a count the server stopped at as a floor', async () => {
    render(
      <Ranged
        total={12000}
        rowCount={10_000}
        rowCountExact={false}
        recordName={{ one: 'show', other: 'shows' }}
      />
    )
    await settle()
    expect(footer()!.textContent).toBe('10,000+ shows')
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
