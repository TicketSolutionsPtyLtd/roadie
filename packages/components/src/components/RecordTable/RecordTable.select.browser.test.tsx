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
import { ALL, WIDE_BOX, frame, rect, slot, wideColumns } from './testUtils'

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
const listRows = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"]'
  )
]
const hitAt = (element: HTMLElement) => {
  const { left, top, width, height } = element.getBoundingClientRect()
  return document.elementFromPoint(left + width / 2, top + height / 2)
}

describe('RecordTable Select mode on narrow rows in a browser', () => {
  it('selects rows by click and ends after a bulk action', async () => {
    const actions: unknown[] = []
    const hash = location.hash
    const { container } = render(
      <div style={{ width: 360 }}>
        <RecordTable
          caption='Shows'
          data={testShows(8)}
          fields={showFields}
          columns={narrowColumns}
          getRowId={(row) => row.id}
          getRowHref={(row) => `#${row.id}`}
          rowActions={() => null}
          bulkActions={[
            {
              label: 'Export',
              onAction: ({ selection }) => void actions.push(selection)
            }
          ]}
        />
      </div>
    )
    await expect.poll(() => listRows(container).length).toBe(8)
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    const first = listRows(container)[0]!
    expect(hitAt(within(first).getByText('Brisbane'))).toBe(
      within(first).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    for (const row of listRows(container).slice(0, 3))
      await userEvent.click(row)
    const bar = screen.getByRole('group', { name: 'Bulk actions' })
    expect(bar.textContent).toContain('3 selected')
    expect(location.hash).toBe(hash)
    await userEvent.click(within(bar).getByRole('button', { name: 'Export' }))
    expect(actions).toEqual([{ ids: ['show-0', 'show-1', 'show-2'] }])
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Select' }))
      .not.toBeNull()
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(0)
  })

  it('tints the row, not the checkbox, while the row is hovered', async () => {
    const { container } = render(
      <div style={{ width: 360 }}>
        <RecordTable
          caption='Shows'
          data={testShows(3)}
          fields={showFields}
          columns={narrowColumns}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </div>
    )
    await userEvent.click(screen.getByRole('button', { name: 'Select' }))
    const first = listRows(container)[0]!
    const surface = first.firstElementChild!
    const rest = background(surface)
    await userEvent.hover(first)
    await frame()
    await frame()
    expect(background(surface)).not.toBe(rest)
    expect(background(first.querySelector('[data-slot="checkbox"]')!)).toBe(
      'rgba(0, 0, 0, 0)'
    )
    await userEvent.unhover(document.body)
  })

  it('keeps the toolbar controls at the search field height', async () => {
    render(
      <div style={{ width: 360 }}>
        <RecordTable
          caption='Shows'
          data={testShows(8)}
          fields={showFields}
          columns={narrowColumns}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
          actions={[
            { label: 'Export CSV', onAction: () => {} },
            { label: 'Print door list', onAction: () => {} }
          ]}
        />
      </div>
    )
    await frame()
    const search = screen.getByRole('combobox', { name: 'Search and filter' })
    const field =
      search.closest<HTMLElement>('[data-slot="query-field"]') ?? search
    const height = field.getBoundingClientRect().height
    for (const name of ['Select', 'Configure table', 'More actions'])
      expect(
        screen.getByRole('button', { name }).getBoundingClientRect().height
      ).toBe(height)
  })

  it('fits the floating bar to the records, with the rest in More actions', async () => {
    const { container } = render(
      <div style={{ width: 360 }}>
        <RecordTable
          caption='Shows'
          data={testShows(8)}
          fields={showFields}
          columns={narrowColumns}
          getRowId={(row) => row.id}
          defaultSelection={{ ids: ['show-0'] }}
          bulkActions={[
            'Export orders',
            'Archive shows',
            'Print door list',
            'Email ticket holders'
          ].map((label) => ({ label, onAction: () => {} }))}
        />
      </div>
    )
    const bar = await screen.findByRole('group', { name: 'Bulk actions' })
    await frame()
    await frame()
    const records = rect(slot(container, 'records'))
    expect(rect(bar).width).toBeLessThanOrEqual(records.width)
    expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
    const buttons = within(bar).getAllByRole('button')
    expect(buttons.at(-1)).toHaveAccessibleName('More actions')
    expect(
      within(bar).getByRole('button', { name: 'Export orders' })
    ).toBeVisible()
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
    const { container } = render(<AppMenu />)
    await userEvent.click(screen.getByRole('button', { name: 'Select shows' }))
    expect(screen.getByRole('table', { name: 'Shows' })).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Select mode' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Narrow' }))
    await expect.poll(() => listRows(container).length).toBe(8)
    expect(screen.getByRole('group', { name: 'Select mode' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible()
  })
})
