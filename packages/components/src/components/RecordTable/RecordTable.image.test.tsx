import { fireEvent, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { recordFields } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'
import { CARD_REM, cardRem } from './RecordTableNarrowRows'
import { narrowParts } from './narrow'

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
const cardColumns = [...listColumns, column.field('sold', { narrow: 'detail' })]
const base = {
  caption: 'Shows',
  data: SHOWS,
  fields,
  getRowId: (row: Show) => row.id
}

let width = 800
beforeEach(() => {
  width = 800
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ width, height: 0, top: 0, left: 0 }) as DOMRect
  )
})
afterEach(() => vi.restoreAllMocks())

const rowOf = (name: string) =>
  screen.getByText(name).closest<HTMLElement>('[role="row"]')!
const itemsOf = () =>
  within(screen.getByRole('list', { name: 'Shows' })).getAllByRole('listitem')

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

describe('RecordTable image columns, narrow', () => {
  beforeEach(() => {
    width = 360
  })

  it('puts the thumbnail in a list row’s leading slot', () => {
    render(<RecordTable {...base} columns={listColumns} />)
    const [first, second] = itemsOf()
    const leading = first!.querySelector('[data-slot="list-item-leading"]')!
    expect(leading.querySelector('img')).toHaveAttribute('src', '/a.svg')
    expect(
      second!.querySelector(
        '[data-slot="list-item-leading"] [data-slot="record-image-placeholder"]'
      )
    ).not.toBeNull()
  })

  it('shows the image as a banner at the top of a card', () => {
    render(<RecordTable {...base} columns={cardColumns} />)
    const [first, second] = itemsOf()
    const card = first!.querySelector('[data-slot="record-card"]')!
    const banner = card.firstElementChild!
    expect(banner).toHaveAttribute('data-slot', 'record-card-media')
    expect(banner.querySelector('img')).toHaveAttribute('src', '/a.svg')
    expect(card.querySelectorAll('[data-slot="card-header"] img')).toHaveLength(
      0
    )
    expect(
      second!.querySelector(
        '[data-slot="record-card-media"] [data-slot="record-image-placeholder"]'
      )
    ).not.toBeNull()
  })

  it('puts a bannered card’s trailing value on the image’s top end', () => {
    render(
      <RecordTable
        {...base}
        columns={[
          column.field('image', { kind: 'image' }),
          column.field('show', { narrow: 'title' }),
          column.field('city', { narrow: 'trailing' }),
          column.field('sold', { narrow: 'detail' })
        ]}
      />
    )
    const [first] = itemsOf()
    expect(
      first!.querySelector(
        '[data-slot="record-card-media"] [data-slot="record-card-trailing"]'
      )
    ).toHaveTextContent('Brisbane')
    expect(
      first!.querySelector('[data-slot="card-header"]')
    ).not.toHaveTextContent('Brisbane')
  })

  it('swaps the thumbnail for the checkbox in Select mode', async () => {
    const user = userEvent.setup()
    render(
      <RecordTable
        {...base}
        columns={listColumns}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Select' }))
    const [first] = itemsOf()
    const leading = first!.querySelector<HTMLElement>(
      '[data-slot="list-item-leading"]'
    )!
    expect(within(leading).getByRole('checkbox')).toBeInTheDocument()
    expect(leading.querySelector('img')).toBeNull()
  })

  it('renders a custom cell in the banner', () => {
    const columns = [
      column.field('image', {
        kind: 'image',
        cell: ({ row }) => <span data-testid='poster'>{row.show}</span>
      }),
      ...cardColumns.slice(1)
    ]
    render(<RecordTable {...base} columns={columns} />)
    expect(
      screen
        .getAllByTestId('poster')[0]!
        .closest('[data-slot="record-card-media"]')
    ).not.toBeNull()
  })

  it('draws a banner block in card placeholders while loading', () => {
    const { container } = render(
      <RecordTable {...base} data={[]} columns={cardColumns} loading />
    )
    expect(
      container.querySelector(
        '[data-slot="record-table-skeleton"] [data-slot="record-table-placeholder-media"]'
      )
    ).not.toBeNull()
  })

  it('estimates a bannered card taller', () => {
    expect(cardRem(narrowParts<Show>(cardColumns.slice(1)))).toBe(CARD_REM)
    expect(cardRem(narrowParts<Show>(cardColumns))).toBeGreaterThan(
      CARD_REM + 9
    )
  })
})
