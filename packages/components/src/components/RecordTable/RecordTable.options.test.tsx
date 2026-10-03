import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { type RecordView, recordFields } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns, tableLayout } from '.'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const column = tableColumns<TestShow>(showFields)
const showColumns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold'),
  column.field('gross')
]

const headers = () =>
  screen.getAllByRole('columnheader').map((header) => header.textContent)

async function openOptions(user = userEvent.setup()) {
  await user.click(screen.getByRole('button', { name: 'Configure table' }))
  const panel = await screen.findByRole('dialog', { name: 'Configure table' })
  // The table's columns load on first open.
  await within(panel).findByRole(
    'region',
    { name: 'Columns' },
    { timeout: 5000 }
  )
  return { user, panel }
}

// The lazy settings module compiles on first import, slowly on a cold runner.
beforeAll(() => import('./RecordTableSettings'))

// Each case opens the panel and clicks through it, slow on a busy runner.
describe('Records.Options', { timeout: 15_000 }, () => {
  it('is a normal icon button at the field size, named for the layout', () => {
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const button = screen.getByRole('button', { name: 'Configure table' })
    expect(button).toHaveClass('btn-icon-md', 'emphasis-normal')
  })

  it('lists the columns that move, and names the pinned one', async () => {
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const { panel } = await openOptions()
    const columns = within(panel).getByRole('region', { name: 'Columns' })
    expect(
      within(columns)
        .getAllByRole('button', { name: /^Reorder / })
        .map((handle) => handle.getAttribute('aria-label'))
    ).toEqual(['Reorder City', 'Reorder Sold', 'Reorder Gross'])
    expect(columns).toHaveTextContent('Show stays first')
  })

  it('hides and shows a column, keeping it listed', async () => {
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const { user, panel } = await openOptions()
    const city = within(panel).getByRole('button', { name: 'Show City' })
    expect(city).toHaveAttribute('aria-pressed', 'true')
    await user.click(city)
    expect(headers()).toEqual(['Show', 'Sold', 'Gross'])
    expect(
      within(panel).getByRole('button', { name: 'Show City' })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(panel).getByRole('button', { name: 'Reorder City' })
    ).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Show City' }))
    expect(headers()).toEqual(['Show', 'City', 'Sold', 'Gross'])
  })

  it('keeps the last column shown', async () => {
    const unpinned = [column.field('city'), column.field('sold')]
    render(
      <RecordTable data={testShows(5)} fields={showFields} columns={unpinned} />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show City' }))
    expect(headers()).toEqual(['Sold'])
    expect(
      within(panel).getByRole('button', { name: 'Show Sold' })
    ).toBeDisabled()
  })

  it('moves a column from the Move menu', async () => {
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(
      within(panel).getByRole('button', { name: 'Reorder Gross' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move Gross to top' })
    )
    expect(headers()).toEqual(['Show', 'Gross', 'City', 'Sold'])
  })

  it('writes the view: order and hidden in layout.columns, nothing once put back', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        onViewChange={onViewChange}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(
      within(panel).getByRole('button', { name: 'Reorder City' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move City to bottom' })
    )
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { order: ['sold', 'gross', 'city'] }
    })
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { order: ['sold', 'gross', 'city'], hidden: ['sold'] }
    })
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    await user.click(
      within(panel).getByRole('button', { name: 'Reorder City' })
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move City to top' })
    )
    expect(onViewChange.mock.lastCall![0].layout).toEqual({ type: 'table' })
  })

  it('reads a controlled view, and changes nothing until the parent does', async () => {
    const view: RecordView = {
      query: { search: '', filters: [], sort: [] },
      layout: { type: 'table', columns: { order: ['gross'], hidden: ['sold'] } }
    }
    const onViewChange = vi.fn()
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        view={view}
        onViewChange={onViewChange}
      />
    )
    expect(headers()).toEqual(['Show', 'Gross', 'City'])
    const { user, panel } = await openOptions()
    expect(
      within(panel)
        .getAllByRole('button', { name: /^Reorder / })
        .map((handle) => handle.getAttribute('aria-label'))
    ).toEqual(['Reorder Gross', 'Reorder City', 'Reorder Sold'])
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(headers()).toEqual(['Show', 'Gross', 'City'])
  })

  describe('sort', () => {
    it('adds a sort by the first sortable field, its natural way', async () => {
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      )
      const { user, panel } = await openOptions()
      const sort = within(panel).getByRole('region', { name: 'Sort' })
      await user.click(within(sort).getByRole('button', { name: 'Add sort' }))
      expect(
        within(sort).getByRole('combobox', { name: 'Sort by' })
      ).toHaveTextContent('Show')
      expect(
        within(sort).getByRole('combobox', { name: 'Show order' })
      ).toHaveTextContent('A to Z')
      expect(
        screen.getByRole('columnheader', { name: /Show/ })
      ).toHaveAttribute('aria-sort', 'ascending')
    })

    it('changes the field, starting it its natural way', async () => {
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      )
      const { user, panel } = await openOptions()
      await user.click(within(panel).getByRole('button', { name: 'Add sort' }))
      await user.click(within(panel).getByRole('combobox', { name: 'Sort by' }))
      await user.click(await screen.findByRole('option', { name: 'Gross' }))
      expect(
        within(panel).getByRole('combobox', { name: 'Gross order' })
      ).toHaveTextContent('High to low')
      expect(
        screen.getByRole('columnheader', { name: /Gross/ })
      ).toHaveAttribute('aria-sort', 'descending')
    })

    it('flips the direction', async () => {
      const onViewChange = vi.fn()
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          defaultView={{
            query: { sort: [{ field: 'sold', direction: 'descending' }] }
          }}
          onViewChange={onViewChange}
        />
      )
      const { user, panel } = await openOptions()
      await user.click(
        within(panel).getByRole('combobox', { name: 'Sold order' })
      )
      await user.click(
        await screen.findByRole('option', { name: 'Low to high' })
      )
      expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
        { field: 'sold', direction: 'ascending' }
      ])
    })

    it('adds levels with fields not sorted yet, and removes one', async () => {
      const onViewChange = vi.fn()
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          defaultView={{
            query: { sort: [{ field: 'city', direction: 'ascending' }] }
          }}
          onViewChange={onViewChange}
        />
      )
      const { user, panel } = await openOptions()
      await user.click(
        within(panel).getByRole('button', { name: 'Add another sort' })
      )
      expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
        { field: 'city', direction: 'ascending' },
        { field: 'show', direction: 'ascending' }
      ])
      await user.click(
        within(panel).getByRole('combobox', { name: 'Then by, level 2' })
      )
      expect(
        (await screen.findAllByRole('option')).map(
          (option) => option.textContent
        )
      ).toEqual(['Show', 'Sold', 'Gross', 'Status', 'Starts'])
      await user.keyboard('{Escape}')
      await user.click(
        within(panel).getByRole('button', { name: 'Remove sort by City' })
      )
      expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
        { field: 'show', direction: 'ascending' }
      ])
      expect(
        within(panel).getByRole('combobox', { name: 'Sort by' })
      ).toHaveTextContent('Show')
    })

    it('follows a header click', async () => {
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      )
      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Sold' }))
      const { panel } = await openOptions(user)
      expect(
        within(panel).getByRole('combobox', { name: 'Sort by' })
      ).toHaveTextContent('Sold')
      expect(
        within(panel).getByRole('combobox', { name: 'Sold order' })
      ).toHaveTextContent('High to low')
    })

    it('offers no sort when no field sorts', async () => {
      const field = recordFields<TestShow>()
      const fields = [
        field.text('show', { label: 'Show', sortable: false }),
        field.text('city', { label: 'City', sortable: false })
      ]
      const columns = tableColumns<TestShow>(fields)
      render(
        <RecordTable
          data={testShows(5)}
          fields={fields}
          columns={[columns.field('show'), columns.field('city')]}
        />
      )
      const { panel } = await openOptions()
      expect(within(panel).queryByRole('region', { name: 'Sort' })).toBeNull()
      expect(
        within(panel).getByRole('region', { name: 'Columns' })
      ).toBeInTheDocument()
    })
  })

  describe('focus', () => {
    it('moves to the new level, and after a remove to the next control', async () => {
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          defaultView={{
            query: {
              sort: [
                { field: 'city', direction: 'ascending' },
                { field: 'sold', direction: 'descending' }
              ]
            }
          }}
        />
      )
      const { user, panel } = await openOptions()
      await user.click(
        within(panel).getByRole('button', { name: 'Add another sort' })
      )
      expect(
        within(panel).getByRole('combobox', { name: 'Then by, level 3' })
      ).toHaveFocus()
      await user.click(
        within(panel).getByRole('button', { name: 'Remove sort by Show' })
      )
      expect(
        within(panel).getByRole('button', { name: 'Remove sort by Sold' })
      ).toHaveFocus()
      await user.click(
        within(panel).getByRole('button', { name: 'Remove sort by City' })
      )
      expect(
        within(panel).getByRole('button', { name: 'Remove sort by Sold' })
      ).toHaveFocus()
      await user.click(
        within(panel).getByRole('button', { name: 'Remove sort by Sold' })
      )
      expect(
        within(panel).getByRole('button', { name: 'Add sort' })
      ).toHaveFocus()
    })

    it('returns to the button on Escape', async () => {
      render(
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      )
      const { user } = await openOptions()
      await user.keyboard('{Escape}')
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Configure table' })
        ).toBeNull()
      )
      expect(
        screen.getByRole('button', { name: 'Configure table' })
      ).toHaveFocus()
    })
  })

  it('keeps a level on a field that does not sort, and shows a repeated field once', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        defaultView={{
          query: {
            sort: [
              { field: 'nope', direction: 'ascending' },
              { field: 'city', direction: 'ascending' },
              { field: 'city', direction: 'descending' }
            ]
          }
        }}
        onViewChange={onViewChange}
      />
    )
    const { user, panel } = await openOptions()
    expect(
      within(panel)
        .getAllByRole('combobox')
        .map((box) => box.textContent)
    ).toEqual(['City', 'A to Z'])
    await user.click(
      within(panel).getByRole('combobox', { name: 'City order' })
    )
    await user.click(await screen.findByRole('option', { name: 'Z to A' }))
    expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
      { field: 'nope', direction: 'ascending' },
      { field: 'city', direction: 'descending' }
    ])
  })

  it('drops a repeated field with its level', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        defaultView={{
          query: {
            sort: [
              { field: 'city', direction: 'ascending' },
              { field: 'sold', direction: 'descending' },
              { field: 'city', direction: 'descending' }
            ]
          }
        }}
        onViewChange={onViewChange}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('combobox', { name: 'Sort by' }))
    await user.click(await screen.findByRole('option', { name: 'Gross' }))
    expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
      { field: 'gross', direction: 'descending' },
      { field: 'sold', direction: 'descending' }
    ])
    await user.click(
      within(panel).getByRole('button', { name: 'Remove sort by Gross' })
    )
    expect(onViewChange.mock.lastCall![0].query.sort).toEqual([
      { field: 'sold', direction: 'descending' }
    ])
  })

  it('moves focus only once the change shows', async () => {
    // Applies column changes but not sort changes, as a parent might.
    function LayoutOnly() {
      const [view, setView] = useState<RecordView>({
        query: {
          search: '',
          filters: [],
          sort: [{ field: 'city', direction: 'ascending' }]
        },
        layout: { type: 'table' }
      })
      return (
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          view={view}
          onViewChange={(next) =>
            setView((held) =>
              next.layout === held.layout
                ? held
                : { ...held, layout: next.layout }
            )
          }
        />
      )
    }
    render(<LayoutOnly />)
    const { user, panel } = await openOptions()
    await user.click(
      within(panel).getByRole('button', { name: 'Remove sort by City' })
    )
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(
      within(panel).getByRole('button', { name: 'Show Sold' })
    ).toHaveFocus()
  })

  it('waits for the change even when the parent rebuilds an equal view', async () => {
    function Rebuilt() {
      const [layout, setLayout] = useState<RecordView['layout']>({
        type: 'table'
      })
      return (
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          view={{
            query: {
              search: '',
              filters: [],
              sort: [{ field: 'city', direction: 'ascending' }]
            },
            layout
          }}
          onViewChange={(next) => setLayout(next.layout)}
        />
      )
    }
    render(<Rebuilt />)
    const { user, panel } = await openOptions()
    await user.click(
      within(panel).getByRole('button', { name: 'Remove sort by City' })
    )
    await user.click(within(panel).getByRole('button', { name: 'Show Sold' }))
    expect(
      within(panel).getByRole('button', { name: 'Show Sold' })
    ).toHaveFocus()
  })

  it('preloads a lazy layout setting once the page is idle, and as the button is reached', async () => {
    const preload = vi.fn()
    const table = tableLayout(showColumns)
    const Settings = Object.assign(() => null, { preload })
    function Preloading() {
      const records = useRecords({ data: testShows(5), fields: showFields })
      return (
        <Records records={records} layouts={[{ ...table, Settings }]}>
          <Records.Toolbar />
        </Records>
      )
    }
    const { rerender } = render(<Preloading />)
    expect(preload).not.toHaveBeenCalled()
    // A new render with an equal layout doesn't put the preload off again.
    rerender(<Preloading />)
    await waitFor(() => expect(preload).toHaveBeenCalledTimes(1))
    await userEvent.hover(
      screen.getByRole('button', { name: 'Configure table' })
    )
    expect(preload).toHaveBeenCalledTimes(2)
  })

  it("says why the last shown column can't hide", async () => {
    const unpinned = [column.field('city'), column.field('sold')]
    render(
      <RecordTable data={testShows(5)} fields={showFields} columns={unpinned} />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show City' }))
    expect(
      within(panel).getByRole('button', { name: 'Show Sold' })
    ).toHaveAccessibleDescription('A table shows at least one column')
    expect(
      within(panel).getByRole('button', { name: 'Show City' })
    ).not.toHaveAccessibleDescription()
  })

  it('keeps columns this table does not have in the view', async () => {
    const onViewChange = vi.fn()
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        defaultView={{
          layout: {
            type: 'table',
            columns: { order: ['gross'], hidden: ['fees'] }
          }
        }}
        onViewChange={onViewChange}
      />
    )
    const { user, panel } = await openOptions()
    await user.click(within(panel).getByRole('button', { name: 'Show City' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { order: ['gross'], hidden: ['city', 'fees'] }
    })
  })

  it('renders nothing for a lone column that can neither move nor hide', () => {
    const field = recordFields<TestShow>()
    const fields = [field.text('city', { label: 'City', sortable: false })]
    render(
      <RecordTable
        data={testShows(5)}
        fields={fields}
        columns={[tableColumns<TestShow>(fields).field('city')]}
      />
    )
    expect(screen.queryByRole('button', { name: 'Configure table' })).toBeNull()
  })

  it('renders nothing with nothing to set', () => {
    const field = recordFields<TestShow>()
    const fields = [field.text('show', { label: 'Show', sortable: false })]
    render(
      <RecordTable
        data={testShows(5)}
        fields={fields}
        columns={[tableColumns<TestShow>(fields).field('show', { pin: true })]}
      />
    )
    expect(screen.queryByRole('button', { name: 'Configure table' })).toBeNull()
  })

  it('sits after the search and before the actions, so More is last', () => {
    render(
      <RecordTable
        data={testShows(5)}
        fields={showFields}
        columns={showColumns}
        tableActions={[
          { label: 'Export CSV', onAction: () => {} },
          { label: 'Print door list', onAction: () => {} }
        ]}
      />
    )
    const toolbar = document.querySelector('[data-slot="records-toolbar"]')!
    expect(
      within(toolbar as HTMLElement)
        .getAllByRole('button')
        .map(
          (button) => button.getAttribute('aria-label') ?? button.textContent
        )
    ).toEqual(['Configure table', 'Export CSV', 'More actions'])
  })

  it('takes a label, and composes in a custom toolbar', async () => {
    function Custom() {
      const records = useRecords({ data: testShows(5), fields: showFields })
      const [layouts] = useState(() => [tableLayout(showColumns)])
      return (
        <Records records={records} layouts={layouts}>
          <Records.Toolbar>
            <Records.Options label='Table options' />
          </Records.Toolbar>
          <Records.Content />
        </Records>
      )
    }
    render(<Custom />)
    await userEvent.click(screen.getByRole('button', { name: 'Table options' }))
    expect(
      await screen.findByRole('dialog', { name: 'Table options' })
    ).toBeInTheDocument()
  })
})
