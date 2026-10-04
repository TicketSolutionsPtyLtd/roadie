import { useMemo, useState } from 'react'

import { act, cleanup, render, screen, within } from '@testing-library/react'
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

import { type RecordPosition, placeRange } from '@oztix/roadie-core/records'

import { RecordGrid, gridLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames, withFrames } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await Promise.all([
    import('./RecordGridSettings'),
    import('../RecordTable/RecordTableSettings')
  ])
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

const grid = {
  title: 'show',
  description: 'city',
  trailing: 'status',
  details: ['sold', 'gross']
} as const

const cards = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('[data-slot="record-grid-card"]')
]
const rect = (element: Element) => element.getBoundingClientRect()
const tops = (elements: HTMLElement[]) => [
  ...new Set(elements.map((element) => Math.round(rect(element).top)))
]

const framed = <T,>(read: () => T, { timeout = 8000 } = {}) =>
  expect.poll(
    async () => {
      await nudgeFrames()
      return read()
    },
    { timeout }
  )

describe('RecordGrid in a browser', { timeout: 30_000 }, () => {
  it.each([
    [390, 1],
    [700, 2],
    [1000, 3]
  ])('lays out %ipx as %i columns of equal cards', async (width, columns) => {
    const { container } = render(
      <div style={{ width }}>
        <RecordGrid
          data={testShows(7).map((show, index) =>
            index === 1 ? { ...show, city: 'Melbourne' } : show
          )}
          fields={showFields}
          card={grid}
        />
      </div>
    )
    const shown = cards(container)
    const firstRow = shown.filter(
      (card) => Math.round(rect(card).top) === Math.round(rect(shown[0]!).top)
    )
    expect(firstRow).toHaveLength(columns)
    // Stretched to the row, so a row's cards line up top and bottom.
    expect(
      new Set(firstRow.map((card) => Math.round(rect(card).height))).size
    ).toBe(1)
    for (const card of shown)
      expect(rect(card).right).toBeLessThanOrEqual(
        rect(container.firstElementChild!).right + 0.5
      )
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    )
  })

  it('ends every detail value at the card’s edge, text and figures alike', async () => {
    const { container } = render(
      <div style={{ width: 600 }}>
        <RecordGrid
          data={testShows(2)}
          fields={showFields}
          card={{
            title: 'show',
            details: ['city', 'starts', 'sold', 'status']
          }}
        />
      </div>
    )
    const card = cards(container)[0]!
    const ends = [...card.querySelectorAll('dd')].map((value) => {
      const range = document.createRange()
      range.selectNodeContents(value)
      return Math.round(range.getBoundingClientRect().right)
    })
    expect(ends).toHaveLength(4)
    expect(new Set(ends).size).toBe(1)
  })

  it('fills each card with its row, with the details from the top', async () => {
    const tall = testShows(2).map((show, index) =>
      index === 0
        ? {
            ...show,
            show: 'Uncle Meteor and the Midnight Spoon Orchestra Live at the Saltbush Trumpet Ballroom'
          }
        : show
    )
    const { container } = render(
      <div style={{ width: 600 }}>
        <RecordGrid data={tall} fields={showFields} card={grid} />
      </div>
    )
    const [long, short] = cards(container)
    const card = (item: HTMLElement) =>
      item.querySelector<HTMLElement>('[data-slot="record-card"]')!
    expect(rect(card(short!)).height).toBe(rect(card(long!)).height)
    const header = short!.querySelector<HTMLElement>(
      '[data-slot="card-header"]'
    )!
    expect(rect(header).top - rect(card(short!)).top).toBeLessThan(2)
  })

  it('windows a long list by rows, without overlap, to the last card', async () => {
    const { container } = render(
      <div style={{ width: 900 }}>
        <RecordGrid
          data={testShows(600)}
          fields={showFields}
          defaultPosition={{ pageSize: 600 }}
          maxHeight='600px'
          card={grid}
        />
      </div>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="record-grid-viewport"]'
    )!
    await framed(() => cards(container).length).toBeGreaterThan(0)
    expect(cards(container).length).toBeLessThan(200)
    const rows = tops(cards(container))
    for (let index = 1; index < rows.length; index++)
      expect(rows[index]! - rows[index - 1]!).toBeGreaterThan(100)
    await framed(() => {
      viewport.scrollTop = viewport.scrollHeight
      return container.textContent?.includes('Middle Kids 100')
    }).toBe(true)
    const last = cards(container).at(-1)!
    expect(last).toHaveAttribute('aria-posinset', '600')
    expect(rect(last).bottom).toBeLessThanOrEqual(rect(viewport).bottom + 1)
  })

  it('loads ranges by rows of cards, opens at a row, and keeps it across a resize', async () => {
    const spans: { start: number; end: number }[] = []
    const warn = vi.spyOn(console, 'warn')
    let resize = (_: number) => {}
    function Ranged() {
      const show = useMemo(() => {
        const sample = testShows(1)[0]!
        return (index: number): TestShow => ({
          ...sample,
          id: `show-${index}`,
          show: `show-${index}`
        })
      }, [])
      const [data, setData] = useState<(TestShow | undefined)[]>([])
      const [position, setPosition] = useState<RecordPosition>({ row: 91 })
      const [width, setWidth] = useState(900)
      resize = setWidth
      return (
        <div style={{ width }}>
          <RecordGrid
            caption='Shows'
            maxHeight='600px'
            data={data}
            fields={showFields}
            getRowId={(row) => row.id}
            rowCount={2000}
            position={position}
            onPositionChange={setPosition}
            loadRange={({ start, end }) => {
              spans.push({ start, end })
              setData((current) =>
                placeRange(
                  current,
                  start,
                  Array.from({ length: end - start }, (_, offset) =>
                    show(start + offset)
                  )
                )
              )
            }}
            card={grid}
          />
        </div>
      )
    }
    const { container } = render(<Ranged />)
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="record-grid-viewport"]'
    )!
    const inTopRow = (id: string) => {
      const card = cards(container).find((item) => item.dataset.rowId === id)
      return (
        card !== undefined && Math.abs(rect(card).top - rect(viewport).top) < 24
      )
    }
    // Three columns at 900px: record 91 sits in grid row 30, with 90 and 92.
    await framed(() => inTopRow('show-91')).toBe(true)
    expect(spans.some(({ start, end }) => start <= 91 && end > 91)).toBe(true)
    expect(spans.some(({ start }) => start >= 1000)).toBe(false)
    expect(cards(container).length).toBeLessThan(200)
    // Two columns at 600px: record 91 sits in grid row 45.
    await act(async () => resize(600))
    await framed(() => inTopRow('show-91')).toBe(true)
    expect(
      warn.mock.calls.some(([message]) =>
        String(message).includes('data-index')
      )
    ).toBe(false)
    warn.mockRestore()
  })

  it('keeps a windowed grid whole as its columns change', async () => {
    const warn = vi.spyOn(console, 'warn')
    let resize = (_: number) => {}
    function Long() {
      const [width, setWidth] = useState(900)
      resize = setWidth
      return (
        <div style={{ width }}>
          <RecordGrid
            data={testShows(600)}
            fields={showFields}
            defaultPosition={{ pageSize: 600 }}
            maxHeight='600px'
            card={grid}
          />
        </div>
      )
    }
    const { container } = render(<Long />)
    await framed(() => cards(container).length).toBeGreaterThan(0)
    await act(async () => resize(600))
    await framed(() => tops(cards(container).slice(0, 4)).length).toBe(2)
    const rows = tops(cards(container))
    for (let index = 1; index < rows.length; index++)
      expect(rows[index]! - rows[index - 1]!).toBeGreaterThan(100)
    expect(
      warn.mock.calls.some(([message]) =>
        String(message).includes('data-index')
      )
    ).toBe(false)
    warn.mockRestore()
  })

  it('tabs through cards in reading order, and selects with Space in Select mode', async () => {
    const user = userEvent.setup()
    render(
      <div style={{ width: 900 }}>
        <RecordGrid
          data={testShows(6)}
          fields={showFields}
          getRowHref={(row) => `/shows/${row.id}`}
          bulkActions={[{ label: 'Archive', onAction: () => {} }]}
          card={grid}
        />
      </div>
    )
    screen.getByRole('link', { name: 'Ocean Alley 1' }).focus()
    await user.tab()
    expect(
      screen.getByRole('link', { name: 'Ball Park Music 1' })
    ).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Julia Jacklin 1' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Select' }))
    // Past Select all and Configure, to the first card's checkbox.
    for (let step = 0; step < 4; step++) {
      if (document.activeElement?.getAttribute('role') === 'checkbox') break
      await user.tab()
    }
    const first = screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    expect(first).toHaveFocus()
    await user.keyboard(' ')
    expect(first).toBeChecked()
    expect(
      screen.getByRole('group', { name: 'Bulk actions' }).textContent
    ).toMatch(/^1\sselected/)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox')).toBeNull()
    // The checkbox holding focus goes; focus lands on Select.
    expect(screen.getByRole('button', { name: 'Select' })).toHaveFocus()
  })

  it('switches from the table to the grid and back from Configure', async () => {
    const user = userEvent.setup()
    const column = tableColumns<TestShow>(showFields)
    function Switching() {
      const records = useRecords({ data: testShows(6), fields: showFields })
      const [layouts] = useState(() => [
        tableLayout([
          column.field('show', { pin: true }),
          column.field('city'),
          column.field('sold')
        ]),
        gridLayout<TestShow>(grid)
      ])
      return (
        <div style={{ width: 900 }}>
          <Records records={records} layouts={layouts} caption='Shows'>
            <Records.Toolbar />
            <Records.Content />
          </Records>
        </div>
      )
    }
    const { container } = render(<Switching />)
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
    const layout = within(panel).getByRole('group', { name: 'Layout' })
    const gridButton = within(layout).getByRole('button', { name: 'Grid' })
    await user.click(gridButton)
    expect(cards(container)).toHaveLength(6)
    expect(gridButton).toHaveFocus()
    expect(
      await within(panel).findByRole('region', { name: 'Card fields' })
    ).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    const tableButton = within(layout).getByRole('button', { name: 'Table' })
    expect(tableButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('table', { name: 'Shows' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await withFrames(() =>
      expect
        .poll(() => document.activeElement?.getAttribute('aria-label'))
        .toBe('Configure table')
    )
  })
})
