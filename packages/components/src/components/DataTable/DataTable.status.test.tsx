import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  DataTable,
  type DataTableColumn,
  type DataTableRow,
  sortDataTableRows
} from '.'

const status: DataTableColumn = {
  key: 'status',
  header: 'Status',
  kind: 'status',
  status: {
    on_sale: { intent: 'success' },
    sold_out: { intent: 'info', label: 'Sold out' },
    cancelled: { intent: 'danger' }
  }
}
const columns: DataTableColumn[] = [
  { key: 'show', header: 'Show', kind: 'text' },
  status
]
const rows = [
  { show: 'Ocean Alley', status: 'sold_out' },
  { show: 'Ball Park Music', status: 'on_sale' },
  { show: 'Julia Jacklin', status: 'cancelled' },
  { show: 'Angie McMahon', status: 'postponed' }
]

const badgeIn = (show: string) =>
  within(screen.getByText(show).closest('tr')!).getByText((_, element) =>
    Boolean(element?.matches('[data-slot=badge]'))
  )

describe('DataTable status columns', () => {
  it('shows each status as a small badge with its intent and label', () => {
    render(<DataTable columns={columns} rows={rows} />)
    const badge = badgeIn('Ball Park Music')
    expect(badge).toHaveTextContent('On sale')
    expect(badge).toHaveClass('intent-success', 'emphasis-normal', 'text-xs')
    expect(badgeIn('Ocean Alley')).toHaveTextContent('Sold out')
    expect(badgeIn('Ocean Alley')).toHaveClass('intent-info')
  })

  it('shows an unknown key as a neutral badge in its raw text', () => {
    render(<DataTable columns={columns} rows={rows} />)
    expect(badgeIn('Angie McMahon')).toHaveTextContent('postponed')
    expect(badgeIn('Angie McMahon')).toHaveClass('intent-neutral')
  })

  it('shows the label as text in a plain table', () => {
    render(<DataTable plain columns={columns} rows={rows} />)
    expect(screen.getByText('On sale')).not.toHaveAttribute('data-slot')
  })

  it('shows an empty status as empty and sorts it last', () => {
    const withEmpty = [...rows, { show: 'Alex Lahey', status: '' }]
    render(<DataTable columns={columns} rows={withEmpty} />)
    const row = screen.getByText('Alex Lahey').closest('tr')!
    expect(row.querySelector('[data-slot=badge]')).toBeNull()
    expect(row).toHaveTextContent('Not available')
    expect(
      sortDataTableRows(withEmpty, columns, {
        key: 'status',
        direction: 'ascending'
      }).at(-1)?.show
    ).toBe('Alex Lahey')
  })

  it('reads only a row own fields, so a missing constructor stays empty', () => {
    const special: DataTableColumn = { ...status, key: 'constructor' }
    const specialRows: DataTableRow[] = [
      { show: 'Ocean Alley' },
      { show: 'Alex Lahey', constructor: 'on_sale' }
    ]
    const { container } = render(
      <DataTable
        columns={[columns[0]!, special]}
        rows={specialRows}
        totals={{ label: 'All shows', values: {} }}
      />
    )
    const row = screen.getByText('Ocean Alley').closest('tr')!
    expect(row.querySelector('[data-slot=badge]')).toBeNull()
    expect(row).toHaveTextContent('Not available')
    expect(container.querySelector('tfoot')!.textContent).toBe('All shows')
    expect(
      sortDataTableRows(specialRows, [special], {
        key: 'constructor',
        direction: 'ascending'
      }).map((row) => row.show)
    ).toEqual(['Alex Lahey', 'Ocean Alley'])
  })

  it('sorts by label, A to Z first', () => {
    render(<DataTable sortable columns={columns} rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Status' }))
    const order = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelector('[data-slot=badge]')?.textContent)
    expect(order).toEqual(['Cancelled', 'On sale', 'postponed', 'Sold out'])
  })

  it('sorts by order when the map gives one', () => {
    const ordered: DataTableColumn = {
      ...status,
      status: {
        on_sale: { intent: 'success', order: 1 },
        sold_out: { intent: 'info', order: 2 },
        cancelled: { intent: 'danger', order: 3 }
      }
    }
    expect(
      sortDataTableRows(rows, [ordered], {
        key: 'status',
        direction: 'ascending'
      }).map((row) => row.status)
    ).toEqual(['on_sale', 'sold_out', 'cancelled', 'postponed'])
  })

  it('keeps keys without an order last in both directions', () => {
    const ordered: DataTableColumn = {
      ...status,
      status: {
        on_sale: { intent: 'success', order: 1 },
        sold_out: { intent: 'info' },
        cancelled: { intent: 'danger', order: 3 }
      }
    }
    expect(
      sortDataTableRows(rows, [ordered], {
        key: 'status',
        direction: 'descending'
      }).map((row) => row.status)
    ).toEqual(['cancelled', 'on_sale', 'sold_out', 'postponed'])
  })

  describe('with a secondary line', () => {
    const forecast: DataTableColumn = { ...status, secondaryKey: 'forecast' }
    const textColumn: DataTableColumn = {
      key: 'show',
      header: 'Show',
      kind: 'text',
      secondaryKey: 'venue'
    }
    const forecastRows: DataTableRow[] = [
      {
        show: 'Ball Park Music',
        venue: 'Kazoo Hollow Room, Fortitude Valley',
        status: 'on_sale',
        forecast: 'forecast 640 of 600'
      },
      { show: 'Ocean Alley', venue: 12, status: 'sold_out', forecast: 12 },
      { show: 'Julia Jacklin', status: '', forecast: 'forecast 90 of 400' },
      { show: 'Alex Lahey', venue: '', status: 'on_sale', forecast: '' }
    ]
    const cellsOf = (show: string) =>
      screen.getByText(show).closest('tr')!.querySelectorAll('td')

    it('shows it under the badge, styled like a text column', () => {
      render(<DataTable columns={[textColumn, forecast]} rows={forecastRows} />)
      const line = screen.getByText('forecast 640 of 600')
      const badge = badgeIn('Ball Park Music')
      expect(line.parentElement).toBe(badge.parentElement)
      expect(badge.compareDocumentPosition(line)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
      expect(line.className).toBe(
        screen.getByText('Kazoo Hollow Room, Fortitude Valley').className
      )
      expect(line.parentElement).toHaveClass('grid')
      expect(badge).toHaveClass('justify-self-start')
    })

    it('shows it under the label in a plain table', () => {
      render(
        <DataTable plain columns={[textColumn, forecast]} rows={forecastRows} />
      )
      const lines = cellsOf('Ball Park Music')[1]!.firstElementChild!.children
      expect([...lines].map((line) => line.textContent)).toEqual([
        'On sale',
        'forecast 640 of 600'
      ])
    })

    it('leaves out a secondary value that is not text, as a text column does', () => {
      render(<DataTable columns={[textColumn, forecast]} rows={forecastRows} />)
      const [text, badge] = cellsOf('Ocean Alley')
      expect(text!.textContent).toBe('Ocean Alley')
      expect(badge!.textContent).toBe('Sold out')
    })

    it('adds no line for an empty secondary value, in either kind', () => {
      render(<DataTable columns={[textColumn, forecast]} rows={forecastRows} />)
      for (const cell of cellsOf('Alex Lahey'))
        expect(cell.firstElementChild!.children).toHaveLength(1)
    })

    it('shows only the empty text for an empty status', () => {
      render(<DataTable columns={[textColumn, forecast]} rows={forecastRows} />)
      expect(cellsOf('Julia Jacklin')[1]!.textContent).toBe('Not available')
    })
  })

  it('reads a numeric key the same as its string', () => {
    render(
      <DataTable
        columns={[
          columns[0]!,
          { ...status, status: { '2': { intent: 'warning', label: 'Held' } } }
        ]}
        rows={[{ show: 'Ocean Alley', status: 2 }]}
      />
    )
    expect(badgeIn('Ocean Alley')).toHaveTextContent('Held')
    expect(badgeIn('Ocean Alley')).toHaveClass('intent-warning')
  })
})
