import type { ComponentProps } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { DataTable, type DataTableColumn, type DataTableRow } from '.'
import { RoadieLinkProvider } from '../../providers/RoadieLinkProvider'

const columns: DataTableColumn[] = [
  { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' },
  { key: 'show', header: 'Show', kind: 'text', secondaryKey: 'venue' },
  { key: 'city', header: 'City', kind: 'text' }
]

const rows: DataTableRow[] = [
  {
    id: 'show-1',
    show: 'Ball Park Music',
    venue: 'The Lantern Room',
    city: 'Brisbane',
    gross: 118400
  },
  { id: 'show-2', show: 'Angie McMahon', city: 'Melbourne', gross: 40200 }
]

function Routed({
  onNavigate,
  ...props
}: Partial<ComponentProps<typeof DataTable>> & {
  onNavigate: (href: string) => void
}) {
  const Link = ({ href, ...rest }: ComponentProps<'a'>) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        event.preventDefault()
        onNavigate(String(href))
      }}
    />
  )
  return (
    <RoadieLinkProvider Link={Link}>
      <DataTable
        caption='Shows'
        columns={columns}
        rows={rows}
        getRowHref={(row) => `/shows/${row.id}`}
        {...props}
      />
    </RoadieLinkProvider>
  )
}

describe('DataTable row links', () => {
  it('links the first text column through the provider', async () => {
    const onNavigate = vi.fn()
    render(<Routed onNavigate={onNavigate} />)
    const link = screen.getByRole('link', { name: 'Ball Park Music' })
    expect(link).toHaveAttribute('href', '/shows/show-1')
    expect(link.closest('td')).toHaveTextContent('Ball Park Music')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    await userEvent.click(link)
    expect(onNavigate).toHaveBeenCalledWith('/shows/show-1')
  })

  it('prefers a pinned text column for the title', () => {
    render(
      <Routed
        onNavigate={vi.fn()}
        columns={columns.map((column) =>
          column.key === 'city' ? { ...column, pin: true } : column
        )}
      />
    )
    expect(screen.getByRole('link', { name: 'Brisbane' })).toHaveAttribute(
      'href',
      '/shows/show-1'
    )
  })

  it('makes the linked row an interactive surface around its link', () => {
    render(<Routed onNavigate={vi.fn()} />)
    const link = screen.getByRole('link', { name: /Ball Park Music/ })
    const row = link.closest('tr')!
    expect(link).toHaveAttribute('data-interactive-target')
    expect(row).toHaveClass('is-interactive-within')
    expect(row).toHaveAttribute('data-linked')
  })

  it('opens an external href in a new tab', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowHref={() => 'https://tickets.example.com/show'}
      />
    )
    const [link] = screen.getAllByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('leaves a row unlinked when its href is undefined', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowHref={(row) =>
          row.id === 'show-1' ? `/shows/${row.id}` : undefined
        }
      />
    )
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const plain = screen.getByText('Angie McMahon').closest('tr')!
    expect(plain).not.toHaveClass('is-interactive-within')
    expect(plain).not.toHaveAttribute('data-linked')
  })

  it.each([null, ''])('leaves a row with a %j title unlinked', (show) => {
    render(
      <DataTable
        columns={columns}
        rows={[{ ...rows[0]!, show }]}
        getRowHref={(row) => `/shows/${row.id}`}
      />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Brisbane/ })).not.toHaveAttribute(
      'data-linked'
    )
  })

  it('links nothing without a text column', () => {
    render(
      <DataTable
        columns={[columns[0]!]}
        rows={rows}
        getRowHref={(row) => `/shows/${row.id}`}
      />
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links rows in a sortable table', () => {
    render(<Routed onNavigate={vi.fn()} sortable />)
    expect(screen.getByRole('link', { name: /Angie McMahon/ })).toHaveAttribute(
      'href',
      '/shows/show-2'
    )
  })

  it('server renders the row links', () => {
    const html = renderToString(
      <DataTable
        columns={columns}
        rows={rows}
        getRowHref={(row) => `/shows/${row.id}`}
      />
    )
    expect(html).toContain('href="/shows/show-1"')
    expect(html).toContain('data-interactive-target')
  })
})
