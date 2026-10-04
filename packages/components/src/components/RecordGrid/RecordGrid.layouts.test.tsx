import { useState } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import {
  type RecordView,
  fromSearchParams,
  toSearchParams
} from '@oztix/roadie-core/records'

import { gridLayout } from '.'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const column = tableColumns<TestShow>(showFields)
const layouts = [
  tableLayout([
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('sold')
  ]),
  gridLayout<TestShow>({
    title: 'show',
    description: 'city',
    details: ['sold']
  })
]
const shows = testShows(6)

const onGrid: RecordView = {
  id: 'grid',
  name: 'Cards',
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'grid', fields: ['gross', 'sold'] }
}

function Harness({
  initialView,
  baseline,
  onViewChange,
  shownLayouts = layouts,
  selectable = false
}: {
  initialView?: RecordView
  baseline?: RecordView
  onViewChange?: (view: RecordView) => void
  shownLayouts?: typeof layouts
  selectable?: boolean
}) {
  const [view, setView] = useState(initialView ?? baseline)
  const records = useRecords({
    data: shows,
    fields: showFields,
    selectable,
    ...(view && {
      view,
      onViewChange: (next: RecordView) => {
        setView(next)
        onViewChange?.(next)
      }
    }),
    ...(!view && { onViewChange }),
    baseline
  })
  return (
    <Records records={records} layouts={shownLayouts} caption='Shows'>
      <Records.Toolbar
        viewActions={baseline ? { onSaveAs: () => {} } : undefined}
      />
      <Records.Content />
      {selectable && (
        <Records.BulkActions
          actions={[{ label: 'Archive', onAction: () => {} }]}
        />
      )}
    </Records>
  )
}

const cards = () =>
  document.querySelectorAll('[data-slot="record-grid-card"]').length
const configure = () => screen.getByRole('button', { name: /^Configure/ })

async function openOptions(user = userEvent.setup()) {
  await user.click(configure())
  const panel = await screen.findByRole('dialog', { name: /^Configure/ })
  return { user, panel }
}

const layoutGroup = (panel: HTMLElement) =>
  within(panel).getByRole('group', { name: 'Layout' })

async function switchTo(name: 'Table' | 'Grid', user = userEvent.setup()) {
  const { panel } = await openOptions(user)
  await user.click(within(layoutGroup(panel)).getByRole('button', { name }))
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

beforeAll(() =>
  Promise.all([
    import('./RecordGridSettings'),
    import('../RecordTable/RecordTableSettings')
  ])
)

describe('Layout switcher', { timeout: 15_000 }, () => {
  it('shows only with more than one layout', async () => {
    render(<Harness shownLayouts={[layouts[0]!]} />)
    const { panel } = await openOptions()
    expect(within(panel).queryByRole('group', { name: 'Layout' })).toBeNull()
  })

  it('sits above the sort, with the shown layout pressed', async () => {
    render(<Harness />)
    const { panel } = await openOptions()
    expect(
      within(panel)
        .getAllByRole('heading')
        .map((heading) => heading.textContent)
        .slice(0, 2)
    ).toEqual(['Layout', 'Sort'])
    const group = layoutGroup(panel)
    expect(
      within(group).getByRole('button', { name: 'Table' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getByRole('button', { name: 'Grid' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it("switches to the grid, writing the view's layout, and shows its settings", async () => {
    const onViewChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onViewChange={onViewChange} />)
    const { panel } = await openOptions(user)
    const grid = within(layoutGroup(panel)).getByRole('button', {
      name: 'Grid'
    })
    await user.click(grid)
    expect(onViewChange.mock.lastCall![0].layout).toEqual({ type: 'grid' })
    expect(cards()).toBe(6)
    expect(screen.queryByRole('table')).toBeNull()
    expect(grid).toHaveFocus()
    expect(grid).toHaveAttribute('aria-pressed', 'true')
    expect(
      await within(panel).findByRole(
        'region',
        { name: 'Card fields' },
        { timeout: 5000 }
      )
    ).toBeInTheDocument()
    expect(within(panel).queryByRole('region', { name: 'Columns' })).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Configure grid' })
      ).toHaveFocus()
    )
  })

  it("keeps each layout's settings as last shown when switching back", async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<Harness onViewChange={onViewChange} />)
    const { panel } = await openOptions(user)
    await user.click(
      await within(panel).findByRole(
        'button',
        { name: 'Show City' },
        { timeout: 5000 }
      )
    )
    const group = layoutGroup(panel)
    await user.click(within(group).getByRole('button', { name: 'Grid' }))
    await user.click(within(group).getByRole('button', { name: 'Table' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { hidden: ['city'] }
    })
  })

  it('goes back to the baseline’s layout settings, reading as unchanged', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        baseline={onGrid}
        initialView={{ ...onGrid, layout: { type: 'table' } }}
      />
    )
    expect(
      screen.getByRole('button', { name: /^View: Cards, unsaved changes/ })
    ).toBeInTheDocument()
    await switchTo('Grid', user)
    expect(
      screen.getByRole('button', { name: /^View: Cards$/ })
    ).toBeInTheDocument()
    const first = document.querySelector('[data-slot="record-grid-card"]')!
    expect(
      [...first.querySelectorAll('dt')].map((dt) => dt.textContent)
    ).toEqual(['Gross', 'Sold'])
  })

  it('round-trips the layout through the URL', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    const { unmount } = render(<Harness onViewChange={onViewChange} />)
    await switchTo('Grid', user)
    const { panel } = await openOptions(user)
    await user.click(
      await within(panel).findByRole(
        'button',
        { name: 'Show Gross' },
        { timeout: 5000 }
      )
    )
    const written: RecordView = onViewChange.mock.lastCall![0]
    unmount()
    const read = fromSearchParams(toSearchParams(written), showFields)
    expect(read.view.layout).toEqual({
      type: 'grid',
      fields: ['sold', 'gross']
    })
    render(<Harness initialView={read.view} />)
    expect(cards()).toBe(6)
    expect(
      screen.getByRole('button', { name: 'Configure grid' })
    ).toBeInTheDocument()
  })

  it('keeps the selection across a switch, selecting through Select mode in the grid', async () => {
    const user = userEvent.setup()
    render(<Harness selectable />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await switchTo('Grid', user)
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeChecked()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Bulk actions' })
    ).toHaveTextContent('1 selected')
    await switchTo('Table', user)
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull()
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeChecked()
    expect(
      screen.getByRole('toolbar', { name: 'Bulk actions' })
    ).toHaveTextContent('1 selected')
  })
})
