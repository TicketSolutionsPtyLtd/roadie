import {
  render,
  renderHook,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecordTable, type RecordTableProps } from '.'
import { useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { tableColumns } from './columns'
import { showColumns } from './testUtils'

afterEach(() => {
  vi.restoreAllMocks()
})

const SHOWS = testShows(120)
const SHOW = { one: 'show', other: 'shows' }
const count = new Intl.NumberFormat('en-AU')
const soldOf = (shows: readonly TestShow[]) =>
  shows.reduce((sum, show) => sum + (show.sold ?? 0), 0)

function Table(props: Partial<RecordTableProps<TestShow>>) {
  return (
    <RecordTable
      caption='Shows'
      data={SHOWS}
      fields={showFields}
      columns={showColumns}
      getRowId={(row) => row.id}
      recordName={SHOW}
      defaultPosition={{ pageSize: 10 }}
      {...props}
    />
  )
}

// By slot: an open search suggestion hides the table from role queries.
const totalsRow = () =>
  document.querySelector<HTMLElement>('[data-slot="record-table-totals"]')!
/** The totals row's cells by column, the label first. */
const totals = () =>
  Object.fromEntries(
    [...totalsRow().querySelectorAll('[role="rowheader"], [role="cell"]')]
      // The select column's cell, when there is one, holds nothing.
      .filter((cell) => !cell.hasAttribute('data-select'))
      .map((cell, index) => [
        ['show', 'city', 'sold', 'gross'][index],
        cell.textContent
      ])
  )

describe('RecordTable totals', () => {
  it('shows no totals row unless asked', () => {
    render(<Table />)
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument()
  })

  it('sums every record that matches, not the page', () => {
    render(<Table totals />)
    expect(
      screen.getByRole('rowheader', { name: 'Totals for 120 shows' })
    ).toBe(totalsRow().querySelector('[role="rowheader"]'))
    expect(totals()).toEqual({
      show: 'Totals for 120 shows',
      city: '',
      sold: count.format(soldOf(SHOWS)),
      gross: expect.stringMatching(/^\$/)
    })
  })

  it('follows the search', async () => {
    const user = userEvent.setup()
    render(<Table totals />)
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth'
    )
    const perth = SHOWS.filter((show) => show.city === 'Perth')
    await waitFor(() =>
      expect(totals().show).toBe(`Totals for ${perth.length} shows`)
    )
    expect(totals().sold).toBe(count.format(soldOf(perth)))
  })

  it('leaves a column with total: false, and a share, out of the sum', () => {
    const column = tableColumns<TestShow>(showFields)
    render(
      <Table
        totals
        fields={showFields.map((field) =>
          field.key === 'gross' ? { ...field, format: 'percent' } : field
        )}
        columns={[
          column.field('show', { pin: true }),
          column.field('city'),
          column.field('sold', { total: false }),
          column.field('gross')
        ]}
      />
    )
    expect(totals()).toMatchObject({ sold: '', gross: '' })
  })

  it("doesn't sum money whose rows name their own currency", () => {
    render(
      <Table
        totals
        fields={showFields.map((field) =>
          field.key === 'gross' ? { ...field, currencyKey: 'currency' } : field
        )}
      />
    )
    expect(totals().gross).toBe('')
  })

  it('shows the values given, in each field format, with a given label', () => {
    render(
      <Table
        data={SHOWS.slice(0, 10)}
        rowCount={120}
        totals={{ label: 'All shows', values: { sold: 12345, gross: 1250000 } }}
      />
    )
    expect(totals()).toEqual({
      show: 'All shows',
      city: '',
      sold: '12,345',
      gross: '$1.3m'
    })
  })

  it('labels server totals with the count, marked when it is a floor', () => {
    render(
      <Table
        data={SHOWS.slice(0, 10)}
        rowCount={10000}
        rowCountExact={false}
        totals={{ values: { sold: 1 } }}
      />
    )
    expect(totals().show).toBe('Totals for 10,000+ shows')
  })

  it('warns once, and shows nothing, when asked to sum a page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(
      <Table data={SHOWS.slice(0, 10)} rowCount={120} totals />
    )
    rerender(<Table data={SHOWS.slice(10, 20)} rowCount={120} totals />)
    expect(screen.queryByRole('rowheader')).not.toBeInTheDocument()
    expect(
      warn.mock.calls.filter(([message]) => String(message).includes('totals'))
    ).toHaveLength(1)
  })

  it('counts the totals row among the rows', () => {
    render(<Table totals />)
    const table = screen.getByRole('table')
    // Headings, totals, then 120 records.
    expect(table).toHaveAttribute('aria-rowcount', '122')
    expect(totalsRow()).toHaveAttribute('aria-rowindex', '2')
    const firstRecord = within(table).getAllByRole('row')[2]!
    expect(firstRecord).toHaveAttribute('aria-rowindex', '3')
  })

  it('takes totals a range resolves with', async () => {
    render(
      <RecordTable
        caption='Shows'
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        recordName={SHOW}
        loadRange={async ({ start, end }) => ({
          rows: SHOWS.slice(start, end),
          rowCount: SHOWS.length,
          totals: { values: { sold: 4321 } }
        })}
      />
    )
    await waitFor(() => expect(totals().sold).toBe('4,321'))
    expect(totals().show).toBe('Totals for 120 shows')
  })

  it("holds a range's totals while the next search loads, then takes its own", async () => {
    const user = userEvent.setup()
    let release = () => {}
    let searching = 0
    const searched = new Promise<void>((resolve) => {
      release = resolve
    })
    render(
      <RecordTable
        caption='Shows'
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        recordName={SHOW}
        loadRange={async ({ query, start, end }) => {
          if (!query.search)
            return {
              rows: SHOWS.slice(start, end),
              rowCount: SHOWS.length,
              totals: { values: { sold: 4321 } }
            }
          searching += 1
          await searched
          return { rows: SHOWS.slice(0, 5), rowCount: 5 }
        }}
      />
    )
    await waitFor(() => expect(totals().sold).toBe('4,321'))
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth'
    )
    await waitFor(() => expect(searching).toBeGreaterThan(0))
    expect(totals().sold).toBe('4,321')
    release()
    await waitFor(() => expect(totalsRow()).toBeNull())
  })

  it('counts the totals row among ranged rows', async () => {
    render(
      <RecordTable
        caption='Shows'
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        recordName={SHOW}
        totals={{ label: 'All shows' }}
        loadRange={async ({ start, end }) => ({
          rows: SHOWS.slice(start, end),
          rowCount: SHOWS.length,
          totals: { values: { sold: 4321 } }
        })}
      />
    )
    await waitFor(() => expect(totals().sold).toBe('4,321'))
    expect(totals().show).toBe('All shows')
    const table = screen.getByRole('table')
    expect(table).toHaveAttribute('aria-rowcount', '122')
    expect(
      within(table).getByRole('row', { name: /Ocean Alley 1\b/ })
    ).toHaveAttribute('aria-rowindex', '3')
  })

  it('resolves totals on the records for a custom layout', () => {
    const { result } = renderHook(() =>
      useRecords({ data: SHOWS, fields: showFields, totals: true })
    )
    expect(result.current.totals).toEqual({
      label: 'Totals for 120 records',
      values: expect.objectContaining({ sold: soldOf(SHOWS) })
    })
  })
})
