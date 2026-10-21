import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumn } from '.'

const columns: DataTableColumn[] = [
  { key: 'pool', header: 'Ticket pool', kind: 'text' },
  { key: 'type', header: 'Ticket type', kind: 'text' },
  { key: 'scans', header: 'Scans', kind: 'number' },
  { key: 'share', header: 'Share', kind: 'number', format: 'percent' }
]

const rows = [
  { pool: 'General', type: 'GA', scans: 400, share: 0.4 },
  { pool: 'Premium', type: 'VIP', scans: 120, share: 0.12 },
  { pool: 'General', type: 'Concession', scans: 300, share: 0.3 },
  { pool: 'Premium', type: 'Meet and greet', scans: 180, share: 0.18 },
  { pool: 'Comp', type: 'Guest list', scans: 50, share: 0.05 }
]

const bodyRows = (container: HTMLElement) =>
  [...container.querySelectorAll('tbody > tr')].map((row) =>
    [...row.querySelectorAll('td, th')].map((cell) => cell.textContent)
  )

describe('DataTable groupBy', () => {
  it('shows one collapsed row per group, summing its counts', () => {
    const { container } = render(
      <DataTable columns={columns} rows={rows} groupBy={['pool']} />
    )
    expect(bodyRows(container)).toEqual([
      ['General', '700', ''],
      ['Premium', '300', ''],
      ['Comp', '50', '']
    ])
    for (const toggle of screen.getAllByRole('button'))
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides the grouped column and heads the label column with both', () => {
    render(<DataTable columns={columns} rows={rows} groupBy={['pool']} />)
    expect(
      screen.getAllByRole('columnheader').map((cell) => cell.textContent)
    ).toEqual(['Ticket pool / Ticket type', 'Scans', 'Share'])
  })

  it('expands and collapses a group when its caret is pressed', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <DataTable columns={columns} rows={rows} groupBy={['pool']} />
    )
    const premium = screen.getByRole('button', { name: 'Premium' })
    await user.click(premium)
    expect(premium).toHaveAttribute('aria-expanded', 'true')
    expect(bodyRows(container)).toEqual([
      ['General', '700', ''],
      ['Premium', '300', ''],
      ['VIP', '120', '12%'],
      ['Meet and greet', '180', '18%'],
      ['Comp', '50', '']
    ])
    await user.click(premium)
    expect(premium).toHaveAttribute('aria-expanded', 'false')
    expect(bodyRows(container)).toHaveLength(3)
  })

  it('opens every group with defaultExpanded', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool']}
        defaultExpanded
      />
    )
    expect(bodyRows(container)).toHaveLength(8)
  })

  it('opens the groups at the given paths, nesting a level per key', () => {
    const nested = [
      { pool: 'General', type: 'GA', gate: 'North', scans: 250 },
      { pool: 'General', type: 'GA', gate: 'South', scans: 150 },
      { pool: 'General', type: 'Concession', gate: 'North', scans: 300 }
    ]
    const { container } = render(
      <DataTable
        columns={[
          { key: 'pool', header: 'Pool', kind: 'text' },
          { key: 'type', header: 'Type', kind: 'text' },
          { key: 'gate', header: 'Gate', kind: 'text' },
          { key: 'scans', header: 'Scans', kind: 'number' }
        ]}
        rows={nested}
        groupBy={['pool', 'type']}
        defaultExpanded={[['General'], ['General', 'GA']]}
      />
    )
    expect(bodyRows(container)).toEqual([
      ['General', '700'],
      ['GA', '400'],
      ['North', '250'],
      ['South', '150'],
      ['Concession', '300']
    ])
    expect(screen.getByRole('button', { name: 'Concession' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('sorts groups by their sums, and rows within each group', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool']}
        defaultExpanded
        sortable
        defaultSort={{ key: 'scans', direction: 'descending' }}
      />
    )
    expect(bodyRows(container).map(([label]) => label)).toEqual([
      'General',
      'GA',
      'Concession',
      'Premium',
      'Meet and greet',
      'VIP',
      'Comp',
      'Guest list'
    ])
    await user.click(
      screen.getByRole('button', { name: 'Ticket pool / Ticket type' })
    )
    expect(bodyRows(container).map(([label]) => label)).toEqual([
      'Comp',
      'Guest list',
      'General',
      'Concession',
      'GA',
      'Premium',
      'Meet and greet',
      'VIP'
    ])
  })

  it('orders groups by a server sort and keeps the rows as given', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool']}
        sort={{ key: 'scans', direction: 'ascending' }}
        getSortHref={(key, direction) => `?sort=${key}&dir=${direction}`}
      />
    )
    expect(bodyRows(container).map(([label]) => label)).toEqual([
      'Comp',
      'Premium',
      'General'
    ])
  })

  it('labels a status group with its Badge and an empty one as missing', () => {
    render(
      <DataTable
        columns={[
          {
            key: 'state',
            header: 'State',
            kind: 'status',
            status: { live: { intent: 'success', label: 'On sale' } }
          },
          { key: 'show', header: 'Show', kind: 'text', emptyText: 'Unknown' },
          { key: 'sold', header: 'Sold', kind: 'number' }
        ]}
        rows={[
          { state: 'live', show: 'Ocean Alley', sold: 10 },
          { state: '', show: 'Julia Jacklin', sold: 5 }
        ]}
        groupBy={['state']}
      />
    )
    expect(screen.getByRole('button', { name: 'On sale' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Not available' })).toBeVisible()
  })

  it('links leaf rows only and keeps the totals footer over every row', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <DataTable
        columns={columns}
        rows={rows}
        groupBy={['pool']}
        getRowHref={(row) => `/types/${String(row.type)}`}
        totals
      />
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Comp' }))
    expect(screen.getByRole('link', { name: 'Guest list' })).toHaveAttribute(
      'href',
      '/types/Guest list'
    )
    const footer = container.querySelector('tfoot')!
    expect(within(footer).getByRole('rowheader')).toHaveTextContent(
      'Totals for 5 records'
    )
    expect(footer).toHaveTextContent('1,050')
  })

  it('warns once and ignores a key that is not a text or status column', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <DataTable columns={columns} rows={rows} groupBy={['scans', 'missing']} />
    )
    expect(bodyRows(container)).toHaveLength(5)
    expect(warn.mock.calls.map(([message]) => message)).toEqual([
      '[Roadie] DataTable groupBy "scans" is not a text or status column, so it\'s ignored.',
      '[Roadie] DataTable groupBy "missing" names no column, so it\'s ignored.'
    ])
    warn.mockRestore()
  })

  it('renders collapsed groups on the server', () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} groupBy={['pool']} />
    )
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('General')
    expect(html).not.toContain('Concession')
  })
})
