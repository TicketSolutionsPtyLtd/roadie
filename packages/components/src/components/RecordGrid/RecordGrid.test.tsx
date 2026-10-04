import { render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { RecordGrid, gridLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const cards = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="record-grid-card"]')
]
const cardTitles = () =>
  cards().map(
    (card) => card.querySelector('[data-slot="card-title"]')!.textContent
  )
const detailLabels = (card: HTMLElement) =>
  [...card.querySelectorAll('dt')].map((term) => term.textContent)

const grid = {
  title: 'show',
  description: 'city',
  details: ['sold', 'gross']
} as const

async function openOptions(user = userEvent.setup()) {
  await user.click(screen.getByRole('button', { name: 'Configure grid' }))
  const panel = await screen.findByRole('dialog', { name: 'Configure grid' })
  // The grid's fields load on first open.
  await within(panel).findByRole(
    'region',
    { name: 'Card fields' },
    { timeout: 5000 }
  )
  return { user, panel }
}

// The lazy settings module compiles on first import, slowly on a cold runner.
beforeAll(() => import('./RecordGridSettings'))

describe('RecordGrid', { timeout: 15_000 }, () => {
  it('lists a card per record, named by the caption', () => {
    render(
      <RecordGrid
        caption='Upcoming shows'
        data={testShows(3)}
        fields={showFields}
        {...grid}
      />
    )
    const list = screen.getByRole('list', { name: 'Upcoming shows' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(cardTitles()).toEqual([
      'Ocean Alley 1',
      'Ball Park Music 1',
      'Julia Jacklin 1'
    ])
    expect(cards()[0]).toHaveTextContent('Brisbane')
    expect(detailLabels(cards()[0]!)).toEqual(['Sold', 'Gross'])
  })

  it('links each card by its title', () => {
    render(
      <RecordGrid
        data={testShows(2)}
        fields={showFields}
        getRowHref={(row) => `/shows/${row.id}`}
        {...grid}
      />
    )
    expect(screen.getByRole('link', { name: 'Ocean Alley 1' })).toHaveAttribute(
      'href',
      '/shows/show-0'
    )
  })

  it("shows the view's own fields, in its order", () => {
    render(
      <RecordGrid
        data={testShows(2)}
        fields={showFields}
        defaultView={{ layout: { type: 'grid', fields: ['status', 'sold'] } }}
        {...grid}
      />
    )
    expect(detailLabels(cards()[0]!)).toEqual(['Status', 'Sold'])
  })

  it('places each card in its page, out of every match', () => {
    render(
      <RecordGrid
        data={testShows(30)}
        fields={showFields}
        defaultPosition={{ page: 1, pageSize: 10 }}
        {...grid}
      />
    )
    expect(cards()[0]).toHaveAttribute('aria-posinset', '11')
    expect(cards()[0]).toHaveAttribute('aria-setsize', '30')
  })

  it('windows a long list by rows of cards', () => {
    render(
      <RecordGrid
        data={testShows(500)}
        fields={showFields}
        defaultPosition={{ pageSize: 500 }}
        {...grid}
      />
    )
    expect(cards().length).toBeGreaterThan(0)
    expect(cards().length).toBeLessThan(500)
    expect(cards()[0]).toHaveAttribute('aria-setsize', '500')
  })

  describe('states', () => {
    it('says when nothing matches, and clears the search', async () => {
      render(
        <RecordGrid
          data={testShows(3)}
          fields={showFields}
          defaultView={{ query: { search: 'nothing like this' } }}
          {...grid}
        />
      )
      expect(screen.getByText('No records match')).toBeInTheDocument()
      await userEvent.click(
        screen.getByRole('button', { name: 'Clear search and filters' })
      )
      expect(cards()).toHaveLength(3)
    })

    it('shows the error with Retry', async () => {
      const onRetry = vi.fn()
      render(
        <RecordGrid
          data={[]}
          fields={showFields}
          error
          onRetry={onRetry}
          {...grid}
        />
      )
      expect(
        document.querySelector('[data-slot="records-error"]')
      ).toHaveTextContent("Couldn't load records")
      await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(onRetry).toHaveBeenCalled()
    })

    it('holds placeholders while the first records load', () => {
      render(<RecordGrid data={[]} fields={showFields} loading {...grid} />)
      expect(
        document.querySelector('[data-slot="record-grid-skeleton"]')
      ).not.toBeNull()
      expect(screen.queryByText('No records yet')).toBeNull()
    })

    it('dims the cards while more load', () => {
      render(
        <RecordGrid data={testShows(3)} fields={showFields} loading {...grid} />
      )
      expect(
        document.querySelector('[data-slot="record-grid-scroller"]')
      ).toHaveClass('opacity-60')
      expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('selection', () => {
    const bulkActions = [{ label: 'Archive', onAction: () => {} }]

    it('selects through Select mode, with the bar floating', async () => {
      const user = userEvent.setup()
      render(
        <RecordGrid
          data={testShows(3)}
          fields={showFields}
          bulkActions={bulkActions}
          getRowHref={(row) => `/shows/${row.id}`}
          {...grid}
        />
      )
      expect(screen.queryByRole('checkbox')).toBeNull()
      await user.click(screen.getByRole('button', { name: 'Select' }))
      // Select mode steps the links aside, so a tap selects.
      expect(screen.queryByRole('link')).toBeNull()
      await user.click(
        screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
      )
      expect(
        screen.getByRole('group', { name: 'Bulk actions' })
      ).toHaveTextContent('1 selected')
      expect(cards()[1]).toHaveAttribute('data-selected')
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('checkbox')).toBeNull()
    })
  })

  it('composes as a layout of Records', () => {
    function Composed() {
      const records = useRecords({ data: testShows(2), fields: showFields })
      return (
        <Records records={records} layouts={[gridLayout<TestShow>(grid)]}>
          <Records.Content />
        </Records>
      )
    }
    render(<Composed />)
    expect(cardTitles()).toEqual(['Ocean Alley 1', 'Ball Park Music 1'])
  })
})

describe('Grid settings', { timeout: 15_000 }, () => {
  it('names the button for the grid, and lists the shown and hidden fields', async () => {
    render(<RecordGrid data={testShows(3)} fields={showFields} {...grid} />)
    const { panel } = await openOptions()
    const fields = within(panel).getByRole('region', { name: 'Card fields' })
    expect(
      within(fields)
        .getAllByRole('button', { name: /^Reorder / })
        .map((handle) => handle.getAttribute('aria-label'))
    ).toEqual(['Reorder Sold', 'Reorder Gross'])
    expect(
      within(within(fields).getByRole('list', { name: 'Hidden' }))
        .getAllByRole('button')
        .map((toggle) => toggle.getAttribute('aria-label'))
    ).toEqual(['Show Status', 'Show Starts'])
  })

  it('hides and shows a field, writing the view and following focus', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordGrid
        data={testShows(3)}
        fields={showFields}
        onViewChange={onViewChange}
        {...grid}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(detailLabels(cards()[0]!)).toEqual(['Gross'])
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'grid',
      fields: ['gross']
    })
    const sold = within(panel).getByRole('button', { name: 'Show Sold' })
    expect(sold).toHaveAttribute('aria-pressed', 'false')
    expect(sold).toHaveFocus()
    await user.click(within(panel).getByRole('button', { name: 'Show Status' }))
    expect(detailLabels(cards()[0]!)).toEqual(['Gross', 'Status'])
    await user.click(within(panel).getByRole('button', { name: 'Show Status' }))
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(detailLabels(cards()[0]!)).toEqual(['Gross', 'Sold'])
    await user.click(
      within(panel).getByRole('button', { name: 'Reorder Sold' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move Sold to top' })
    )
    expect(onViewChange.mock.lastCall![0].layout).toEqual({ type: 'grid' })
  })

  it('keeps the last field shown when the grid defines some, and says why', async () => {
    render(
      <RecordGrid
        data={testShows(3)}
        fields={showFields}
        {...grid}
        details={['sold']}
      />
    )
    const { panel } = await openOptions()
    const sold = within(panel).getByRole('button', { name: 'Show Sold' })
    expect(sold).toBeDisabled()
    expect(sold).toHaveAccessibleDescription('A card shows at least one field')
  })

  it('hides every field the grid shows none of by default', async () => {
    render(
      <RecordGrid
        data={testShows(3)}
        fields={showFields}
        title='show'
        description='city'
      />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(detailLabels(cards()[0]!)).toEqual(['Sold'])
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(cards()[0]!.querySelector('dl')).toBeNull()
  })

  it('keeps fields this grid does not have in the view', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordGrid
        data={testShows(3)}
        fields={showFields}
        defaultView={{ layout: { type: 'grid', fields: ['fees', 'sold'] } }}
        onViewChange={onViewChange}
        {...grid}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show Gross' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'grid',
      fields: ['fees', 'sold', 'gross']
    })
  })
})
