import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { RecordTable, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Menu } from '../Menu'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import { showFields, testShows } from '../Records/testUtils'
import {
  ALL,
  WIDE_BOX,
  bulkBar,
  frame,
  rect,
  slot,
  wideColumns
} from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const near = (a: number, b: number) => Math.abs(a - b) <= 1
const background = (element: Element) =>
  getComputedStyle(element).backgroundColor
const cells = (row: Element) => [...row.querySelectorAll('[role="cell"]')]

function Shows() {
  return (
    <div style={{ width: WIDE_BOX }}>
      <RecordTable
        caption='Shows'
        data={testShows(20)}
        fields={showFields}
        columns={wideColumns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `#${row.id}`}
        defaultPosition={ALL}
        rowActions={() => <Menu.Item>Edit</Menu.Item>}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
        actions={[
          { label: 'Export CSV', onAction: () => {} },
          { label: 'Print door list', onAction: () => {} }
        ]}
      />
    </div>
  )
}

const searchField = () =>
  screen
    .getByRole('combobox', { name: 'Search and filter' })
    .closest<HTMLElement>('[data-slot="query-field"]')!

describe('RecordTable selection in a browser', () => {
  it('tints every cell of a selected row the same opaque colour', async () => {
    const { container } = render(<Shows />)
    const row = slot(container, 'record-table-row')
    const [, title, city] = cells(row)
    const before = background(city!)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect.poll(() => background(city!)).not.toBe(before)
    expect(background(title!)).toBe(background(city!))
    expect(background(cells(row).at(-1)!)).toBe(background(city!))
  })

  it('selects a range from a Shift click on the padding around a box', async () => {
    render(<Shows />)
    const box = (name: string) => screen.getByRole('checkbox', { name })
    await userEvent.click(box('Select Ocean Alley 1'))
    const label = box('Select Alex Lahey 1').closest<HTMLElement>('label')!
    const padding = rect(label)
    const position = {
      x: (rect(box('Select Alex Lahey 1')).left - padding.left) / 2,
      y: padding.height / 2
    }
    expect(
      document.elementFromPoint(
        padding.left + position.x,
        padding.top + position.y
      )
    ).toBe(label)
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(label, { position })
    await userEvent.keyboard('{/Shift}')
    const checked = (name: string) => box(name).getAttribute('aria-checked')
    await expect.poll(() => checked('Select Alex Lahey 1')).toBe('true')
    expect(checked('Select Julia Jacklin 1')).toBe('true')
    expect(checked('Select angie McMahon 1')).toBe('true')
    expect(checked('Select Middle Kids 1')).toBe('false')
  })

  it('keeps the checkbox and title at the start and the actions at the end while scrolling sideways', async () => {
    const { container } = render(<Shows />)
    await frame()
    const scroller = slot(container, 'record-table-scroller')
    const row = slot(container, 'record-table-row')
    const [select, title] = cells(row)
    const actions = cells(row).at(-1)!
    const start = rect(select!).left
    const titleStart = rect(title!).left
    const end = rect(actions).right
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    await expect
      .poll(() => {
        scroller.scrollLeft = 200
        return scroller.scrollLeft
      })
      .toBeGreaterThan(0)
    await frame()
    expect(near(rect(select!).left, start)).toBe(true)
    expect(near(rect(title!).left, titleStart)).toBe(true)
    expect(near(rect(actions).right, end)).toBe(true)
    expect(near(end, rect(scroller).right)).toBe(true)
  })

  it('tints a clickable row on hover', async () => {
    const { container } = render(<Shows />)
    const row = slot(container, 'record-table-row')
    const city = cells(row)[2]!
    const resting = background(city)
    await userEvent.hover(city)
    await expect.poll(() => background(city)).not.toBe(resting)
    expect(getComputedStyle(row).cursor).toBe('pointer')
  })

  it('keeps the toolbar actions at the search field height', async () => {
    render(<Shows />)
    await frame()
    const search = rect(searchField()).height
    expect(
      rect(screen.getByRole('button', { name: 'Export CSV' })).height
    ).toBe(search)
    expect(
      rect(screen.getByRole('button', { name: 'More actions' })).height
    ).toBe(search)
  })

  it('keeps its content width in a parent sized by its content', async () => {
    const { container } = render(
      <div style={{ display: 'flex' }}>
        <div>
          <RecordTable
            caption='Shows'
            data={testShows(3)}
            fields={showFields}
            columns={wideColumns}
          />
        </div>
      </div>
    )
    await frame()
    expect(rect(slot(container, 'record-table-frame')).width).toBeGreaterThan(
      300
    )
  })
})

const narrowColumns = [
  ...wideColumns.slice(0, 1).map((column) => ({
    ...column,
    narrow: 'title' as const
  })),
  { ...wideColumns[1]!, narrow: 'description' as const },
  ...wideColumns.slice(2)
]
const tableRows = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="record-table-row"]')
]
const shownCheckboxes = () => screen.queryAllByRole('checkbox')

function NarrowShows({
  width = 360,
  rows = 8,
  onExport = () => {},
  selection
}: {
  width?: number
  rows?: number
  onExport?: (selection: unknown) => void
  selection?: string[]
}) {
  return (
    <div style={{ width }}>
      <RecordTable
        caption='Shows'
        data={testShows(rows)}
        fields={showFields}
        columns={narrowColumns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `#${row.id}`}
        rowActions={() => null}
        defaultSelection={selection && { ids: selection }}
        bulkActions={[
          {
            label: 'Export',
            onAction: ({ selection }) => onExport(selection)
          }
        ]}
      />
    </div>
  )
}

describe('RecordTable Select mode on re-flowed rows in a browser', () => {
  it('keeps one table, its checkboxes hidden and Select in the toolbar', async () => {
    const { container } = render(<NarrowShows />)
    await frame()
    expect(screen.getByRole('table', { name: 'Shows' })).toBeVisible()
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(tableRows(container)).toHaveLength(8)
    expect(shownCheckboxes()).toEqual([])
    expect(screen.getByRole('button', { name: 'Select' })).toBeVisible()
  })

  it('follows a row’s link on a tap until Select mode', async () => {
    const { container } = render(<NarrowShows />)
    await frame()
    await userEvent.click(
      within(tableRows(container)[1]!).getByText('Melbourne')
    )
    expect(location.hash).toBe('#show-1')
    expect(bulkBar()).toBeNull()
  })

  it('selects rows by tap in Select mode, with the bar in the header row, and ends after a bulk action', async () => {
    const actions: unknown[] = []
    const hash = location.hash
    const { container } = render(
      <NarrowShows onExport={(selection) => actions.push(selection)} />
    )
    await frame()
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    const first = tableRows(container)[0]!
    const checkbox = within(first).getByRole('checkbox', {
      name: 'Select Ocean Alley 1'
    })
    expect(checkbox).toBeVisible()
    // First in the row, before the title.
    expect(rect(checkbox).right).toBeLessThan(
      rect(within(first).getByText('Ocean Alley 1')).left
    )
    for (const row of tableRows(container).slice(0, 3))
      await userEvent.click(within(row).getAllByRole('cell')[2]!)
    expect(location.hash).toBe(hash)
    const bar = bulkBar()!
    expect(bar.textContent).toContain('3 selected')
    expect(slot(container, 'record-table-head').contains(bar)).toBe(true)
    expect(rect(bar).bottom).toBeLessThanOrEqual(rect(first).top + 1)
    await userEvent.click(within(bar).getByRole('button', { name: 'Export' }))
    expect(actions).toEqual([{ ids: ['show-0', 'show-1', 'show-2'] }])
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Select' }))
      .not.toBeNull()
    expect(shownCheckboxes()).toEqual([])
  })

  it('makes room for the checkbox only in Select mode', async () => {
    const { container } = render(<NarrowShows />)
    await frame()
    const title = () =>
      rect(within(tableRows(container)[0]!).getByText('Ocean Alley 1')).left
    const before = title()
    expect(before - rect(tableRows(container)[0]!).left).toBeLessThan(20)
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    await frame()
    expect(title()).toBeGreaterThan(before + 20)
  })

  it('tints the row, not the checkbox, while the row is hovered', async () => {
    const { container } = render(<NarrowShows rows={3} />)
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    const first = tableRows(container)[0]!
    const cell = within(first).getAllByRole('cell')[1]!
    const rest = background(cell)
    await userEvent.hover(cell)
    await frame()
    await frame()
    expect(background(cell)).not.toBe(rest)
    expect(background(first.querySelector('[data-slot="checkbox"]')!)).toBe(
      'rgba(0, 0, 0, 0)'
    )
    await userEvent.unhover(document.body)
  })

  it('keeps the toolbar controls at the search field height', async () => {
    render(<NarrowShows />)
    await frame()
    const height = rect(searchField()).height
    for (const name of ['Select', 'Configure table'])
      expect(rect(screen.getByRole('button', { name })).height).toBe(height)
  })

  it('shows the checkboxes, and no Select, above 40rem', async () => {
    render(<NarrowShows width={WIDE_BOX} selection={['show-0']} />)
    await frame()
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
    expect(
      screen.getByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toBeVisible()
    expect(bulkBar()!.textContent).toContain('1 selected')
  })
})

describe('RecordTable Select mode from an app control in a browser', () => {
  it('waits on a wide table and shows once the table narrows', async () => {
    const layouts = [tableLayout(narrowColumns)]
    function AppMenu() {
      const [width, setWidth] = useState(WIDE_BOX)
      const records = useRecords({
        data: testShows(8),
        fields: showFields,
        getRowId: (row) => row.id,
        selectable: true
      })
      return (
        <>
          <button type='button' onClick={() => records.setSelecting(true)}>
            Select shows
          </button>
          <button type='button' onClick={() => setWidth(360)}>
            Narrow
          </button>
          <div style={{ width }}>
            <Records.Root records={records} layouts={layouts} caption='Shows'>
              <Records.Header />
              <Records.Content />
            </Records.Root>
          </div>
        </>
      )
    }
    render(<AppMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Select shows' }))
    expect(screen.getByRole('table', { name: 'Shows' })).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Select mode' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Narrow' }))
    await expect
      .poll(() => screen.queryByRole('group', { name: 'Select mode' }))
      .not.toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeVisible()
  })
})
