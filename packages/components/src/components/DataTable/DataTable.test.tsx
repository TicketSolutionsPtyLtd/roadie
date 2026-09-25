import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DataTable, type DataTableColumn } from '.'

const columns: DataTableColumn[] = [
  {
    key: 'show',
    header: 'Show',
    kind: 'text',
    pin: true,
    secondaryKey: 'venue'
  },
  {
    key: 'daily',
    header: 'Daily sales, 30 days',
    kind: 'sparkline',
    priority: 3
  },
  {
    key: 'sellThrough',
    header: 'Sell-through',
    kind: 'meter',
    target: 0.85,
    priority: 2
  },
  {
    key: 'pace',
    header: 'Pace index',
    kind: 'delta',
    format: 'index',
    baseline: 100
  },
  {
    key: 'gross',
    header: 'Gross',
    kind: 'number',
    format: 'compactCurrency',
    priority: 1
  }
]

const rows = [
  {
    show: 'Ball Park Music',
    venue: 'The Lantern Room, Fortitude Valley',
    daily: [1, 2, 3, 4, 5],
    sellThrough: 0.77,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Angie McMahon',
    venue: 'The Paper Moth, Brunswick',
    daily: [95, 85],
    sellThrough: 0.18,
    pace: 'On sale 2 days',
    gross: null
  }
]

describe('DataTable', () => {
  it('renders every kind of cell', () => {
    render(<DataTable columns={columns} rows={rows} caption='Upcoming shows' />)
    expect(
      screen.getByRole('table', { name: 'Upcoming shows' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('The Lantern Room, Fortitude Valley')
    ).toBeInTheDocument()
    expect(screen.getAllByRole('meter')).toHaveLength(2)
    expect(screen.getByText('$118.4k')).toBeInTheDocument()
    expect(screen.getByText('Not enough history')).toBeInTheDocument()
    expect(screen.getByText('On sale 2 days')).toBeInTheDocument()
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('marks priorities and the pinned column', () => {
    const { container } = render(<DataTable columns={columns} rows={rows} />)
    expect(container.querySelectorAll('[data-priority="3"]').length).toBe(3)
    expect(container.querySelector('th[data-pin]')).toHaveTextContent('Show')
  })

  it('renders plain numbers for chart table views', () => {
    render(<DataTable columns={columns} rows={rows} plain />)
    expect(screen.queryAllByRole('meter')).toHaveLength(0)
    expect(screen.getByText('77%')).toBeInTheDocument()
  })

  it('links sortable headers and marks the sorted column', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        sort={{ key: 'gross', direction: 'descending' }}
        getSortHref={(key, direction) => `?sort=${key}&dir=${direction}`}
      />
    )
    expect(screen.getByRole('columnheader', { name: /Gross/ })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
    expect(screen.getByRole('link', { name: /Gross/ })).toHaveAttribute(
      'href',
      '?sort=gross&dir=ascending'
    )
  })

  it('server renders every column and the show-all control', () => {
    const html = renderToString(<DataTable columns={columns} rows={rows} />)
    for (const column of columns) expect(html).toContain(column.header)
    expect(html).toContain('Show all columns')
  })

  it('shows a meter against a custom max as a count', () => {
    render(
      <DataTable
        columns={[{ key: 'sold', header: 'Sold', kind: 'meter', max: 2400 }]}
        rows={[{ sold: 1842 }]}
      />
    )
    expect(screen.getByText('1,842 of 2,400')).toBeInTheDocument()
    expect(screen.getByRole('meter')).toHaveAttribute(
      'aria-valuetext',
      '1,842 of 2,400'
    )
  })

  it('speaks a meter cell once', () => {
    const { container } = render(<DataTable columns={columns} rows={rows} />)
    const meter = screen.getAllByRole('meter')[0]!
    expect(meter).toHaveAttribute('aria-valuetext', '77%')
    const shown = container.querySelector('td span[aria-hidden]')!
    expect(shown).toHaveTextContent('77%')
  })

  it('makes the scroller a focusable named region', () => {
    render(<DataTable columns={columns} rows={rows} caption='Upcoming shows' />)
    const region = screen.getByRole('region', {
      name: 'Upcoming shows, scrolls sideways'
    })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region).toHaveAttribute('data-slot', 'data-table-scroller')
  })
})
