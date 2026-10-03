import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { tableColumns, tableLayout } from '.'
import { Records, type UseRecordsOptions, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const column = tableColumns<TestShow>(showFields)
const layouts = [
  tableLayout([
    column.field('show', { pin: true }),
    column.field('status'),
    column.field('city')
  ])
]
const SHOWS = testShows(30)

type Options = Partial<UseRecordsOptions<TestShow>> & { rows?: number }

function Table({ rows = 30, ...options }: Options) {
  const records = useRecords({
    data: SHOWS.slice(0, rows),
    fields: showFields,
    getRowId: (row) => row.id,
    recordName: { one: 'show', other: 'shows' },
    ...options
  })
  return (
    <Records.Root records={records} layouts={layouts} caption='Shows'>
      <Records.Toolbar />
      <Records.Content />
      <Records.Pagination />
      <Records.Status />
    </Records.Root>
  )
}

const dataRows = () => screen.queryAllByRole('row').slice(1)
const inTable = (text: string) =>
  within(screen.getByRole('table')).getByText(text)
const skeletonRows = () =>
  document.querySelectorAll('[data-slot="record-table-skeleton"] [role="row"]')
const skeletons = () =>
  document.querySelectorAll('[data-slot="skeleton"]').length
const progress = () =>
  document.querySelector('[data-slot="record-table-progress"]')
const scroller = () =>
  document.querySelector('[data-slot="record-table-scroller"]')

describe('RecordTable loading', () => {
  it('keeps the rows dimmed, shows a bar and marks the table busy', () => {
    render(<Table loading />)
    expect(screen.getByRole('table', { name: 'Shows' })).toHaveAttribute(
      'aria-busy',
      'true'
    )
    expect(dataRows()).toHaveLength(30)
    expect(scroller()).toHaveClass('opacity-60')
    expect(progress()).toBeInTheDocument()
  })

  it('is not busy once loaded', () => {
    render(<Table />)
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy')
    expect(progress()).toBeNull()
  })

  it('shows static skeleton rows when there are no rows yet', () => {
    render(<Table rows={0} loading />)
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(skeletonRows()).toHaveLength(8)
    expect(document.querySelector('[data-slot="skeleton"]')).toHaveClass(
      'animate-none'
    )
    expect(skeletons()).toBe(24)
    expect(
      document.querySelector('[data-slot="record-table-skeleton"]')
    ).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText(/No shows/)).toBeNull()
  })

  it('caps skeleton rows at the page size', () => {
    render(<Table rows={0} loading defaultPosition={{ pageSize: 3 }} />)
    expect(skeletonRows()).toHaveLength(3)
  })

  it('announces Loading, reads 0 results and disables the pager', () => {
    render(<Table rows={0} loading />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.getByText('0 results')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })
})

describe('RecordTable error', () => {
  it('replaces the rows with a message and no Retry by default', () => {
    render(<Table error />)
    expect(inTable("Couldn't load shows")).toBeInTheDocument()
    expect(screen.queryByText('Ocean Alley 1')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
  })

  it('shows a string error as given, without the connection advice', () => {
    render(<Table error='The box office is offline' />)
    expect(inTable('The box office is offline')).toBeInTheDocument()
    expect(screen.queryByText("Couldn't load shows")).toBeNull()
    expect(
      screen.queryByText('Check your connection and try again.')
    ).toBeNull()
  })

  it('calls onRetry from the Retry button', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<Table error onRetry={onRetry} />)
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('announces the message in the live region', () => {
    render(<Table error />)
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't load shows")
  })

  it('drops the busy affordances over loading', () => {
    render(<Table loading error />)
    const table = screen.getByRole('table')
    expect(table).not.toHaveAttribute('aria-busy')
    expect(progress()).toBeNull()
    expect(inTable("Couldn't load shows")).toBeInTheDocument()
  })

  it('shows the error, not skeletons, with no rows', () => {
    render(<Table loading error rows={0} />)
    expect(inTable("Couldn't load shows")).toBeInTheDocument()
    expect(skeletons()).toBe(0)
  })

  it.each([0, 30])(
    'is quiet while it loads again, then announces (%i rows)',
    (rows) => {
      const { rerender } = render(<Table loading error rows={rows} />)
      expect(screen.getByRole('status')).toHaveTextContent('')
      rerender(<Table error rows={rows} />)
      expect(screen.getByRole('status')).toHaveTextContent(
        "Couldn't load shows"
      )
    }
  )
})

describe('RecordTable empty', () => {
  it('says there are none yet without a search or filter', () => {
    render(<Table rows={0} />)
    const empty = document.querySelector('[data-slot="records-empty"]')!
    expect(within(empty as HTMLElement).getByText('No shows yet')).toBeVisible()
    expect(
      within(empty as HTMLElement).getByText('Shows you add appear here.')
    ).toBeVisible()
    expect(within(empty as HTMLElement).queryByRole('button')).toBeNull()
  })

  it('says none match under a search and clears it', async () => {
    const user = userEvent.setup()
    render(<Table defaultView={{ query: { search: 'zzzz' } }} />)
    expect(screen.getByText('No shows match')).toBeInTheDocument()
    expect(
      screen.getByText('Try a different search or clear the filters.')
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Clear search and filters' })
    )
    expect(screen.queryByText('No shows match')).toBeNull()
    expect(dataRows()).toHaveLength(30)
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('treats a filter as filtering', () => {
    render(
      <Table
        defaultView={{
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Nowhere'] }]
          }
        }}
      />
    )
    expect(screen.getByText('No shows match')).toBeInTheDocument()
  })

  it('ignores filters on fields it does not know', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const view = {
      query: {
        filters: [{ field: 'venue', operator: 'is' as const, values: ['x'] }]
      }
    }
    const { rerender } = render(<Table defaultView={view} />)
    expect(dataRows()).toHaveLength(30)
    expect(screen.getByRole('status')).toHaveTextContent('')
    rerender(<Table defaultView={view} rows={0} />)
    expect(screen.getByText('No shows yet')).toBeInTheDocument()
    warn.mockRestore()
  })

  it('clears the search and filters through the view', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <Table
        rows={0}
        view={{
          query: {
            search: 'x',
            filters: [{ field: 'sold', operator: 'is-set' }],
            sort: []
          },
          layout: { type: 'table' }
        }}
        onViewChange={onViewChange}
      />
    )
    await user.click(
      screen.getByRole('button', { name: 'Clear search and filters' })
    )
    expect(onViewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { search: '', filters: [], sort: [] }
      }),
      expect.objectContaining({ page: 0 })
    )
  })
})

describe('RecordTable states as empty states', () => {
  const state = (slot: string) =>
    document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!

  it('shows the error in danger with a strong Retry', () => {
    render(<Table error onRetry={() => {}} />)
    const error = state('records-error')
    expect(error).toHaveClass('intent-danger')
    expect(
      within(error).getByText('Check your connection and try again.')
    ).toBeInTheDocument()
    expect(within(error).getByRole('button', { name: 'Retry' })).toHaveClass(
      'emphasis-strong'
    )
  })

  it.each([
    ['error', { error: true }, 'records-error'],
    ['empty', { rows: 0 }, 'records-empty'],
    [
      'no results',
      { defaultView: { query: { search: 'Nowhere' } } },
      'records-empty'
    ]
  ] as const)(
    'titles the %s state with a paragraph and hides its tile',
    (_, options, slot) => {
      render(<Table {...options} />)
      const element = state(slot)
      expect(
        within(screen.getByRole('table')).queryByRole('heading')
      ).toBeNull()
      expect(
        element.querySelector('[data-slot="empty-state-title"]')!.tagName
      ).toBe('P')
      expect(
        element.querySelector('[data-slot="empty-state-icon-tile"]')
      ).toHaveAttribute('aria-hidden', 'true')
    }
  )
})

describe('RecordTable status column', () => {
  it('shows each status as a badge with its intent and label', () => {
    render(<Table rows={4} />)
    const badges = dataRows().map((row) =>
      row.querySelector('[data-slot="badge"]')
    )
    expect(badges[0]).toHaveTextContent('On sale')
    expect(badges[0]).toHaveClass('intent-success', 'emphasis-normal')
    expect(badges[1]).toHaveTextContent('Sold out')
    expect(badges[1]).toHaveClass('intent-danger')
  })

  it('shows an unknown status as a neutral badge in its raw text', () => {
    const data = [{ ...SHOWS[0]!, status: 'disputed' }]
    render(<Table data={data} />)
    const badge = dataRows()[0]!.querySelector('[data-slot="badge"]')
    expect(badge).toHaveTextContent('disputed')
    expect(badge).toHaveClass('intent-neutral')
  })
})
