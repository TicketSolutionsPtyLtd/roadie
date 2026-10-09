import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'

type Show = {
  id: string
  show: string
  city: string
  sold: number
  image?: string
}

const SHOWS: Show[] = [
  {
    id: 'a',
    show: 'Ember Galah Ball',
    city: 'Brisbane',
    sold: 120,
    image: '/a.svg'
  },
  { id: 'b', show: 'Nectarine Hoedown', city: 'Hobart', sold: 80 }
]

const field = recordFields<Show>()
const fields = [
  field.text('image', { label: 'Image', searchable: false, sortable: false }),
  field.text('show', { label: 'Show' }),
  field.text('city', { label: 'City' }),
  field.number('sold', { label: 'Sold' })
]
const column = tableColumns<Show>(fields)
const listColumns = [
  column.field('image', { kind: 'image' }),
  column.field('show', { narrow: 'title' }),
  column.field('city', { narrow: 'description' })
]
const base = {
  caption: 'Shows',
  data: SHOWS,
  fields,
  getRowId: (row: Show) => row.id
}

const rowOf = (name: string) =>
  screen.getByText(name).closest<HTMLElement>('[role="row"]')!

describe('RecordTable image columns', () => {
  it('renders a lazy thumbnail with an empty alt by default', () => {
    render(<RecordTable {...base} columns={listColumns} />)
    const img = rowOf('Ember Galah Ball').querySelector('img')!
    expect(img).toHaveAttribute('src', '/a.svg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
    // A broken image is complete too, so the tile must outlast loading.
    fireEvent.load(img)
    expect(img).toHaveClass('bg-subtle')
  })

  it('takes alt from the row when given', () => {
    const columns = [
      column.field('image', {
        kind: 'image',
        alt: (row) => `Poster for ${row.show}`
      }),
      ...listColumns.slice(1)
    ]
    render(<RecordTable {...base} columns={columns} />)
    expect(
      screen.getByRole('img', { name: 'Poster for Ember Galah Ball' })
    ).toBeInTheDocument()
  })

  it('shows a neutral tile, not an img, when the URL is missing', () => {
    render(<RecordTable {...base} columns={listColumns} />)
    const row = rowOf('Nectarine Hoedown')
    expect(row.querySelector('img')).toBeNull()
    expect(
      row.querySelector('[data-slot="record-image-placeholder"]')
    ).not.toBeNull()
  })

  it('shows the neutral tile once an image fails to load', () => {
    render(<RecordTable {...base} columns={listColumns} />)
    const row = rowOf('Ember Galah Ball')
    fireEvent.error(row.querySelector('img')!)
    expect(row.querySelector('img')).toBeNull()
    expect(
      row.querySelector('[data-slot="record-image-placeholder"]')
    ).not.toBeNull()
  })

  it('reads its header but shows none, with no sort button', () => {
    render(<RecordTable {...base} columns={listColumns} />)
    const header = screen.getByRole('columnheader', { name: 'Image' })
    expect(within(header).queryByRole('button')).toBeNull()
    expect(within(header).getByText('Image')).toHaveClass('sr-only')
  })

  it('never takes the row title', () => {
    const columns = [
      column.field('image', { kind: 'image' }),
      column.field('show')
    ]
    render(
      <RecordTable
        {...base}
        columns={columns}
        getRowHref={(row) => `/shows/${row.id}`}
      />
    )
    expect(
      screen.getByRole('link', { name: 'Ember Galah Ball' })
    ).toHaveAttribute('href', '/shows/a')
  })
})
