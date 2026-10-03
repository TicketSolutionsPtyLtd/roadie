import * as React from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RecordView } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns, tableLayout } from '.'
import { RoadieLinkProvider } from '../../providers/RoadieLinkProvider'
import { Menu } from '../Menu'
import { Records, type RecordsBulkAction, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import {
  bulkBar,
  countMenuItems,
  pickFromCount,
  showColumns
} from './testUtils'

afterEach(() => vi.restoreAllMocks())

const layouts = [tableLayout(showColumns)]

function Bulk({ actions }: { actions: RecordsBulkAction[] }) {
  const records = useRecords({
    data: testShows(120),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true,
    // Few rows a page keeps each update cheap; 120 records still span pages.
    defaultPosition: { pageSize: 10 }
  })
  return (
    <Records.Root records={records} layouts={layouts} caption='Shows'>
      <Records.Search />
      <Records.Content />
      <Records.Pagination />
      <Records.BulkActions
        actions={actions}
        recordName={{ one: 'show', other: 'shows' }}
      />
      <Records.Status />
    </Records.Root>
  )
}

const pick = (name: string) =>
  userEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }))

describe('RecordTable bulk actions', () => {
  it('appears with a count once something is selected', async () => {
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    expect(bulkBar()).toBeNull()
    await pick('Ocean Alley 1')
    expect(bulkBar()!).toHaveTextContent('1 selected')
    expect(screen.getByRole('status')).toHaveTextContent('1 selected')
  })

  it('offers every matching row once the page is selected', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 shows')
    expect(bulkBar()!).toHaveTextContent('120 selected')
  })

  it('runs an action with the selection and query, then clears', async () => {
    const onAction = vi.fn()
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await pick('Ocean Alley 1')
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
    await waitFor(() => expect(bulkBar()).toBeNull())
  })

  it('confirms a danger action before running it', async () => {
    const onAction = vi.fn()
    render(<Bulk actions={[{ label: 'Refund', intent: 'danger', onAction }]} />)
    await pick('Ocean Alley 1')
    await userEvent.click(screen.getByRole('button', { name: 'Refund' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Refund 1 show?'
    })
    expect(onAction).not.toHaveBeenCalled()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Refund' })
    )
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('keeps the selection when an action rejects, and reports the error', async () => {
    const failure = new Error('Network')
    const onAction = vi.fn().mockRejectedValue(failure)
    const reportError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await pick('Ocean Alley 1')
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled()
    )
    expect(bulkBar()!).toHaveTextContent('1 selected')
    expect(reportError).toHaveBeenCalledWith(failure)
    reportError.mockRestore()
  })

  it('acts only on selected rows the search still shows', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('searchbox'))
    await user.paste('Perth')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select angie McMahon 1' })
    )
    const bar = bulkBar()!
    expect(bar).toHaveTextContent('1 selected')
    await user.click(within(bar).getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-3'] },
      expect.objectContaining({ search: 'Perth' })
    )
  })

  it('confirms and acts on only matching rows under a controlled query', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    function Controlled() {
      const [view, setView] = React.useState<RecordView>({
        query: { search: '', filters: [], sort: [] },
        layout: { type: 'table' }
      })
      const records = useRecords({
        data: testShows(120),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true,
        view,
        onViewChange: setView,
        defaultPosition: { pageSize: 10 }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            onClick={() =>
              setView({ ...view, query: { ...view.query, search: 'Perth' } })
            }
          >
            Perth only
          </button>
          <Records.Content />
          <Records.BulkActions
            actions={[{ label: 'Refund', intent: 'danger', onAction }]}
            recordName={{ one: 'show', other: 'shows' }}
          />
        </Records.Root>
      )
    }
    render(<Controlled />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Perth only' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select angie McMahon 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Refund' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Refund 1 show?'
    })
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-3'] },
      expect.objectContaining({ search: 'Perth' })
    )
  })

  it('offers every matching row only while the whole page is checked', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    expect(await countMenuItems(user)).toContain('Select all 120 shows')
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await countMenuItems(user)).toEqual(['Clear selection'])
  })

  it('confirms a non-danger action that sets confirm', async () => {
    const onAction = vi.fn()
    render(
      <Bulk
        actions={[
          { label: 'Archive', confirm: { title: 'Archive them?' }, onAction }
        ]}
      />
    )
    await pick('Ocean Alley 1')
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Archive them?'
    })
    expect(onAction).not.toHaveBeenCalled()
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Archive' })
    )
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('announces the selection and the results together while searching', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(screen.getByRole('searchbox'))
    await user.paste('Perth')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select angie McMahon 1' })
    )
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '1 selected, 24 results'
      )
    )
  })

  it('keeps rows ticked while an action runs', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    await act(async () => finish())
    expect(bulkBar()!).toHaveTextContent('1 selected')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps a record picked while an all-matching action runs', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve))
    )
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 shows')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { allMatching: true, except: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await act(async () => finish())
    expect(bulkBar()!).toHaveTextContent('1 selected')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('clears with Escape after an action', async () => {
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await pick('Ocean Alley 1')
    await userEvent.click(screen.getByRole('button', { name: 'Export' }))
    await pick('Ocean Alley 1')
    screen.getByRole('button', { name: 'Export' }).focus()
    await userEvent.keyboard('{Escape}')
    expect(bulkBar()).toBeNull()
  })

  it('keeps focus on a busy action, then moves it to Select page', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    const button = screen.getByRole('button', { name: 'Export' })
    await user.click(button)
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveFocus()
    await act(async () => finish())
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Select page' })
      ).toHaveFocus()
    )
  })

  it('moves focus to Select page once a successful action clears the bar', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Select page' })
      ).toHaveFocus()
    )
  })

  it('moves focus to Select page after Escape clears the bar', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    screen.getByRole('button', { name: 'Export' }).focus()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
  })

  it('moves focus to Select page after Clear selection', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await pickFromCount(user, 'Clear selection')
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Select page' })
      ).toHaveFocus()
    )
  })
})

describe('RecordTable preset', () => {
  it('turns on selection and the bar when the preset gets bulk actions', async () => {
    render(
      <RecordTable
        data={testShows(12)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        bulkActions={[{ label: 'Export', onAction: vi.fn() }]}
        recordName={{ one: 'show', other: 'shows' }}
      />
    )
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    expect(bulkBar()!).toHaveTextContent('1 selected')
  })
})

describe('RecordTable row actions', () => {
  it('opens a named menu per row with the consumer items', async () => {
    const onEdit = vi.fn()
    function Actions() {
      const records = useRecords({
        data: testShows(3),
        fields: showFields,
        getRowId: (row) => row.id,
        rowActions: (row) => (
          <Menu.Item onClick={() => onEdit(row.id)}>Edit</Menu.Item>
        )
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Actions />)
    await userEvent.click(
      screen.getByRole('button', { name: 'More actions for Ball Park Music 1' })
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('show-1')
  })

  it('adds no actions column without rowActions', () => {
    render(<Bulk actions={[]} />)
    expect(screen.queryByRole('button', { name: /More actions/ })).toBeNull()
  })
})

describe('RecordTable row links', () => {
  function Linked({
    onNavigate,
    onEdit = () => {},
    selectable = true
  }: {
    onNavigate: (href: string) => void
    onEdit?: (id: string) => void
    selectable?: boolean
  }) {
    const records = useRecords({
      data: testShows(3),
      fields: showFields,
      getRowId: (row) => row.id,
      selectable,
      getRowHref: (row) => `/shows/${row.id}`,
      rowActions: (row) => (
        <Menu.Item onClick={() => onEdit(row.id)}>Edit</Menu.Item>
      )
    })
    const Link = ({ href, ...props }: React.ComponentProps<'a'>) => (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          event.preventDefault()
          onNavigate(String(href))
        }}
      />
    )
    return (
      <RoadieLinkProvider Link={Link}>
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      </RoadieLinkProvider>
    )
  }

  it('links the title cell through the provider', () => {
    render(<Linked onNavigate={vi.fn()} />)
    expect(
      screen.getByRole('link', { name: 'Ball Park Music 1' })
    ).toHaveAttribute('href', '/shows/show-1')
  })

  it('follows the link from anywhere on a row without selection', async () => {
    const onNavigate = vi.fn()
    render(<Linked onNavigate={onNavigate} selectable={false} />)
    await userEvent.click(screen.getByText('Melbourne'))
    expect(onNavigate).toHaveBeenCalledWith('/shows/show-1')
  })

  it('selects a selectable row from anywhere but its link', async () => {
    const onNavigate = vi.fn()
    const user = userEvent.setup()
    render(<Linked onNavigate={onNavigate} />)
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Ball Park Music 1'
    })
    await user.click(screen.getByText('Melbourne'))
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(onNavigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: 'Ball Park Music 1' }))
    expect(onNavigate).toHaveBeenCalledWith('/shows/show-1')
  })

  it('extends the selection with Shift from anywhere on a row', async () => {
    const user = userEvent.setup()
    render(<Linked onNavigate={vi.fn()} />)
    await user.click(screen.getAllByText('Brisbane')[0]!)
    await user.keyboard('{Shift>}')
    await user.click(screen.getByText('Sydney'))
    await user.keyboard('{/Shift}')
    expect(
      screen
        .getAllByRole('checkbox')
        .filter((box) => box.getAttribute('aria-label') !== 'Select page')
        .filter((box) => box.getAttribute('aria-checked') === 'true')
    ).toHaveLength(3)
  })

  it('opens the record in a new tab with Cmd on a selectable row', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const user = userEvent.setup()
    render(<Linked onNavigate={vi.fn()} />)
    await user.keyboard('{Meta>}')
    await user.click(screen.getByText('Melbourne'))
    await user.keyboard('{/Meta}')
    expect(open).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it('leaves checkboxes and menus to themselves', async () => {
    const onNavigate = vi.fn()
    render(<Linked onNavigate={onNavigate} />)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    await userEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Ball Park Music 1'
      })
    )
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('leaves near-misses beside a checkbox or the actions button alone', async () => {
    const onNavigate = vi.fn()
    render(<Linked onNavigate={onNavigate} />)
    const checkbox = screen.getByRole('checkbox', {
      name: 'Select Ball Park Music 1'
    })
    await userEvent.click(checkbox.closest('[role="cell"]')!)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    const more = screen.getByRole('button', {
      name: 'More actions for Ball Park Music 1'
    })
    await userEvent.click(more.closest('[role="cell"]')!)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('runs a row menu item, not the row link, on click', async () => {
    const onNavigate = vi.fn()
    const onEdit = vi.fn()
    render(<Linked onNavigate={onNavigate} onEdit={onEdit} />)
    await userEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Ball Park Music 1'
      })
    )
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('show-1')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('runs a row menu item, not the row link, on keyboard Enter', async () => {
    const onNavigate = vi.fn()
    const onEdit = vi.fn()
    render(<Linked onNavigate={onNavigate} onEdit={onEdit} />)
    await userEvent.click(
      screen.getByRole('button', {
        name: 'More actions for Ball Park Music 1'
      })
    )
    const item = await screen.findByRole('menuitem', { name: 'Edit' })
    item.focus()
    await userEvent.keyboard('{Enter}')
    expect(onEdit).toHaveBeenCalledWith('show-1')
    expect(onNavigate).not.toHaveBeenCalled()
  })
})

describe('RecordTable row links: rows without a record page', () => {
  it('links only the rows getRowHref names', () => {
    function Partly() {
      const records = useRecords({
        data: testShows(3),
        fields: showFields,
        getRowId: (row) => row.id,
        getRowHref: (row) =>
          row.id === 'show-1' ? undefined : `/shows/${row.id}`
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Partly />)
    expect(screen.queryByRole('link', { name: 'Ball Park Music 1' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Ocean Alley 1' })).toHaveAttribute(
      'href',
      '/shows/show-0'
    )
    const unlinked = screen
      .getByText('Ball Park Music 1')
      .closest('[role="row"]')!
    expect(unlinked.className).not.toContain('cursor-pointer')
  })
})

describe('RecordTable row links: no column can carry the link', () => {
  const numbers = [
    tableLayout([tableColumns<TestShow>(showFields).field('sold')])
  ]

  function NumberOnly({ rows = 3 }: { rows?: number }) {
    const records = useRecords({
      data: testShows(rows),
      fields: showFields,
      getRowId: (row) => row.id,
      getRowHref: (row) => `/shows/${row.id}`
    })
    return (
      <Records.Root records={records} layouts={numbers}>
        <Records.Content />
      </Records.Root>
    )
  }

  it('adds no link, no hover affordance, and warns once in dev', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<NumberOnly />)
    expect(screen.queryByRole('link')).toBeNull()
    const row = container.querySelector('[role="row"]')!
    expect(row.className).not.toContain('cursor-pointer')
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no column can carry the link')
    )
  })

  it('warns once per table, not once per row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<NumberOnly rows={20} />)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('RecordTable row links: rows with no title', () => {
  it('links no row whose title is empty', () => {
    function Untitled() {
      const records = useRecords({
        data: [{ ...testShows(1)[0]!, show: '' }, testShows(2)[1]!],
        fields: showFields,
        getRowId: (row) => row.id,
        getRowHref: (row) => `/shows/${row.id}`
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Untitled />)
    expect(screen.getAllByRole('link')).toHaveLength(1)
    const untitled = document.querySelector('[data-row-id="show-0"]')!
    expect(untitled.className).not.toContain('cursor-pointer')
  })
})

describe('Records.Search', () => {
  it('takes its own accessible name', () => {
    function Named() {
      const records = useRecords({ data: testShows(3), fields: showFields })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search
            placeholder='Search'
            aria-label='Search shows by name'
          />
        </Records.Root>
      )
    }
    render(<Named />)
    expect(
      screen.getByRole('searchbox', { name: 'Search shows by name' })
    ).toHaveAttribute('placeholder', 'Search')
  })

  it('takes its name from the toolbar and the preset', () => {
    render(
      <RecordTable
        data={testShows(3)}
        fields={showFields}
        columns={showColumns}
        searchPlaceholder='Search'
        searchLabel='Search shows by name'
      />
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search shows by name' })
    ).toHaveAttribute('placeholder', 'Search')
  })
})
