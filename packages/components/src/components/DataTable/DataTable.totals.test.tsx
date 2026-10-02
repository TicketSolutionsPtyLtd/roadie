import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable, type DataTableColumn } from '.'

const columns: DataTableColumn[] = [
  { key: 'show', header: 'Show', kind: 'text', pin: true },
  { key: 'sold', header: 'Tickets sold', kind: 'number' },
  { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' },
  { key: 'sellThrough', header: 'Sell-through', kind: 'meter' },
  { key: 'pace', header: 'Pace', kind: 'delta', format: 'index' },
  { key: 'share', header: 'Share', kind: 'number', format: 'percent' },
  { key: 'capacity', header: 'Capacity', kind: 'number', total: false }
]

const rows = [
  {
    show: 'Ball Park Music',
    sold: 1840,
    gross: 118400,
    sellThrough: 0.77,
    pace: 112,
    share: 0.5,
    capacity: 2400
  },
  {
    show: 'Ocean Alley',
    sold: 2210,
    gross: 183000.5,
    sellThrough: 0.51,
    pace: 101,
    share: 0.3,
    capacity: 2400
  },
  {
    show: 'Julia Jacklin',
    sold: null,
    gross: 22900,
    sellThrough: 0.46,
    pace: 78,
    share: 0.2,
    capacity: 2400
  }
]

const footer = (container: HTMLElement) => {
  const tfoot = container.querySelector('tfoot')
  expect(tfoot).not.toBeNull()
  return [...tfoot!.querySelectorAll('th, td')].map((cell) => cell.textContent)
}

describe('DataTable totals row', () => {
  it('sums number columns over every row in a footer row', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} totals />
    )
    expect(footer(container)).toEqual([
      'Totals for 3 records',
      '4,050',
      '$324,300.50',
      '',
      '',
      '',
      ''
    ])
  })

  it('names the rows by recordName and labels the row for screen readers', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        totals='sum'
        recordName={{ one: 'event', other: 'events' }}
      />
    )
    const label = within(container.querySelector('tfoot')!).getByText(
      'Totals for 3 events'
    )
    expect(label.closest('th')).toHaveAttribute('scope', 'row')
  })

  it('takes a label and explicit values, summing nothing itself', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        totals={{
          label: 'All Brisbane shows',
          values: { gross: 500000, pace: 104 }
        }}
      />
    )
    const cells = footer(container)
    expect(cells[0]).toBe('All Brisbane shows')
    expect(cells[1]).toBe('')
    expect(cells[2]).toBe('$500,000')
    expect(cells[4]).toContain('104')
  })

  it('keeps the totals last when sorted', () => {
    const { container } = render(
      <DataTable sortable columns={columns} rows={rows} totals />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Gross' }))
    expect(container.querySelector('tbody tr')).toHaveTextContent('Ocean Alley')
    expect(footer(container)[2]).toBe('$324,300.50')
  })

  it('never hides the first column, which holds the label', () => {
    const { container } = render(
      <DataTable
        totals
        columns={[{ ...columns[0]!, priority: 2 }, ...columns.slice(1)]}
        rows={rows}
      />
    )
    expect(container.querySelector('[data-priority]')).toBeNull()
  })

  it('renders no footer without totals', () => {
    const { container } = render(<DataTable columns={columns} rows={rows} />)
    expect(container.querySelector('tfoot')).toBeNull()
  })

  it('server renders the totals row', () => {
    const html = renderToString(
      <DataTable columns={columns} rows={rows} totals />
    )
    expect(html).toContain('<tfoot')
    expect(html).toContain('Totals for 3 records')
  })
})
