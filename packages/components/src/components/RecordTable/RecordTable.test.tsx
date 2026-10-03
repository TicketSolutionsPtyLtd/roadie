import { fireEvent, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { RecordTable, tableColumns, tableLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const column = tableColumns<TestShow>(showFields)
const showColumns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold'),
  column.field('gross')
]
const layouts = [tableLayout(showColumns)]

function Table({ count = 12 }: { count?: number }) {
  const records = useRecords({ data: testShows(count), fields: showFields })
  return (
    <Records.Root records={records} layouts={layouts} caption='Upcoming shows'>
      <Records.Content />
    </Records.Root>
  )
}

const bodyRows = () => screen.getAllByRole('row').slice(1)
const firstCells = () =>
  bodyRows().map((row) => within(row).getAllByRole('cell')[0]!.textContent)

describe('RecordTable content', () => {
  it('is one named table with headers and cells', () => {
    render(<Table />)
    const table = screen.getByRole('table', { name: 'Upcoming shows' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Show', 'City', 'Sold', 'Gross'])
    expect(bodyRows()).toHaveLength(12)
  })

  it('renders each value through its field', () => {
    render(<Table />)
    expect(screen.getAllByText('On sale soon').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0)
    expect(screen.getByText('$7.9k')).toBeInTheDocument()
  })

  it('makes the first pinned text column the row title', () => {
    render(<Table />)
    expect(
      screen.getByText('Ocean Alley 1').closest('[role="cell"]')
    ).toHaveClass('font-semibold', 'text-strong')
    expect(
      screen.getAllByText('Brisbane')[0]!.closest('[role="cell"]')
    ).not.toHaveClass('font-semibold')
  })

  it('styles the title cell, so a custom cell inherits it and empty stays muted', () => {
    function Titled() {
      const records = useRecords({
        data: [{ ...testShows(1)[0]!, show: '' }, testShows(2)[1]!],
        fields: showFields
      })
      return (
        <Records.Root
          records={records}
          layouts={[
            tableLayout([
              column.field('show', {
                pin: true,
                cell: ({ value }) => (value ? `${String(value)}!` : null)
              }),
              column.field('city', { pin: true })
            ])
          ]}
        >
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Titled />)
    expect(
      screen.getByText('Ball Park Music 1!').closest('[role="cell"]')
    ).toHaveClass('font-semibold', 'text-strong')
  })

  it('mutes an empty title', () => {
    function EmptyTitle() {
      const records = useRecords({
        data: [{ ...testShows(1)[0]!, show: '' }],
        fields: showFields
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<EmptyTitle />)
    const title = within(screen.getAllByRole('row')[1]!).getAllByRole(
      'cell'
    )[0]!
    expect(title).toHaveClass('text-strong')
    expect(within(title).getByText('Not available')).toHaveClass('text-subtle')
  })

  it('sorts from the header and marks the column', () => {
    render(<Table />)
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(screen.getByRole('columnheader', { name: /Show/ })).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    expect(firstCells()[0]).toBe('Alex Lahey 1')
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(screen.getByRole('columnheader', { name: /Show/ })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
  })

  it('sorts dates latest first', () => {
    render(
      <RecordTable
        data={testShows(3)}
        fields={showFields}
        columns={[column.field('show'), column.field('starts')]}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Starts' }))
    expect(
      screen.getByRole('columnheader', { name: /Starts/ })
    ).toHaveAttribute('aria-sort', 'descending')
  })

  it('marks only a sort it applies', () => {
    const fields = showFields.map((field) =>
      field.key === 'city' ? { ...field, sortable: false } : field
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const columns = tableColumns<TestShow>(fields)
    render(
      <RecordTable
        data={testShows(3)}
        fields={fields}
        columns={[columns.field('show'), columns.field('city')]}
        defaultView={{
          query: { sort: [{ field: 'city', direction: 'ascending' }] }
        }}
      />
    )
    expect(
      screen.getByRole('columnheader', { name: 'City' })
    ).not.toHaveAttribute('aria-sort')
    warn.mockRestore()
  })

  it('sorts numbers largest first', () => {
    render(<Table />)
    fireEvent.click(screen.getByRole('button', { name: 'Sold' }))
    expect(screen.getByRole('columnheader', { name: /Sold/ })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
  })

  it('leaves a field that does not sort without a button', () => {
    const fields = showFields.map((field) =>
      field.key === 'city' ? { ...field, sortable: false } : field
    )
    function Unsorted() {
      const records = useRecords({ data: testShows(3), fields })
      const columns = tableColumns<TestShow>(fields)
      return (
        <Records.Root
          records={records}
          layouts={[tableLayout([columns.field('city')])]}
        >
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Unsorted />)
    expect(screen.getByRole('columnheader')).toHaveTextContent('City')
    expect(screen.queryByRole('button', { name: 'City' })).toBeNull()
  })

  it('renders the same cell classes on the server and in the browser', () => {
    const html = renderToString(<Table count={1} />)
    const cell =
      /role="cell"[^>]*class="([^"]+)"|class="([^"]+)"[^>]*role="cell"/.exec(
        html
      )!
    render(<Table count={1} />)
    const className = within(bodyRows()[0]!).getAllByRole('cell')[0]!.className
    expect(className).toBe(cell[1] ?? cell[2])
    expect(className).toContain('supports-[overflow-clip-margin:0.25rem]')
  })

  it('pins a column with a sticky offset', () => {
    render(<Table />)
    const header = screen.getByRole('columnheader', { name: /Show/ })
    expect(header).toHaveAttribute('data-pin')
    expect(header.style.getPropertyValue('--record-table-pin-start')).toBe(
      '0rem'
    )
  })

  it('shows and orders columns by the view', () => {
    function Viewed() {
      const records = useRecords({
        data: testShows(3),
        fields: showFields,
        defaultView: {
          layout: {
            type: 'table',
            columns: { order: ['gross'], hidden: ['city'] }
          }
        }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Viewed />)
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent)
    ).toEqual(['Show', 'Gross', 'Sold'])
  })

  it('renders a custom cell', () => {
    function Custom() {
      const records = useRecords({ data: testShows(2), fields: showFields })
      return (
        <Records.Root
          records={records}
          layouts={[
            tableLayout([
              column.field('show', {
                cell: ({ row, value }) => `${String(value)} in ${row.city}`
              })
            ])
          ]}
        >
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Custom />)
    expect(screen.getByText('Ocean Alley 1 in Brisbane')).toBeInTheDocument()
  })

  it('mirrors sideways scrolling into the header', () => {
    const { container } = render(<Table />)
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot="record-table-scroller"]'
    )!
    const head = container.querySelector<HTMLElement>(
      '[data-slot="record-table-head"]'
    )!
    scroller.scrollLeft = 120
    fireEvent.scroll(scroller)
    expect(head.scrollLeft).toBe(120)
    head.scrollLeft = 150
    fireEvent.scroll(head)
    expect(scroller.scrollLeft).toBe(150)
  })

  it('lets keyboard users reach the sideways scroller', () => {
    const { container } = render(<Table />)
    const region = screen.getByRole('region', {
      name: 'Upcoming shows, scrolls sideways'
    })
    expect(region).toContainElement(
      screen.getByRole('table', { name: 'Upcoming shows' })
    )
    const scroller = container.querySelector(
      '[data-slot="record-table-scroller"]'
    )
    expect(scroller).toHaveAttribute('tabindex', '0')
    expect(scroller).not.toHaveAttribute('role')
    expect(scroller).not.toHaveAttribute('aria-label')
  })

  it('stacks the header under docked tiers and isolates the scroller', () => {
    const { container } = render(<Table />)
    expect(
      container.querySelector('[data-slot="record-table-head"]')
    ).toHaveClass('z-docked')
    expect(
      container.querySelector('[data-slot="record-table-scroller"]')
    ).toHaveClass('isolate')
  })

  it('names its own scroll box as the region in a box', () => {
    function Boxed() {
      const records = useRecords({ data: testShows(3), fields: showFields })
      return (
        <Records.Root records={records} layouts={layouts} caption='Shows'>
          <Records.Content maxHeight='20rem' />
        </Records.Root>
      )
    }
    render(<Boxed />)
    expect(
      screen.getByRole('region', { name: 'Shows, scrolls' })
    ).toHaveAttribute('data-slot', 'record-table-viewport')
    expect(screen.queryByRole('region', { name: /sideways/ })).toBeNull()
  })
})

describe('RecordTable preset', () => {
  it('searches, then shows the count', async () => {
    render(
      <RecordTable
        caption='Upcoming shows'
        data={testShows(120)}
        fields={showFields}
        columns={showColumns}
      />
    )
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search' }),
      'Hobart'
    )
    expect(await screen.findByText('24 results')).toBeInTheDocument()
    expect(bodyRows().every((row) => row.textContent?.includes('Hobart'))).toBe(
      true
    )
  })

  it('pages forward and back', async () => {
    render(
      <RecordTable
        data={testShows(120)}
        fields={showFields}
        columns={showColumns}
      />
    )
    expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('51–100 of 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('101–120 of 120')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('offers the current page size when pageSizes leaves it out', async () => {
    render(
      <RecordTable
        data={testShows(120)}
        fields={showFields}
        columns={showColumns}
        defaultPosition={{ pageSize: 1000 }}
      />
    )
    const trigger = screen.getByRole('combobox', { name: 'Rows per page' })
    expect(trigger).toHaveTextContent('1000 per page')
    await userEvent.click(trigger)
    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toEqual(['25 per page', '50 per page', '100 per page', '1000 per page'])
  })

  it('handles no rows', () => {
    render(<RecordTable data={[]} fields={showFields} columns={showColumns} />)
    expect(screen.getByText('0 results')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('server renders the first page', () => {
    const html = renderToString(
      <RecordTable
        caption='Upcoming shows'
        data={testShows(120)}
        fields={showFields}
        columns={showColumns}
      />
    )
    expect(html).toContain('Ocean Alley 1')
    expect(html).toContain('1–50 of 120')
  })

  it('clears the search from a button that shows once it has text', async () => {
    render(
      <RecordTable
        data={testShows(120)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const field = screen.getByRole('searchbox', { name: 'Search' })
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
    await userEvent.type(field, 'Perth')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(field).toHaveValue('')
    expect(field).toHaveFocus()
    await userEvent.type(field, 'Hobart{Escape}')
    expect(field).toHaveValue('')
  })

  it('leaves Escape to an IME, even once WebKit ends the composition', () => {
    render(
      <RecordTable
        data={testShows(3)}
        fields={showFields}
        columns={showColumns}
        defaultView={{ query: { search: 'ろっく' } }}
      />
    )
    const field = screen.getByRole('searchbox')
    fireEvent.keyDown(field, { key: 'Escape', isComposing: true })
    expect(field).toHaveValue('ろっく')
    fireEvent.keyDown(field, { key: 'Escape', keyCode: 229 })
    expect(field).toHaveValue('ろっく')
  })

  it('takes a search placeholder that names the field', () => {
    render(
      <RecordTable
        data={testShows(3)}
        fields={showFields}
        columns={showColumns}
        searchPlaceholder='Search shows'
      />
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search shows' })
    ).toHaveAttribute('placeholder', 'Search shows')
  })
})

describe('Records composition', () => {
  it('lets search live elsewhere', async () => {
    function Composed() {
      const records = useRecords({ data: testShows(120), fields: showFields })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
          <Records.Search />
        </Records.Root>
      )
    }
    render(<Composed />)
    expect(
      screen
        .getByRole('table')
        .compareDocumentPosition(screen.getByRole('searchbox')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    await userEvent.type(screen.getByRole('searchbox'), 'Perth')
    expect(bodyRows()).toHaveLength(24)
    expect(bodyRows().every((row) => row.textContent?.includes('Perth'))).toBe(
      true
    )
  })

  it('shares the records across a layout without adding an element', () => {
    function Composed() {
      const records = useRecords({ data: testShows(120), fields: showFields })
      return (
        <Records.Provider
          records={records}
          layouts={layouts}
          caption='Upcoming shows'
        >
          <header data-testid='header'>
            <Records.Search />
          </header>
          <main data-testid='main'>
            <Records.Content />
          </main>
          <footer data-testid='footer'>
            <Records.Pagination />
          </footer>
        </Records.Provider>
      )
    }
    const { container } = render(<Composed />)
    expect(
      [...container.children].map((child) => child.getAttribute('data-testid'))
    ).toEqual(['header', 'main', 'footer'])
    expect(
      screen.getByRole('table', { name: 'Upcoming shows' })
    ).toBeInTheDocument()
    expect(screen.getByText('1–50 of 120')).toBeInTheDocument()
  })

  it('keeps rows per page quiet beside the subtler page buttons', () => {
    function Paged() {
      const records = useRecords({ data: testShows(120), fields: showFields })
      return (
        <Records.Provider records={records} layouts={layouts}>
          <Records.Pagination />
        </Records.Provider>
      )
    }
    render(<Paged />)
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toHaveClass(
      'emphasis-subtler'
    )
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveClass(
      'emphasis-subtler'
    )
  })

  it('shows nothing, and says why in development, with no layout', () => {
    function Bare() {
      const records = useRecords({ data: testShows(3), fields: showFields })
      return (
        <Records.Root records={records} layouts={[]}>
          <Records.Content />
        </Records.Root>
      )
    }
    const { container } = render(<Bare />)
    expect(container.querySelector('[role="table"]')).toBeNull()
  })
})
