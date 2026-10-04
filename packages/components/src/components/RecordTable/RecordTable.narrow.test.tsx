import { useMemo, useRef, useState } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { placeRange } from '@oztix/roadie-core/records'

import {
  RecordTable,
  type RecordTableProps,
  tableColumns,
  tableLayout
} from '.'
import { Menu } from '../Menu'
import { Records, useRecords } from '../Records'
import { useNarrow } from '../Records/narrow'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import type { RecordTableNarrowLayout } from './narrow'

type Callback = (entries: { contentRect: { width: number } }[]) => void

let callbacks: Callback[] = []
let width = 0
let fontSize = '16px'
const original = globalThis.ResizeObserver

function Probe() {
  const ref = useRef<HTMLDivElement>(null)
  const narrow = useNarrow(ref)
  return (
    <div ref={ref} data-testid='probe'>
      {narrow ? 'narrow' : 'wide'}
    </div>
  )
}

const report = (next: number) =>
  act(() => {
    width = next
    callbacks.forEach((callback) =>
      callback([{ contentRect: { width: next } }])
    )
  })

beforeEach(() => {
  callbacks = []
  width = 600
  fontSize = '16px'
  globalThis.ResizeObserver = class {
    constructor(callback: Callback) {
      callbacks.push(callback)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width,
        height: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 0,
        x: 0,
        y: 0
      }) as DOMRect
  )
  const computed = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = computed(element, pseudo)
    if (element === document.documentElement)
      Object.defineProperty(style, 'fontSize', { value: fontSize })
    return style
  })
})

afterEach(() => {
  globalThis.ResizeObserver = original
  vi.restoreAllMocks()
})

describe('useNarrow', () => {
  it('is narrow after the first commit, then follows the observer', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('narrow')
    report(700)
    expect(screen.getByTestId('probe')).toHaveTextContent('wide')
    report(600)
    expect(screen.getByTestId('probe')).toHaveTextContent('narrow')
  })

  it.each([
    ['16px', 640, 'wide'],
    ['16px', 639, 'narrow'],
    ['20px', 800, 'wide'],
    ['20px', 799, 'narrow']
  ])('with a %s root font, %ipx is %s', (size, px, expected) => {
    fontSize = size
    width = px
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent(expected)
  })

  it('keeps its layout while the element has no width', () => {
    width = 0
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('wide')
    report(600)
    expect(screen.getByTestId('probe')).toHaveTextContent('narrow')
    report(0)
    expect(screen.getByTestId('probe')).toHaveTextContent('narrow')
  })

  it('renders wide on the server', () => {
    expect(renderToString(<Probe />)).toContain('wide')
  })
})

const column = tableColumns<TestShow>(showFields)
const listColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold', { narrow: 'trailing' }),
  column.field('status')
]
const detailColumns = [
  ...listColumns,
  column.field('gross', { narrow: 'detail' })
]
const cardColumns = [
  ...listColumns.slice(0, 3),
  column.field('gross', { narrow: 'detail' }),
  column.field('status', { narrow: 'detail' })
]
const SHOWS = testShows(6)
const base = {
  caption: 'Shows',
  data: SHOWS,
  fields: showFields,
  columns: listColumns,
  getRowId: (row: TestShow) => row.id
}

function Composed({
  columns,
  narrow,
  hidden,
  select = false
}: {
  columns: typeof listColumns
  narrow?: RecordTableNarrowLayout
  hidden?: string[]
  select?: boolean
}) {
  const records = useRecords({
    ...base,
    selectable: select,
    defaultView: hidden && { layout: { type: 'table', columns: { hidden } } }
  })
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

const listOf = () => screen.getByRole('list', { name: 'Shows' })
const itemsOf = () => within(listOf()).getAllByRole('listitem')

describe('RecordTable narrow list rows', () => {
  beforeEach(() => {
    width = 360
  })

  it('renders a list named by the caption, not a table', () => {
    render(<RecordTable {...base} />)
    // Explicit, since WebKit drops the role from a list with no markers.
    expect(listOf()).toHaveAttribute('role', 'list')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = itemsOf()
    expect(items).toHaveLength(6)
    expect(items[0]).toHaveTextContent('Ocean Alley 1')
    expect(items[0]).toHaveTextContent('Brisbane')
    expect(within(items[1]!).getByText('37')).toBeInTheDocument()
  })

  it('links the row by its title', () => {
    render(<RecordTable {...base} getRowHref={(row) => `/shows/${row.id}`} />)
    expect(
      within(listOf()).getByRole('link', { name: 'Ball Park Music 1' })
    ).toHaveAttribute('href', '/shows/show-1')
  })

  it('opens row actions from a list row', async () => {
    const user = userEvent.setup()
    render(
      <RecordTable {...base} rowActions={() => <Menu.Item>Edit</Menu.Item>} />
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
    render(<Composed columns={detailColumns} narrow='list' />)
    expect(listOf().querySelector('[data-slot="card"]')).toBeNull()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('dims the rows under a progress bar while loading', () => {
    const { container } = render(<RecordTable {...base} loading />)
    expect(
      container.querySelector('[data-slot="record-table-progress"]')
    ).not.toBeNull()
    expect(listOf()).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a trailing status column as its badge', () => {
    render(
      <RecordTable
        {...base}
        columns={[
          listColumns[0]!,
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

  it('renders the table at 800px', () => {
    width = 800
    render(<RecordTable {...base} />)
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Shows' })).toBeNull()
  })

  it('shows the empty state in place of the rows', () => {
    render(<RecordTable {...base} data={[]} />)
    expect(screen.queryByRole('list', { name: 'Shows' })).toBeNull()
    expect(document.querySelector('[data-slot="records-empty"]')).not.toBeNull()
  })
})

const detailTerms = (item: HTMLElement) =>
  [...item.querySelectorAll('dt')].map((term) => term.textContent)

describe('RecordTable narrow cards', () => {
  beforeEach(() => {
    width = 360
  })

  it('renders each record as a card with its detail columns in order', () => {
    render(<RecordTable {...base} columns={cardColumns} />)
    expect(listOf()).toHaveAttribute('role', 'list')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = itemsOf()
    expect(items).toHaveLength(6)
    for (const item of items) {
      expect(item.querySelector('[data-slot="record-card"]')).not.toBeNull()
      expect(detailTerms(item)).toEqual(['Gross', 'Status'])
    }
    expect(items[0]).toHaveTextContent('Ocean Alley 1')
    expect(items[0]).toHaveTextContent('Brisbane')
    expect(items[0]!.querySelector('dd [data-slot=badge]')).not.toBeNull()
  })

  it('drops a hidden detail column from the cards', () => {
    render(<Composed columns={cardColumns} hidden={['gross']} />)
    expect(detailTerms(itemsOf()[0]!)).toEqual(['Status'])
  })

  it('renders cards when forced, without detail columns', () => {
    render(<Composed columns={listColumns} narrow='cards' />)
    const [first] = itemsOf()
    expect(first!.querySelector('[data-slot="record-card"]')).not.toBeNull()
    expect(first!.querySelector('dl')).toBeNull()
  })

  it('links the card by its title and keeps row actions above it', async () => {
    const user = userEvent.setup()
    render(
      <RecordTable
        {...base}
        columns={cardColumns}
        getRowHref={(row) => `/shows/${row.id}`}
        rowActions={() => <Menu.Item>Edit</Menu.Item>}
      />
    )
    const link = within(listOf()).getByRole('link', {
      name: 'Ball Park Music 1'
    })
    expect(link).toHaveAttribute('href', '/shows/show-1')
    expect(link).toHaveAttribute('data-interactive-target')
    await user.click(
      within(listOf()).getByRole('button', {
        name: 'More actions for Ocean Alley 1'
      })
    )
    expect(
      await screen.findByRole('menuitem', { name: 'Edit' })
    ).toBeInTheDocument()
  })

  it('renders no headings in the cards', () => {
    render(<RecordTable {...base} columns={cardColumns} />)
    expect(within(listOf()).queryAllByRole('heading')).toHaveLength(0)
    expect(listOf().querySelector('[data-slot="card-title"]')?.tagName).toBe(
      'P'
    )
  })

  it.each([
    ['cards', cardColumns],
    ['list rows', listColumns]
  ])('keeps only the title strong in %s', (_, columns) => {
    render(<RecordTable {...base} columns={columns} />)
    const [first] = itemsOf()
    const strong = (text: string) =>
      within(first!).getByText(text).closest('.font-semibold, .text-strong')
    expect(strong('Ocean Alley 1')).not.toBeNull()
    expect(strong('Brisbane')).toBeNull()
  })

  it('shows card placeholders while a cards table loads', () => {
    const { container } = render(
      <RecordTable {...base} data={[]} columns={cardColumns} loading />
    )
    const skeleton = container.querySelector(
      '[data-slot="record-table-skeleton"]'
    )!
    expect(skeleton.querySelector('[data-card]')).not.toBeNull()
  })

  it('takes narrow on the preset', () => {
    render(<RecordTable {...base} narrow='cards' />)
    expect(listOf().querySelector('[data-slot="record-card"]')).not.toBeNull()
  })
})

const selectBase = {
  ...base,
  bulkActions: [{ label: 'Export', onAction: () => {} }]
}
const enterSelect = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Select' }))
const statusText = () =>
  document.querySelector('[data-slot="records-status"]')!.textContent

describe('RecordTable Select mode', () => {
  beforeEach(() => {
    width = 360
  })

  it('offers Select only when narrow and selectable', () => {
    const { unmount } = render(<RecordTable {...selectBase} />)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
    unmount()
    render(<RecordTable {...base} />)
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
  })

  it('leaves Select out of a wide toolbar', () => {
    width = 800
    render(<RecordTable {...selectBase} />)
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull()
  })

  it('shows checkboxes, Select all and Done once entered', async () => {
    const user = userEvent.setup()
    render(<RecordTable {...selectBase} />)
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
    render(<RecordTable {...selectBase} data={testShows(60)} />)
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
      within(floating).getByRole('button', { name: /^Select all 60/ })
    ).toBeInTheDocument()
  })

  it('makes the checkbox the row target instead of the link', async () => {
    const user = userEvent.setup()
    render(
      <RecordTable {...selectBase} getRowHref={(row) => `/shows/${row.id}`} />
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
    render(
      <RecordTable
        {...selectBase}
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
    render(
      <RecordTable
        {...selectBase}
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
    render(<RecordTable {...selectBase} />)
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

  it('leaves Select mode once a bulk action finishes', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <RecordTable
        {...selectBase}
        bulkActions={[{ label: 'Export', onAction }]}
      />
    )
    await enterSelect(user)
    await user.click(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledOnce()
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument()
  })

  it('offers Select outside the toolbar when composed', async () => {
    const user = userEvent.setup()
    render(<Composed columns={listColumns} select />)
    await enterSelect(user)
    expect(within(listOf()).getAllByRole('checkbox')).toHaveLength(6)
  })

  it('enters Select mode when a selection crosses to narrow', async () => {
    width = 800
    const user = userEvent.setup()
    render(<RecordTable {...selectBase} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    report(360)
    expect(within(listOf()).getAllByRole('checkbox')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('group', { name: 'Bulk actions' })).toHaveAttribute(
      'data-slot',
      'records-bulk-actions'
    )
  })

  it('keeps a running bulk action busy, and settles it, across a switch to narrow', async () => {
    width = 800
    let finish = () => {}
    const onAction = vi.fn(() => new Promise<void>((done) => (finish = done)))
    const user = userEvent.setup()
    render(
      <RecordTable
        {...selectBase}
        bulkActions={[{ label: 'Export', onAction }]}
      />
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    // Every box measures the same here, so the wide bar fits Export in More.
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Export' }))
    report(360)
    const floating = screen.getByRole('group', { name: 'Bulk actions' })
    expect(
      within(floating).getByRole('button', { name: 'Export' })
    ).toHaveAttribute('aria-busy', 'true')
    await user.click(
      within(listOf()).getByRole('checkbox', {
        name: 'Select Ball Park Music 1'
      })
    )
    await act(async () => finish())
    expect(onAction).toHaveBeenCalledOnce()
    expect(
      within(listOf()).getByRole('checkbox', {
        name: 'Select Ball Park Music 1'
      })
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'false')
  })

  it("moves focus from a row's link to its checkbox when a selection narrows", async () => {
    width = 800
    const user = userEvent.setup()
    render(
      <RecordTable {...selectBase} getRowHref={(row) => `/shows/${row.id}`} />
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Alex Lahey 1' })
    )
    screen.getByRole('link', { name: 'Ocean Alley 1' }).focus()
    report(360)
    expect(document.activeElement).toBe(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
  })

  it('keeps focus on the record when Select mode goes wide from its checkbox', async () => {
    const user = userEvent.setup()
    render(<RecordTable {...selectBase} />)
    await enterSelect(user)
    within(listOf())
      .getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      .focus()
    report(800)
    expect(document.activeElement).toBe(
      within(screen.getByRole('table', { name: 'Shows' })).getByRole(
        'checkbox',
        { name: 'Select Ocean Alley 1' }
      )
    )
  })

  it('keeps the selection when Select mode goes wide', async () => {
    const user = userEvent.setup()
    render(<RecordTable {...selectBase} />)
    await enterSelect(user)
    await user.click(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    report(800)
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
    expect(statusText()).toContain('1 selected')
    screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' }).focus()
    await user.keyboard('{Escape}')
    expect(statusText()).toContain('1 selected')
  })

  it('starts narrow in Select mode with a default selection', () => {
    function Defaulted() {
      const records = useRecords({
        ...base,
        selectable: true,
        defaultSelection: { ids: ['show-0'] }
      })
      return (
        <Records.Root
          records={records}
          layouts={[tableLayout(listColumns)]}
          caption='Shows'
        >
          <Records.Content />
        </Records.Root>
      )
    }
    render(<Defaulted />)
    expect(
      within(listOf()).getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps focus in the records after a bulk action with no Select part', async () => {
    const user = userEvent.setup()
    function NoSelect() {
      const records = useRecords({
        ...base,
        selectable: true,
        defaultSelection: { ids: ['show-0'] }
      })
      return (
        <Records.Root
          records={records}
          layouts={[tableLayout(listColumns)]}
          caption='Shows'
        >
          <Records.Content />
          <Records.BulkActions
            actions={[{ label: 'Export', onAction: () => {} }]}
          />
        </Records.Root>
      )
    }
    render(<NoSelect />)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(document.activeElement).toBe(
      document.querySelector('[data-slot="record-table-scroller"]')
    )
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
    <RecordTable
      {...base}
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
        setData((current) => placeRange(current, start, all.slice(start, end)))
      }}
      {...props}
    />
  )
}

describe('RecordTable narrow range failure with banners', () => {
  beforeEach(() => {
    width = 360
  })

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
    await act(async () => {})
    const error = listOf().querySelector<HTMLElement>(
      '[data-slot="record-table-range-error"]'
    )!
    expect(
      error.querySelector('[data-slot="record-table-placeholder-media"]')
    ).not.toBeNull()
  })
})

describe('RecordTable narrow range failure', () => {
  beforeEach(() => {
    width = 360
  })

  it.each(['list', 'cards'] as const)(
    'keeps the loaded %s and lists the error in place of the failed range',
    async (layout) => {
      const user = userEvent.setup()
      const spans: number[] = []
      render(<NarrowRanged layout={layout} spans={spans} />)
      await act(async () => {})
      expect(document.querySelector('[data-slot="records-error"]')).toBeNull()
      const error = listOf().querySelector<HTMLElement>(
        '[data-slot="record-table-range-error"]'
      )!
      expect(error.tagName).toBe('LI')
      expect(error).toHaveTextContent("Couldn't load more shows")
      expect(within(listOf()).getByText('Ocean Alley 1')).toBeInTheDocument()
      await user.click(within(error).getByRole('button', { name: 'Retry' }))
      await act(async () => {})
      expect(document.activeElement).toBe(
        document.querySelector('[data-slot="record-table-scroller"]')
      )
      expect(spans.filter((start) => start === 10)).toHaveLength(2)
      expect(
        listOf().querySelector('[data-slot="record-table-range-error"]')
      ).toBeNull()
    }
  )
})

describe('RecordTable narrow focus and composition', () => {
  beforeEach(() => {
    width = 360
  })

  function Composed({ contents = 1 }: { contents?: number }) {
    const records = useRecords({
      ...base,
      selectable: true,
      defaultSelection: { ids: ['show-0'] }
    })
    return (
      <Records.Root
        records={records}
        layouts={[tableLayout(listColumns)]}
        caption='Shows'
      >
        {Array.from({ length: contents }, (_, index) => (
          <Records.Content key={index} />
        ))}
      </Records.Root>
    )
  }

  it('keeps focus in the records when Escape leaves Select mode from a checkbox', async () => {
    const user = userEvent.setup()
    render(<Composed />)
    within(listOf())
      .getByRole('checkbox', { name: 'Select Ocean Alley 1' })
      .focus()
    await user.keyboard('{Escape}')
    expect(within(listOf()).queryAllByRole('checkbox')).toHaveLength(0)
    expect(document.activeElement).toBe(
      document.querySelector('[data-slot="record-table-scroller"]')
    )
  })

  it('settles with one narrow and one wide Content under one Root', () => {
    // The second Content measures wide.
    const sizes = [360, 900]
    let call = 0
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const frames = [
          ...document.querySelectorAll('[data-slot="record-table-frame"]')
        ]
        const index = frames.indexOf(this)
        const w = index === -1 ? sizes[call++ % 2]! : sizes[index]!
        return {
          width: w,
          height: 0,
          top: 0,
          left: 0,
          right: w,
          bottom: 0
        } as DOMRect
      }
    )
    render(<Composed contents={2} />)
    expect(screen.getByRole('list', { name: 'Shows' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
  })
})
