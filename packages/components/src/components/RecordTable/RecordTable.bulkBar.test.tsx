import { useEffect } from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RecordTable, tableLayout } from '.'
import { Pane } from '../Pane'
import {
  Records,
  type RecordsBulkAction,
  type RecordsInstance,
  useRecords
} from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { showColumns } from './testUtils'

afterEach(() => vi.restoreAllMocks())

const shows = { one: 'show', other: 'shows' }
const layouts = [tableLayout(showColumns)]

function Bulk({
  actions,
  rows = 120
}: {
  actions: RecordsBulkAction[]
  rows?: number
}) {
  const records = useRecords<TestShow>({
    data: testShows(rows),
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
      <Records.BulkActions actions={actions} recordName={shows} />
      <Records.Status />
    </Records.Root>
  )
}

const bar = () => screen.queryByRole('toolbar', { name: 'Bulk actions' })
const pick = (name: string) =>
  userEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }))

describe('RecordTable selection bar', () => {
  it('keeps every column header for assistive tech, with the bar after them', async () => {
    const { container } = render(
      <Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />
    )
    await pick('Ocean Alley 1')
    const row = container.querySelector('[data-slot="record-table-head-row"]')!
    const headers = within(row as HTMLElement).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual([
      '',
      'Show',
      'City',
      'Sold',
      'Gross',
      expect.stringContaining('1 selected')
    ])
    expect(headers[1]).not.toContainElement(bar())
    expect(headers.at(-1)).toContainElement(bar())
    expect(
      within(row as HTMLElement).queryByRole('button', { name: /City/ })
    ).toBeNull()
  })

  it('moves focus to Select page when a selection made elsewhere hides a focused sort button', async () => {
    const holder: { records?: RecordsInstance<TestShow> } = {}
    function Held() {
      const records = useRecords<TestShow>({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      useEffect(() => {
        holder.records = records
      })
      return (
        <Records.Root records={records} layouts={layouts} caption='Shows'>
          <Records.Content />
          <Records.BulkActions
            actions={[{ label: 'Export', onAction: vi.fn() }]}
          />
        </Records.Root>
      )
    }
    render(<Held />)
    screen.getByRole('button', { name: /City/ }).focus()
    act(() => holder.records!.toggleRow('show-0'))
    expect(bar()).not.toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
  })

  it('replaces the column headers while rows are selected', async () => {
    const { container } = render(
      <Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />
    )
    expect(bar()).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeVisible()
    await pick('Ocean Alley 1')
    const head = container.querySelector('[data-slot="record-table-head"]')!
    expect(head).toContainElement(bar())
    expect(bar()).toHaveTextContent('1 selected')
    expect(screen.getByRole('columnheader', { name: 'City' })).toHaveClass(
      'sr-only'
    )
    expect(
      container.querySelector('[data-slot="records-bulk-dock"]')
    ).toBeNull()
    await pick('Ocean Alley 1')
    expect(bar()).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeVisible()
  })

  it('offers Select all and Clear selection from the count', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await user.click(within(bar()!).getByRole('button', { name: /selected/ }))
    await user.click(
      await screen.findByRole('menuitem', { name: 'Select all 120 shows' })
    )
    expect(bar()).toHaveTextContent('120 selected')
    await user.click(within(bar()!).getByRole('button', { name: /selected/ }))
    expect(
      screen.queryByRole('menuitem', { name: /Select all/ })
    ).not.toBeInTheDocument()
    await user.click(
      await screen.findByRole('menuitem', { name: 'Clear selection' })
    )
    await waitFor(() => expect(bar()).toBeNull())
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
  })

  it('keeps focus on the page checkbox as the bar takes over', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    const page = screen.getByRole('checkbox', { name: 'Select page' })
    await user.click(page)
    expect(bar()).not.toBeNull()
    expect(page).toBeInTheDocument()
    expect(page).toHaveFocus()
    await user.click(page)
    expect(bar()).toBeNull()
    expect(page).toHaveFocus()
  })

  it('clears with Escape from inside the bar', async () => {
    const user = userEvent.setup()
    render(<Bulk actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await pick('Ocean Alley 1')
    within(bar()!).getByRole('button', { name: 'Export' }).focus()
    await user.keyboard('{Escape}')
    expect(bar()).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
  })

  it('moves between its controls with the arrow keys', async () => {
    const user = userEvent.setup()
    render(
      <Bulk
        actions={[
          { label: 'Export', onAction: vi.fn() },
          { label: 'Archive', onAction: vi.fn() }
        ]}
      />
    )
    await pick('Ocean Alley 1')
    const toolbar = bar()!
    within(toolbar).getByRole('button', { name: '1 selected' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(
      within(toolbar).getByRole('button', { name: 'Export' })
    ).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(
      within(toolbar).getByRole('button', { name: 'Archive' })
    ).toHaveFocus()
  })

  it('runs an action on the selection, then brings the headers back', async () => {
    const onAction = vi.fn()
    render(<Bulk actions={[{ label: 'Export', onAction }]} />)
    await pick('Ocean Alley 1')
    await userEvent.click(
      within(bar()!).getByRole('button', { name: 'Export' })
    )
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
    await waitFor(() => expect(bar()).toBeNull())
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeVisible()
  })

  it('moves actions that do not fit into More actions', async () => {
    const widths: Record<string, number> = {
      'records-bulk-actions': 300,
      'records-bulk-count': 100,
      'records-bulk-action': 80,
      'records-bulk-more': 32
    }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const width = widths[this.dataset.slot ?? ''] ?? 0
        return { width, height: 0, top: 0, left: 0 } as DOMRect
      }
    )
    const computed = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element, pseudo) => {
        const style = computed(element, pseudo)
        if ((element as HTMLElement).dataset.slot === 'records-bulk-actions')
          Object.defineProperty(style, 'columnGap', { value: '8px' })
        return style
      }
    )
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <Bulk
        actions={[
          { label: 'Tag', onAction: vi.fn() },
          { label: 'Archive', onAction: vi.fn() },
          { label: 'Refund', intent: 'danger', onAction }
        ]}
      />
    )
    await pick('Ocean Alley 1')
    await act(async () => {})
    // Two actions and More need 316 of the 300; one and More fit.
    const toolbar = bar()!
    expect(within(toolbar).getByRole('button', { name: 'Tag' })).toBeVisible()
    expect(within(toolbar).queryByRole('button', { name: 'Refund' })).toBeNull()
    await user.click(
      within(toolbar).getByRole('button', { name: 'More actions' })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Archive' })
    ).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Refund' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Refund 1 show?'
    })
    expect(onAction).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Refund' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
  })

  it('puts the bar in the header when composed in a Pane', async () => {
    function InPane() {
      const records = useRecords<TestShow>({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      return (
        <Records.Provider records={records} layouts={layouts} caption='Shows'>
          <Pane>
            <Pane.Body>
              <Records.Content fill />
            </Pane.Body>
            <Pane.Footer>
              <Records.BulkActions
                actions={[{ label: 'Export', onAction: vi.fn() }]}
              />
            </Pane.Footer>
          </Pane>
        </Records.Provider>
      )
    }
    const { container } = render(<InPane />)
    await pick('Ocean Alley 1')
    expect(
      container.querySelector('[data-slot="record-table-head"]')
    ).toContainElement(bar())
    expect(
      container.querySelector('[data-slot="records-bulk-dock"]')
    ).toBeNull()
  })

  it('renders no floating bar on the server for a table with a selection', () => {
    const html = renderToString(
      <RecordTable
        data={testShows(12)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        defaultSelection={{ ids: ['show-0'] }}
        bulkActions={[{ label: 'Export', onAction: vi.fn() }]}
      />
    )
    expect(html).not.toContain('records-bulk-dock')
  })

  it('shows no bar, and warns, for records that are not selectable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    function Unselectable() {
      const records = useRecords<TestShow>({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selection: { ids: ['show-0'] }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
          <Records.BulkActions
            actions={[{ label: 'Export', onAction: vi.fn() }]}
          />
        </Records.Root>
      )
    }
    const { container } = render(<Unselectable />)
    expect(bar()).toBeNull()
    expect(
      container.querySelector('[data-slot="records-bulk-dock"]')
    ).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('selectable'))
  })
})
