import { useLayoutEffect } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Records, type RecordsBulkAction } from '.'
import { useRecordsContext } from './context'
import type { RecordLayoutDefinition } from './layouts'
import { type TestShow, showFields, testShows } from './testUtils'
import { useSurvivor } from './useBulkActions'
import { useRecords } from './useRecords'

// A layout like narrow rows or a grid: no checkboxes and no header row, so
// it selects through Select mode and the bulk actions float.
function TapList() {
  const { records, setSelectMode } = useRecordsContext()
  const survivor = useSurvivor('rows')
  useLayoutEffect(() => {
    setSelectMode(true)
    return () => setSelectMode(false)
  }, [setSelectMode])
  return (
    <ul aria-label='Shows' tabIndex={-1} {...survivor}>
      {records.rows.map(({ id, row }) => (
        <li key={id}>
          <button
            type='button'
            aria-pressed={
              records.selecting ? records.isSelected(id) : undefined
            }
            onClick={() => records.selecting && records.toggleRow(id)}
          >
            {(row as TestShow).show}
          </button>
        </li>
      ))}
    </ul>
  )
}

const tapLayout: RecordLayoutDefinition<null> = {
  type: 'grid',
  label: 'Tap list',
  icon: null,
  config: null,
  Content: TapList
}
const layouts = [tapLayout]

function Shows({
  actions = [{ label: 'Export', onAction: vi.fn() }]
}: {
  actions?: RecordsBulkAction[]
}) {
  const records = useRecords({
    data: testShows(12),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true,
    defaultView: { layout: { type: 'grid' } }
  })
  return (
    <Records.Root records={records} layouts={layouts}>
      <Records.Toolbar />
      <Records.Content />
      <Records.BulkActions actions={actions} />
      <Records.Status />
    </Records.Root>
  )
}

const toggle = () => screen.getByRole('button', { name: /^(Select|Done)$/ })
const floating = () => screen.queryByRole('group', { name: 'Bulk actions' })

describe('Records Select mode', () => {
  it('offers Select in the toolbar for a layout without checkboxes', async () => {
    const user = userEvent.setup()
    render(<Shows />)
    expect(toggle()).toHaveTextContent('Select')
    await user.click(toggle())
    expect(screen.getByRole('group', { name: 'Select mode' })).toBeVisible()
    expect(toggle()).toHaveTextContent('Done')
    expect(toggle()).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Select mode, 0 selected'
    )
  })

  it('selects by tap, offers Select all and Deselect all', async () => {
    const user = userEvent.setup()
    render(<Shows />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    expect(floating()).toHaveTextContent('1 selected')
    await user.click(screen.getByRole('button', { name: 'Select all' }))
    expect(floating()).toHaveTextContent('12 selected')
    await user.click(screen.getByRole('button', { name: 'Deselect all' }))
    expect(floating()).toBeNull()
    expect(toggle()).toHaveTextContent('Done')
  })

  it('leaves with Done or Escape and clears, keeping focus on the toggle', async () => {
    const user = userEvent.setup()
    render(<Shows />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    await user.keyboard('{Escape}')
    expect(toggle()).toHaveTextContent('Select')
    expect(floating()).toBeNull()
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ball Park Music 1' }))
    await user.click(toggle())
    expect(toggle()).toHaveTextContent('Select')
    expect(toggle()).toHaveFocus()
    expect(floating()).toBeNull()
  })

  it('floats the bulk actions without a second way to clear in Select mode', async () => {
    const user = userEvent.setup()
    const { container } = render(<Shows />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    expect(
      container.querySelector('[data-slot="records-bulk-dock"]')
    ).toContainElement(floating())
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).toBeNull()
    expect(
      within(floating()!).queryByRole('button', { name: 'Clear selection' })
    ).toBeNull()
  })

  it('leaves Select mode once an action succeeds', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Shows actions={[{ label: 'Export', onAction }]} />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    await user.click(
      within(floating()!).getByRole('button', { name: 'Export' })
    )
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
    await waitFor(() => expect(toggle()).toHaveTextContent('Select'))
    expect(floating()).toBeNull()
  })

  it('leaves Select mode with Escape from the floating bar', async () => {
    const user = userEvent.setup()
    render(<Shows />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    within(floating()!).getByRole('button', { name: 'Export' }).focus()
    await user.keyboard('{Escape}')
    expect(toggle()).toHaveTextContent('Select')
    expect(floating()).toBeNull()
  })

  it('keeps the selection when Escape cancels a confirm from the floating bar', async () => {
    const user = userEvent.setup()
    render(
      <Shows
        actions={[{ label: 'Cancel', intent: 'danger', onAction: vi.fn() }]}
      />
    )
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    await user.click(
      within(floating()!).getByRole('button', { name: 'Cancel' })
    )
    const confirm = await screen.findByRole('alertdialog')
    // The confirm takes focus a frame after it opens; Escape before then is the bar's.
    await waitFor(() =>
      expect(confirm).toContainElement(document.activeElement as HTMLElement)
    )
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(floating()).toHaveTextContent('1 selected')
    expect(toggle()).toHaveTextContent('Done')
  })
})

describe('Records floating bulk actions', () => {
  // Each part of the bar measures 100px, in records 360px wide.
  function measured() {
    return vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const width = this.matches(
          '[data-slot="records"], [data-slot="records-dock-scope"]'
        )
          ? 360
          : 100
        return {
          width,
          height: 40,
          top: 0,
          left: 0,
          right: width,
          bottom: 40
        } as DOMRect
      })
  }

  const many: RecordsBulkAction[] = ['Export', 'Archive', 'Print', 'Email'].map(
    (label) => ({ label, onAction: vi.fn() })
  )

  it('keeps the first action out and puts those that do not fit in More actions, last', async () => {
    const spy = measured()
    const user = userEvent.setup()
    render(<Shows actions={many} />)
    await user.click(toggle())
    await user.click(screen.getByRole('button', { name: 'Ocean Alley 1' }))
    const bar = floating()!
    const buttons = within(bar).getAllByRole('button')
    expect(
      buttons.map(
        (button) => button.textContent || button.getAttribute('aria-label')
      )
    ).toEqual(['Export', 'More actions'])
    await user.click(within(bar).getByRole('button', { name: 'More actions' }))
    expect(
      (await screen.findAllByRole('menuitem')).map((item) => item.textContent)
    ).toEqual(['Archive', 'Print', 'Email'])
    await user.click(screen.getByRole('menuitem', { name: 'Print' }))
    expect(many[2]!.onAction).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('keeps focus with the records after clearing under a Provider', async () => {
    const user = userEvent.setup()
    function Provided() {
      const records = useRecords({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true,
        defaultSelection: { ids: ['show-0'] },
        defaultView: { layout: { type: 'grid' } }
      })
      return (
        <Records.Provider records={records} layouts={layouts}>
          <div>
            <Records.Content />
          </div>
          <div>
            <Records.BulkActions actions={many.slice(0, 1)} />
          </div>
        </Records.Provider>
      )
    }
    render(<Provided />)
    await user.click(
      within(floating()!).getByRole('button', { name: 'Clear selection' })
    )
    expect(floating()).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('list', { name: 'Shows' })
    )
  })

  it('counts the gaps between the count and its buttons when fitting', async () => {
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const width = this.matches('[data-testid="records"]')
          ? 360
          : this.matches('[data-slot="records-bulk-action"]')
            ? 54
            : this.matches('[data-slot="records-bulk-more"]')
              ? 50
              : 100
        return {
          width,
          height: 40,
          top: 0,
          left: 0,
          right: width,
          bottom: 40
        } as DOMRect
      })
    const computed = window.getComputedStyle
    const style = vi
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element, pseudo) => {
        const value = computed(element, pseudo)
        if ((element as HTMLElement).dataset?.slot === 'records-bulk-actions')
          Object.defineProperty(value, 'columnGap', { value: '8px' })
        return value
      })
    function Provided() {
      const records = useRecords({
        data: testShows(12),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true,
        defaultSelection: { ids: ['show-0'] },
        defaultView: { layout: { type: 'grid' } }
      })
      return (
        <Records.Provider records={records} layouts={layouts}>
          <div data-testid='records'>
            <Records.Content />
            <Records.BulkActions actions={many.slice(0, 2)} />
          </div>
        </Records.Provider>
      )
    }
    render(<Provided />)
    expect(
      within(floating()!).getByRole('button', { name: 'More actions' })
    ).toBeInTheDocument()
    rect.mockRestore()
    style.mockRestore()
  })
})
