import { fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumn, sortDataTableRows } from '.'
import { compareText, sortValue } from './sort'

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

  it('collapses again once the priority columns go and come back', () => {
    const plain = columns.map(({ priority: _, ...column }) => column)
    const { rerender } = render(<DataTable columns={columns} rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show all columns' }))
    rerender(<DataTable columns={plain} rows={rows} />)
    rerender(<DataTable columns={columns} rows={rows} />)
    expect(
      screen.getByRole('button', { name: 'Show all columns' })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps Show all state authoritative over a passed data-show-all', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} data-show-all='' />
    )
    expect(container.firstElementChild).not.toHaveAttribute('data-show-all')
  })
})

const sortColumns: DataTableColumn[] = [
  { key: 'show', header: 'Show', kind: 'text' },
  { key: 'gross', header: 'Gross', kind: 'number' },
  { key: 'daily', header: 'Daily', kind: 'sparkline' }
]
const sortRows = [
  { show: 'Ocean Alley', gross: 22900, daily: [1, 2, 3] },
  { show: 'angie McMahon', gross: null, daily: [1, 2, 3] },
  { show: 'Ball Park Music', gross: 183000, daily: [1, 2, 3] },
  { show: 'Julia Jacklin', gross: 'On sale soon', daily: [1, 2, 3] },
  { show: 'Alex Lahey', gross: 118400, daily: [1, 2, 3] }
]
const shownOrder = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent)
const header = (name: string) =>
  screen.getByRole('columnheader', { name: new RegExp(name) })

describe('DataTable sorting', () => {
  it('sorts numbers largest first, then flips', () => {
    render(<DataTable sortable columns={sortColumns} rows={sortRows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Gross' }))
    expect(header('Gross')).toHaveAttribute('aria-sort', 'descending')
    expect(shownOrder()).toEqual([
      'Ball Park Music',
      'Alex Lahey',
      'Ocean Alley',
      'angie McMahon',
      'Julia Jacklin'
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Gross' }))
    expect(header('Gross')).toHaveAttribute('aria-sort', 'ascending')
    expect(shownOrder()).toEqual([
      'Ocean Alley',
      'Alex Lahey',
      'Ball Park Music',
      'angie McMahon',
      'Julia Jacklin'
    ])
  })

  it('sorts text A to Z first, ignoring case', () => {
    render(<DataTable sortable columns={sortColumns} rows={sortRows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(shownOrder()).toEqual([
      'Alex Lahey',
      'angie McMahon',
      'Ball Park Music',
      'Julia Jacklin',
      'Ocean Alley'
    ])
    expect(header('Gross')).not.toHaveAttribute('aria-sort')
  })

  it('starts from defaultSort and leaves sparklines unsortable', () => {
    render(
      <DataTable
        sortable
        defaultSort={{ key: 'gross', direction: 'ascending' }}
        columns={sortColumns}
        rows={sortRows}
      />
    )
    expect(shownOrder()[0]).toBe('Ocean Alley')
    expect(
      within(header('Daily')).queryByRole('button')
    ).not.toBeInTheDocument()
  })

  it('reports changes and follows a controlled sort', () => {
    const onSortChange = vi.fn()
    render(
      <DataTable
        sortable
        sort={{ key: 'show', direction: 'descending' }}
        onSortChange={onSortChange}
        columns={sortColumns}
        rows={sortRows}
      />
    )
    expect(shownOrder()[0]).toBe('Ocean Alley')
    fireEvent.click(screen.getByRole('button', { name: 'Show' }))
    expect(onSortChange).toHaveBeenCalledWith({
      key: 'show',
      direction: 'ascending'
    })
    expect(shownOrder()[0]).toBe('Ocean Alley')
  })

  it('keeps row keys with their rows', () => {
    const { container } = render(
      <DataTable
        sortable
        defaultSort={{ key: 'show', direction: 'ascending' }}
        getRowKey={(row) => String(row.show)}
        columns={sortColumns}
        rows={sortRows}
      />
    )
    expect(container.querySelector('tbody tr')).toHaveTextContent('Alex Lahey')
  })

  it('server renders a sortable table in its sorted order', () => {
    const html = renderToString(
      <DataTable
        sortable
        defaultSort={{ key: 'gross', direction: 'descending' }}
        columns={sortColumns}
        rows={sortRows}
      />
    )
    expect(html.indexOf('Ball Park Music')).toBeLessThan(
      html.indexOf('Ocean Alley')
    )
  })

  it('sorts rows on a server the same way', () => {
    const sorted = sortDataTableRows(sortRows, sortColumns, {
      key: 'gross',
      direction: 'descending'
    })
    expect(sorted.map((row) => row.show)).toEqual([
      'Ball Park Music',
      'Alex Lahey',
      'Ocean Alley',
      'angie McMahon',
      'Julia Jacklin'
    ])
  })

  it('links unsorted number headers largest first', () => {
    render(
      <DataTable
        columns={sortColumns}
        rows={sortRows}
        getSortHref={(key, direction) => `?sort=${key}&dir=${direction}`}
      />
    )
    expect(screen.getByRole('link', { name: 'Gross' })).toHaveAttribute(
      'href',
      '?sort=gross&dir=descending'
    )
    expect(screen.getByRole('link', { name: 'Show' })).toHaveAttribute(
      'href',
      '?sort=show&dir=ascending'
    )
    expect(screen.queryByRole('link', { name: 'Daily' })).toBeNull()
  })
})

describe('shared sort helpers', () => {
  it('compares text naturally and ignoring case', () => {
    expect(compareText('angie', 'Ball')).toBeLessThan(0)
    expect(compareText('Show 2', 'Show 10')).toBeLessThan(0)
  })

  it('treats missing values as undefined', () => {
    const number = { key: 'gross', header: 'Gross', kind: 'number' } as const
    expect(sortValue(number, 'On sale soon')).toBeUndefined()
    expect(sortValue(number, null)).toBeUndefined()
    expect(sortValue(number, 12)).toBe(12)
    const text = { key: 'show', header: 'Show', kind: 'text' } as const
    expect(sortValue(text, 42)).toBe('42')
  })
})
