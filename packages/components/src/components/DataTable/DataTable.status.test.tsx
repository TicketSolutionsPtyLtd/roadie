import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DataTable, type DataTableColumn, sortDataTableRows } from '.'

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
