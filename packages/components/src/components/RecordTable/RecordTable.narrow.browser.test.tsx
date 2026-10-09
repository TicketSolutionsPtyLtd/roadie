import {
  type CSSProperties,
  type ReactNode,
  useMemo,
  useRef,
  useState
} from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent as browserUserEvent } from 'vitest/browser'

import { type RecordPosition, placeRange } from '@oztix/roadie-core/records'

import {
  RecordTable,
  type RecordTableProps,
  tableColumns,
  tableLayout
} from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Menu } from '../Menu'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import { useNarrow } from '../Records/narrow'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import type { RecordTableNarrowLayout } from './narrow'
import { frame } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const narrowColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold', { narrow: 'trailing' }),
  column.field('gross')
]
const titleOnly = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('gross', { narrow: 'trailing' })
]
const base = {
  caption: 'Shows',
  fields: showFields,
  columns: narrowColumns,
  getRowId: (row: TestShow) => row.id
}

const listRows = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"]'
  )
]
const box = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-testid="box"]')!
const resize = async (container: HTMLElement, width: number) => {
  box(container).style.width = `${width}px`
  await frame()
  await frame()
}

function Boxed({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div data-testid='box' style={{ width, height: 600, overflowY: 'auto' }}>
      {children}
    </div>
  )
}

describe('RecordTable narrow list rows in a browser', () => {
  it('gives every list row the fixed height', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(20)
    for (const row of listRows(container))
      expect(row.getBoundingClientRect().height).toBe(64)
  })

  it('lines row text up with the toolbar, outside Select mode', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(20)
    const left = container
      .querySelector<HTMLElement>('[data-slot="records"]')!
      .getBoundingClientRect().left
    const title = listRows(container)[0]!.querySelector<HTMLElement>(
      '[data-slot="list-item-title"]'
    )!
    // Within a pixel: the link's own box rounds differently per engine.
    expect(
      Math.abs(title.getBoundingClientRect().left - left)
    ).toBeLessThanOrEqual(1)
  })

  it('gives rows without a description the compact height', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(5)} columns={titleOnly} />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(5)
    for (const row of listRows(container))
      expect(row.getBoundingClientRect().height).toBe(48)
  })

  it('shows no pointer on a row without a link', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(3)} />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(3)
    const surface = listRows(container)[0]!.firstElementChild!
    expect(getComputedStyle(surface).cursor).not.toBe('pointer')
  })

  it('keeps a linked row untinted while its More button is hovered', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(3)}
          getRowHref={(row) => `/shows/${row.id}`}
          rowActions={() => null}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(3)
    const surface = listRows(container)[0]!.firstElementChild!
    const rest = getComputedStyle(surface).backgroundColor
    await browserUserEvent.hover(
      screen.getByRole('button', { name: 'More actions for Ocean Alley 1' })
    )
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(getComputedStyle(surface).backgroundColor).toBe(rest)
  })

  it('runs the loading bar along the top of the list', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(5)} loading />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(5)
    const bar = container
      .querySelector('[data-slot="record-table-progress"] > *')!
      .getBoundingClientRect()
    const list = screen
      .getByRole('list', { name: 'Shows' })
      .getBoundingClientRect()
    expect(bar.height).toBeGreaterThan(0)
    expect(bar.height).toBeLessThanOrEqual(4)
    expect(Math.abs(bar.top - list.top)).toBeLessThanOrEqual(1)
  })

  it('switches to the table and back as the box resizes', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable {...base} data={testShows(20)} />
      </Boxed>
    )
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
    await resize(container, 800)
    await expect
      .poll(() => screen.queryByRole('table', { name: 'Shows' }))
      .not.toBeNull()
    expect(screen.queryByRole('list', { name: 'Shows' })).toBeNull()
    await resize(container, 360)
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('keeps a selected record selected across the switch', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={800}>
        <RecordTable {...base} data={testShows(20)} selectable />
      </Boxed>
    )
    await user.click(
      await screen.findByRole('checkbox', { name: 'Select Ball Park Music 1' })
    )
    await resize(container, 360)
    await expect
      .poll(() =>
        listRows(container)
          .filter((row) => row.hasAttribute('data-selected'))
          .map((row) => row.dataset.rowId)
      )
      .toEqual(['show-1'])
    await resize(container, 800)
    expect(
      await screen.findByRole('checkbox', { name: 'Select Ball Park Music 1' })
    ).toBeChecked()
  })

  it('enters Select mode without an outline flashing round the rows', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(6)}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(6)
    await user.click(screen.getByRole('button', { name: 'Select' }))
    await frame()
    for (const row of listRows(container)) {
      const style = getComputedStyle(row.firstElementChild!)
      expect(parseFloat(style.outlineWidth) || 0).toBe(0)
    }
  })

  it('keeps a narrow table in its own scroll box from scrolling sideways', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(30)}
          getRowHref={(row) => `/shows/${row.id}`}
          maxHeight='400px'
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBeGreaterThan(0)
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="record-table-viewport"]'
    )!
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
  })

  it('keeps rows whole inside their own scroll box', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(10)}
          selectable
          defaultSelection={{ ids: ['show-0'] }}
          maxHeight='400px'
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(10)
    const viewport = container
      .querySelector<HTMLElement>('[data-slot="record-table-viewport"]')!
      .getBoundingClientRect()
    const surface = listRows(container)[0]!.firstElementChild!
    const box = surface.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(viewport.left)
    expect(box.right).toBeLessThanOrEqual(viewport.right)
    expect(getComputedStyle(surface).borderTopLeftRadius).not.toBe('0px')
  })

  it('still switches after its own scroll box comes and goes', async () => {
    function Toggled() {
      const [boxed, setBoxed] = useState(true)
      return (
        <Boxed width={800}>
          <button type='button' onClick={() => setBoxed((was) => !was)}>
            Toggle box
          </button>
          <RecordTable
            {...base}
            data={testShows(10)}
            maxHeight={boxed ? '400px' : undefined}
          />
        </Boxed>
      )
    }
    const { container } = render(<Toggled />)
    await screen.findByRole('table', { name: 'Shows' })
    screen.getByRole('button', { name: 'Toggle box' }).click()
    await frame()
    await resize(container, 360)
    await expect
      .poll(() => screen.queryByRole('list', { name: 'Shows' }))
      .not.toBeNull()
  })

  it("keeps focus on a record's checkbox as Select mode goes wide", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(6)}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </Boxed>
    )
    await user.click(await screen.findByRole('button', { name: 'Select' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Julia Jacklin 1' })
    )
    screen.getByRole('checkbox', { name: 'Select Julia Jacklin 1' }).focus()
    await resize(container, 800)
    const table = await screen.findByRole('table', { name: 'Shows' })
    await expect
      .poll(() => document.activeElement)
      .toBe(
        within(table).getByRole('checkbox', { name: 'Select Julia Jacklin 1' })
      )
  })

  it('joins selected neighbours into one block', async () => {
    const { container } = render(
      <Boxed width={360}>
        <RecordTable
          {...base}
          data={testShows(10)}
          selectable
          defaultSelection={{ ids: ['show-1', 'show-2', 'show-4'] }}
        />
      </Boxed>
    )
    await expect.poll(() => listRows(container).length).toBe(10)
    const surface = (id: string) =>
      getComputedStyle(
        container.querySelector<HTMLElement>(
          `[data-slot="record-table-list-row"][data-row-id="${id}"] > div`
        )!
      )
    const bottomCorners = (id: string) => [
      surface(id).borderBottomLeftRadius,
      surface(id).borderBottomRightRadius
    ]
    expect(['show-0', 'show-1', 'show-2', 'show-4'].map(bottomCorners)).toEqual(
      [
        ['12px', '12px'],
        ['0px', '0px'],
        ['12px', '12px'],
        ['12px', '12px']
      ]
    )
    expect(surface('show-2').borderTopLeftRadius).toBe('0px')
    expect(surface('show-2').borderBottomLeftRadius).not.toBe('0px')
    expect(surface('show-2').borderBottomLeftRadius).toBe(
      surface('show-5').borderTopLeftRadius
    )
    expect(surface('show-4').borderTopLeftRadius).not.toBe('0px')
    expect(surface('show-1').borderTopLeftRadius).not.toBe('0px')
    const divider = (id: string) =>
      getComputedStyle(
        container.querySelector(
          `[data-row-id="${id}"] [data-slot="list-item-content"]`
        )!,
        '::after'
      ).backgroundColor !== 'rgba(0, 0, 0, 0)'
    expect(
      ['show-0', 'show-1', 'show-2', 'show-3', 'show-4', 'show-5'].map(divider)
    ).toEqual([false, false, false, false, false, true])
  })

  it('moves focus to the same record after a switch', async () => {
    const { container } = render(
      <Boxed width={800}>
        <RecordTable
          {...base}
          data={testShows(20)}
          getRowHref={(row) => `/shows/${row.id}`}
        />
      </Boxed>
    )
    const table = await screen.findByRole('table', { name: 'Shows' })
    within(table).getByRole('link', { name: 'Julia Jacklin 1' }).focus()
    await resize(container, 360)
    const list = await screen.findByRole('list', { name: 'Shows' })
    await expect
      .poll(() => document.activeElement)
      .toBe(within(list).getByRole('link', { name: 'Julia Jacklin 1' }))
  })

  it('lands a restored range row under the toolbar', async () => {
    const sample = testShows(1)[0]!
    function Ranged() {
      const [position, setPosition] = useState<RecordPosition>({ row: 480 })
      const [data, setData] = useState<(TestShow | undefined)[]>([])
      return (
        <Boxed width={360}>
          <RecordTable
            {...base}
            data={data}
            rowCount={5000}
            position={position}
            onPositionChange={setPosition}
            loadRange={({ start, end }) => {
              const rows = Array.from(
                { length: Math.min(end, 5000) - start },
                (_, offset) => ({
                  ...sample,
                  id: `show-${start + offset}`,
                  show: `show-${start + offset}`
                })
              )
              setData((current) => placeRange(current, start, rows))
            }}
          />
        </Boxed>
      )
    }
    const { container } = render(<Ranged />)
    const toolbar = container.querySelector<HTMLElement>(
      '[data-slot="records-toolbar"]'
    )!
    await expect
      .poll(() => {
        const row = listRows(container).find(
          (element) => element.dataset.rowId === 'show-480'
        )
        if (!row) return null
        return Math.abs(
          row.getBoundingClientRect().top -
            toolbar.getBoundingClientRect().bottom
        )
      })
      .toBeLessThanOrEqual(1)
  })
})

function Probe({ style }: { style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(ref)
  return (
    <div ref={ref} data-testid='probe' style={style}>
      {narrow ? 'narrow' : 'wide'}
    </div>
  )
}

const probe = () => screen.getByTestId('probe')

describe('useNarrow in a browser', () => {
  afterEach(() => {
    document.documentElement.style.fontSize = ''
  })

  it('is narrow after the first commit, then follows the element', async () => {
    render(<Probe style={{ width: 600 }} />)
    expect(probe()).toHaveTextContent('narrow')
    probe().style.width = '700px'
    await expect.poll(() => probe().textContent).toBe('wide')
    probe().style.width = '600px'
    await expect.poll(() => probe().textContent).toBe('narrow')
  })

  it.each([
    ['16px', 640, 'wide'],
    ['16px', 639, 'narrow'],
    ['20px', 800, 'wide'],
    ['20px', 799, 'narrow']
  ])('with a %s root font, %ipx is %s', (size, px, expected) => {
    document.documentElement.style.fontSize = size
    render(<Probe style={{ width: px }} />)
    expect(probe()).toHaveTextContent(expected)
  })

  it('keeps its layout while the element has no width', async () => {
    render(<Probe style={{ width: 600, display: 'none' }} />)
    expect(probe()).toHaveTextContent('wide')
    probe().style.display = 'block'
    await expect.poll(() => probe().textContent).toBe('narrow')
    probe().style.display = 'none'
    await frame()
    await frame()
    expect(probe()).toHaveTextContent('narrow')
  })
})

const statusColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold', { narrow: 'trailing' }),
  column.field('status')
]
const detailColumns = [
  ...statusColumns,
  column.field('gross', { narrow: 'detail' })
]
const cardColumns = [
  ...statusColumns.slice(0, 3),
  column.field('gross', { narrow: 'detail' }),
  column.field('status', { narrow: 'detail' })
]
const six = { ...base, data: testShows(6), columns: statusColumns }
const selectSix = {
  ...six,
  bulkActions: [{ label: 'Export', onAction: () => {} }]
}

const listOf = () => screen.getByRole('list', { name: 'Shows' })
const itemsOf = () => within(listOf()).getAllByRole('listitem')
const inBox = (ui: ReactNode, width = 360) =>
  render(<Boxed width={width}>{ui}</Boxed>)
const enterSelect = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Select' }))
const statusText = () =>
  document.querySelector('[data-slot="records-status"]')!.textContent
const scroller = () =>
  document.querySelector('[data-slot="record-table-scroller"]')

function Composed({
  columns,
  narrow,
  select = false
}: {
  columns: typeof statusColumns
  narrow?: RecordTableNarrowLayout
  select?: boolean
}) {
  const records = useRecords({ ...six, selectable: select })
  return (
    <Records.Root
      records={records}
      layouts={[tableLayout(columns, { narrow })]}
      caption='Shows'
    >
      {select && <Records.Select />}
      <Records.Content />
    </Records.Root>
  )
}

function Selected({ bulkActions = false }: { bulkActions?: boolean }) {
  const records = useRecords({
    ...six,
    selectable: true,
    defaultSelection: { ids: ['show-0'] }
  })
  return (
    <Records.Root
      records={records}
      layouts={[tableLayout(statusColumns)]}
      caption='Shows'
    >
      <Records.Content />
      {bulkActions && (
        <Records.BulkActions
          actions={[{ label: 'Export', onAction: () => {} }]}
        />
      )}
    </Records.Root>
  )
}

describe('RecordTable narrow list rows by role in a browser', () => {
  it('renders a list named by the caption, not a table', () => {
    inBox(<RecordTable {...six} />)
    // Explicit, since WebKit drops the role from a list with no markers.
    expect(listOf()).toHaveAttribute('role', 'list')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = itemsOf()
    expect(items).toHaveLength(6)
    expect(items[0]!.textContent).toContain('Ocean Alley 1')
    expect(items[0]!.textContent).toContain('Brisbane')
    expect(within(items[1]!).getByText('37')).toBeInTheDocument()
  })

  it('links the row by its title', () => {
    inBox(<RecordTable {...six} getRowHref={(row) => `/shows/${row.id}`} />)
    expect(
      within(listOf()).getByRole('link', { name: 'Ball Park Music 1' })
    ).toHaveAttribute('href', '/shows/show-1')
  })

  it('opens row actions from a list row', async () => {
    const user = userEvent.setup()
    inBox(
      <RecordTable {...six} rowActions={() => <Menu.Item>Edit</Menu.Item>} />
    )
    await user.click(
      within(listOf()).getByRole('button', {
        name: 'More actions for Ocean Alley 1'
      })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Edit' })
    ).toBeInTheDocument()
  })

  it('renders list rows when forced, even with a detail column', () => {
    inBox(<Composed columns={detailColumns} narrow='list' />)
    expect(listOf().querySelector('[data-slot="card"]')).toBeNull()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('marks the list busy under a progress bar while loading', () => {
    const { container } = inBox(<RecordTable {...six} loading />)
    expect(
      container.querySelector('[data-slot="record-table-progress"]')
    ).not.toBeNull()
    expect(listOf()).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a trailing status column as its badge', () => {
    inBox(
      <RecordTable
        {...six}
        columns={[
          statusColumns[0]!,
          column.field('status', { narrow: 'trailing' })
        ]}
      />
    )
    const [first, , third] = itemsOf()
    expect(first!.querySelector('[data-slot=badge]')).toHaveClass(
      'intent-success'
    )
    expect(third!.querySelector('[data-slot=badge]')).toHaveClass(
      'intent-neutral'
    )
  })

  it('shows the empty state in place of the rows', () => {
    inBox(<RecordTable {...six} data={[]} />)
    expect(screen.queryByRole('list', { name: 'Shows' })).toBeNull()
    expect(document.querySelector('[data-slot="records-empty"]')).not.toBeNull()
  })

  it.each([
    ['cards', cardColumns],
    ['list rows', statusColumns]
  ])('keeps only the title strong in %s', (_, columns) => {
    inBox(<RecordTable {...six} columns={columns} />)
    const [first] = itemsOf()
    const weight = (text: string) =>
      Number(getComputedStyle(within(first!).getByText(text)).fontWeight)
    expect(weight('Ocean Alley 1')).toBeGreaterThanOrEqual(600)
    expect(weight('Brisbane')).toBeLessThan(600)
  })
})

describe('RecordTable Select mode in a browser', () => {
  it('offers Select only when narrow and selectable', () => {
    const { unmount } = inBox(<RecordTable {...selectSix} />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    unmount()
    inBox(<RecordTable {...six} />)
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
  })

  it('shows checkboxes, Select all and Done once entered', async () => {
    const user = userEvent.setup()
    inBox(<RecordTable {...selectSix} />)
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    await enterSelect(user)
    expect(within(listOf()).getAllByRole('checkbox')).toHaveLength(6)
    const bar = screen.getByRole('group', { name: 'Select mode' })
    expect(
      within(bar).getByRole('button', { name: 'Select all' })
    ).toBeInTheDocument()
    expect(
      within(bar).getByRole('button', { name: 'Done' })
    ).toBeInTheDocument()
  })

  it('floats the bulk actions, with each Select mode control once', async () => {
    const user = userEvent.setup()
    inBox(
      // A short page, so it renders quickly and still offers every match.
      <RecordTable
        {...selectSix}
        data={testShows(20)}
        defaultPosition={{ pageSize: 10 }}
      />
    )
    await enterSelect(user)
    await user.click(screen.getByRole('button', { name: 'Select all' }))
    const floating = screen.getByRole('group', { name: 'Bulk actions' })
    expect(floating).toHaveAttribute('data-slot', 'records-bulk-actions')
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull()
    expect(
      screen.getAllByRole('button', { name: 'Deselect all' })
    ).toHaveLength(1)
    expect(
      within(floating).getByRole('button', { name: /^Select all 20/ })
    ).toBeInTheDocument()
  })

  it('makes the checkbox the row target instead of the link', async () => {
    const user = userEvent.setup()
    inBox(
      <RecordTable {...selectSix} getRowHref={(row) => `/shows/${row.id}`} />
    )
    expect(within(listOf()).getAllByRole('link')).toHaveLength(6)
    await enterSelect(user)
    expect(within(listOf()).queryAllByRole('link')).toHaveLength(0)
    const box = within(listOf()).getByRole('checkbox', {
      name: 'Select Ocean Alley 1'
    })
    expect(box).toHaveAttribute('data-interactive-target')
    await user.click(box)
    expect(box).toHaveAttribute('aria-checked', 'true')
    expect(box.closest('[data-slot="record-table-list-row"]')).toHaveAttribute(
      'data-selected'
    )
  })

  it('selects cards by their checkbox too', async () => {
    const user = userEvent.setup()
    inBox(
      <RecordTable
        {...selectSix}
        columns={cardColumns}
        getRowHref={(row) => `/shows/${row.id}`}
      />
    )
    await enterSelect(user)
    expect(within(listOf()).queryAllByRole('link')).toHaveLength(0)
    const box = within(listOf()).getByRole('checkbox', {
      name: 'Select Ocean Alley 1'
    })
    expect(box).toHaveAttribute('data-interactive-target')
    await user.click(box)
    expect(box.closest('[data-slot="record-table-card"]')).toHaveAttribute(
      'data-selected'
    )
  })

  it('keeps row actions working in Select mode', async () => {
    const user = userEvent.setup()
    inBox(
      <RecordTable
        {...selectSix}
        rowActions={() => <Menu.Item>Edit</Menu.Item>}
      />
    )
    await enterSelect(user)
    await user.click(
      within(listOf()).getByRole('button', {
        name: 'More actions for Ocean Alley 1'
      })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Edit' })
    ).toBeInTheDocument()
  })

  it.each([
    [
      'Done',
      (user: ReturnType<typeof userEvent.setup>) =>
        user.click(screen.getByRole('button', { name: 'Done' }))
    ],
    [
      'Escape',
      (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')
    ]
  ])('leaves and clears the selection with %s', async (_, leave) => {
    const user = userEvent.setup()
    inBox(<RecordTable {...selectSix} />)
    await enterSelect(user)
    await user.click(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    expect(statusText()).toContain('1 selected')
    await leave(user)
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(statusText()).not.toContain('selected')
    expect(screen.getByRole('button', { name: 'Select' })).toHaveFocus()
  })

  it('offers Select outside the toolbar when composed', async () => {
    const user = userEvent.setup()
    inBox(<Composed columns={statusColumns} select />)
    await enterSelect(user)
    expect(within(listOf()).getAllByRole('checkbox')).toHaveLength(6)
  })

  it('enters Select mode when a selection crosses to narrow', async () => {
    const user = userEvent.setup()
    const { container } = inBox(<RecordTable {...selectSix} />, 800)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await resize(container, 360)
    await expect
      .poll(() => screen.queryByRole('button', { name: 'Done' }))
      .not.toBeNull()
    expect(within(listOf()).getAllByRole('checkbox')).toHaveLength(6)
    expect(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('group', { name: 'Bulk actions' })).toHaveAttribute(
      'data-slot',
      'records-bulk-actions'
    )
  })

  it('keeps a running bulk action busy, and settles it, across a switch to narrow', async () => {
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    const user = userEvent.setup()
    const { container } = inBox(
      <RecordTable {...six} bulkActions={[{ label: 'Export', onAction }]} />,
      800
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(
      within(screen.getByRole('toolbar', { name: 'Bulk actions' })).getByRole(
        'button',
        { name: 'Export' }
      )
    )
    await resize(container, 360)
    const floating = await screen.findByRole('group', { name: 'Bulk actions' })
    expect(
      within(floating).getByRole('button', { name: 'Export' })
    ).toHaveAttribute('aria-busy', 'true')
    await user.click(
      within(listOf()).getByRole('checkbox', {
        name: 'Select Ball Park Music 1'
      })
    )
    finish()
    await expect
      .poll(() =>
        within(listOf())
          .getByRole('checkbox', { name: 'Select Ocean Alley 1' })
          .getAttribute('aria-checked')
      )
      .toBe('false')
    expect(onAction).toHaveBeenCalledOnce()
    expect(
      within(listOf()).getByRole('checkbox', {
        name: 'Select Ball Park Music 1'
      })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it("moves focus from a row's link to its checkbox when a selection narrows", async () => {
    const user = userEvent.setup()
    const { container } = inBox(
      <RecordTable {...selectSix} getRowHref={(row) => `/shows/${row.id}`} />,
      800
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' })
    )
    screen.getByRole('link', { name: 'Ocean Alley 1' }).focus()
    await resize(container, 360)
    await expect
      .poll(() => document.activeElement)
      .toBe(
        within(listOf()).getByRole('checkbox', {
          name: 'Select Ocean Alley 1'
        })
      )
  })

  it('keeps the selection when Select mode goes wide', async () => {
    const user = userEvent.setup()
    const { container } = inBox(<RecordTable {...selectSix} />)
    await enterSelect(user)
    await user.click(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await resize(container, 800)
    await screen.findByRole('table', { name: 'Shows' })
    expect(statusText()).toContain('1 selected')
    screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' }).focus()
    await user.keyboard('{Escape}')
    expect(statusText()).toContain('1 selected')
  })

  it('starts narrow in Select mode with a default selection', () => {
    inBox(<Selected />)
    expect(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps focus in the records after a bulk action with no Select part', async () => {
    const user = userEvent.setup()
    inBox(<Selected bulkActions />)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(document.activeElement).toBe(scroller())
  })

  it('keeps focus in the records when Escape leaves Select mode from a checkbox', async () => {
    const user = userEvent.setup()
    inBox(<Selected />)
    within(listOf())
      .getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      .focus()
    await user.keyboard('{Escape}')
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(document.activeElement).toBe(scroller())
  })

  it('settles with one narrow and one wide Content under one Root', () => {
    function Twice() {
      const records = useRecords({
        ...six,
        selectable: true,
        defaultSelection: { ids: ['show-0'] }
      })
      return (
        <Records.Root
          records={records}
          layouts={[tableLayout(statusColumns)]}
          caption='Shows'
        >
          <div style={{ width: 360 }}>
            <Records.Content />
          </div>
          <div style={{ width: 900 }}>
            <Records.Content />
          </div>
        </Records.Root>
      )
    }
    render(<Twice />)
    expect(screen.getByRole('list', { name: 'Shows' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
  })
})

function NarrowRanged({
  layout,
  spans,
  ...props
}: {
  layout: RecordTableNarrowLayout
  spans: number[]
} & Partial<RecordTableProps<TestShow>>) {
  const all = useMemo(() => testShows(100), [])
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  const failed = useRef(false)
  return (
    <Boxed width={360}>
      <RecordTable
        {...six}
        columns={detailColumns}
        data={data}
        narrow={layout}
        recordName={{ one: 'show', other: 'shows' }}
        defaultPosition={{ pageSize: 10 }}
        loadRange={({ start, end }) => {
          spans.push(start)
          if (start === 10 && !failed.current) {
            failed.current = true
            return Promise.reject(new Error('Offline'))
          }
          setData((current) =>
            placeRange(current, start, all.slice(start, end))
          )
        }}
        {...props}
      />
    </Boxed>
  )
}

const rangeError = () =>
  listOf().querySelector<HTMLElement>('[data-slot="record-table-range-error"]')
const scrollToFailure = () =>
  expect
    .poll(() => {
      const scroller = box(document.body)
      scroller.scrollTop = scroller.scrollHeight
      return rangeError()
    })
    .not.toBeNull()

describe('RecordTable narrow range failure in a browser', () => {
  it('keeps a banner in the failed range’s card, as its placeholder has', async () => {
    const fields = [
      ...showFields,
      { key: 'image', label: 'Image', type: 'text' as const }
    ]
    const imageColumn = tableColumns<TestShow & { image?: string }>(fields)
    render(
      <NarrowRanged
        layout='cards'
        spans={[]}
        fields={fields}
        columns={[
          imageColumn.field('image', { kind: 'image' }),
          ...detailColumns
        ]}
      />
    )
    await scrollToFailure()
    expect(
      rangeError()!.querySelector(
        '[data-slot="record-table-placeholder-media"]'
      )
    ).not.toBeNull()
  })

  it.each(['list', 'cards'] as const)(
    'keeps the loaded %s and lists the error in place of the failed range',
    async (layout) => {
      const user = userEvent.setup()
      const spans: number[] = []
      render(<NarrowRanged layout={layout} spans={spans} />)
      await scrollToFailure()
      expect(document.querySelector('[data-slot="records-error"]')).toBeNull()
      const error = rangeError()!
      expect(error.tagName).toBe('LI')
      expect(error).toHaveAttribute('aria-posinset', '11')
      expect(error).toHaveAttribute('aria-setsize')
      expect(error.textContent).toContain("Couldn't load more shows")
      expect(within(listOf()).getByText('Ocean Alley 1')).toBeInTheDocument()
      await user.click(within(error).getByRole('button', { name: 'Retry' }))
      expect(document.activeElement).toBe(scroller())
      await expect.poll(rangeError).toBeNull()
      expect(spans.filter((start) => start === 10)).toHaveLength(2)
    }
  )
})
