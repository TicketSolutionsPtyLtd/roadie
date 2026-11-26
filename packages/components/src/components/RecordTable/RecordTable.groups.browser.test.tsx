import { useMemo } from 'react'

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

import type { RecordField } from '@oztix/roadie-core/records'

import { tableColumns, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { pickOption } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import {
  type TestShow,
  groupedShowFields,
  showFields,
  testShows
} from '../Records/testUtils'
import type { UseRecordsOptions } from '../Records/useRecords'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await import('./RecordTableSettings')
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

function ShowTable({
  width = 900,
  columnMin,
  inPane = false,
  ...options
}: UseRecordsOptions<TestShow> & {
  width?: number
  columnMin?: number
  inPane?: boolean
}) {
  const records = useRecords(options)
  const fields = options.fields as readonly RecordField[]
  const layouts = useMemo(() => {
    const column = tableColumns<TestShow>(fields)
    const width = columnMin === undefined ? undefined : { min: columnMin }
    return [
      tableLayout([
        column.field('show', { width }),
        column.field('city', { width }),
        column.field('sold', { width })
      ])
    ]
  }, [fields, columnMin])
  const content = (
    <Records records={records} layouts={layouts} caption='Shows'>
      <Records.Header />
      <Records.Content />
    </Records>
  )
  return (
    <div style={{ width }}>{inPane ? <Pane>{content}</Pane> : content}</div>
  )
}

const byStatus = { layout: { type: 'table', groupBy: ['status'] } } as const
const threeLevels = {
  layout: { type: 'table', groupBy: ['status', 'city', 'show'] }
} as const

// Each heading row, then the first cell of every record row after it.
const groupsShown = () => {
  const shown: [string, string[]][] = []
  const rows = document.querySelectorAll(
    '[data-slot="record-table-scroller"] [role="row"]'
  )
  for (const row of rows) {
    const heading = row.querySelector('h2, h3, h4')
    if (heading) shown.push([heading.textContent!, []])
    else
      shown
        .at(-1)![1]
        .push(row.querySelector('[role="cell"]:not(:has(input))')!.textContent!)
  }
  return shown
}

const toggle = (name: string) => screen.getByRole('button', { name })

describe('tableLayout grouped in a browser', { timeout: 30_000 }, () => {
  it('heads each group with a row spanning the table, its title and count, in option order, with no-value records last', () => {
    const shows = testShows(6)
    shows[2]!.status = 'sold_out'
    shows[5]!.status = null as unknown as string
    render(
      <ShowTable data={shows} fields={showFields} defaultView={byStatus} />
    )
    expect(groupsShown()).toEqual([
      ['On sale 2', ['Ocean Alley 1', 'angie McMahon 1']],
      ['Sold out 3', ['Ball Park Music 1', 'Julia Jacklin 1', 'Alex Lahey 1']],
      ['No status 1', ['Middle Kids 1']]
    ])
    const table = screen.getByRole('table', { name: 'Shows' })
    const cell = within(table)
      .getByRole('heading', { name: 'On sale 2' })
      .closest('[role="cell"]')!
    expect(cell).toHaveAttribute('aria-colspan', '3')
    // Group rowgroups sit beside the header's, as a table's rowgroups must.
    expect(cell.closest('[role="rowgroup"]')!.parentElement!.role).not.toBe(
      'rowgroup'
    )
    const row = document.querySelector('[data-slot="record-table-row"]')!
    expect(cell.getBoundingClientRect().width).toBeCloseTo(
      row.getBoundingClientRect().width,
      0
    )
  })

  it('nests groups by each level, as headings h2 to h4 in tiers, with heading content', () => {
    const fields = groupedShowFields.map((one) =>
      one.key === 'city'
        ? {
            ...one,
            groupHeading: ({ value }: { value: string | null }) => (
              <span>{`${value} venues`}</span>
            )
          }
        : one
    )
    render(
      <ShowTable
        data={testShows(6)}
        fields={fields}
        defaultView={threeLevels}
      />
    )
    expect(
      screen
        .getAllByRole('heading')
        .slice(0, 5)
        .map((heading) => [heading.tagName, heading.textContent])
    ).toEqual([
      ['H2', 'On sale 2'],
      ['H3', 'Brisbane 1'],
      ['H4', 'Ocean Alley 1 1'],
      ['H3', 'Perth 1'],
      ['H4', 'angie McMahon 1 1']
    ])
    expect(groupsShown().slice(0, 3)).toEqual([
      ['On sale 2', []],
      ['Brisbane 1', []],
      ['Ocean Alley 1 1', ['Ocean Alley 1']]
    ])
    const size = (level: number) =>
      parseFloat(
        getComputedStyle(screen.getAllByRole('heading', { level })[0]!).fontSize
      )
    expect(size(2)).toBeGreaterThan(size(3))
    expect(size(3)).toBeGreaterThan(size(4))
    expect(screen.getAllByText('Brisbane venues')).toHaveLength(2)
  })

  it("lines a title's text and its heading content up with the first column's text", () => {
    const fields = showFields.map((one) =>
      one.key === 'status'
        ? { ...one, groupHeading: () => <span>Doors at 7</span> }
        : one
    )
    // Where an element's first text starts, past any padding.
    const textLeft = (element: Element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()
      while (node && !node.textContent!.trim()) node = walker.nextNode()
      const range = document.createRange()
      range.selectNodeContents(node!)
      return range.getBoundingClientRect().left
    }
    // In a pane, the frame insets its first and last cells.
    for (const [selectable, inPane] of [
      [false, false],
      [true, false],
      [false, true],
      [true, true]
    ]) {
      const { unmount } = render(
        <ShowTable
          data={testShows(6)}
          fields={fields}
          selectable={selectable}
          inPane={inPane}
          defaultView={byStatus}
        />
      )
      const cell = screen.getByText('Ocean Alley 1').closest('[role="cell"]')!
      const title = screen.getByRole('heading', { name: 'On sale 2' })
      expect(textLeft(title)).toBeCloseTo(textLeft(cell), 0)
      expect(textLeft(screen.getAllByText('Doors at 7')[0]!)).toBeCloseTo(
        textLeft(cell),
        0
      )
      unmount()
    }
  })

  it('sets an outer group further from the rows before it than an inner one', () => {
    render(
      <ShowTable
        data={testShows(6)}
        fields={groupedShowFields}
        defaultView={{ layout: { type: 'table', groupBy: ['status', 'city'] } }}
      />
    )
    // From the bottom of the row before a title to the title's top.
    const gapAbove = (name: string) => {
      const title = screen.getAllByRole('button', { name })[0]!
      const rows = [
        ...document.querySelectorAll('[data-slot="record-table-row"]')
      ].filter(
        (row) =>
          row.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING
      )
      return (
        title.getBoundingClientRect().top -
        rows.at(-1)!.getBoundingClientRect().bottom
      )
    }
    expect(gapAbove('Sold out 2')).toBeGreaterThan(gapAbove('Perth 1'))
  })

  it("names a leaf group's rows from its title, and only while they show", async () => {
    const user = userEvent.setup()
    render(
      <ShowTable
        data={testShows(6)}
        fields={groupedShowFields}
        defaultView={{ layout: { type: 'table', groupBy: ['status', 'city'] } }}
      />
    )
    // An outer group's rows are its inner groups', each its own rowgroup.
    expect(toggle('On sale 2')).not.toHaveAttribute('aria-controls')
    const inner = screen.getAllByRole('button', { name: 'Brisbane 1' })[0]!
    const rows = document.getElementById(inner.getAttribute('aria-controls')!)!
    expect(rows).toHaveAttribute('role', 'rowgroup')
    expect(within(rows).getAllByRole('row')).toHaveLength(1)
    expect(within(rows).getByText('Ocean Alley 1')).toBeVisible()
    await user.click(inner)
    expect(inner).not.toHaveAttribute('aria-controls')
  })

  it('hides heading content with its group', async () => {
    const user = userEvent.setup()
    const fields = showFields.map((one) =>
      one.key === 'status'
        ? { ...one, groupHeading: () => <span>Doors at 7</span> }
        : one
    )
    render(
      <ShowTable data={testShows(6)} fields={fields} defaultView={byStatus} />
    )
    const shown = () => screen.queryAllByText('Doors at 7').length
    const before = shown()
    await user.click(toggle('On sale 2'))
    expect(shown()).toBe(before - 1)
  })

  it('counts no rows when grouped, as title rows are not records', () => {
    render(
      <ShowTable
        data={testShows(6)}
        fields={showFields}
        defaultView={byStatus}
        defaultPosition={{ pageSize: 4 }}
      />
    )
    const table = screen.getByRole('table', { name: 'Shows' })
    expect(table).not.toHaveAttribute('aria-rowcount')
    expect(table.querySelector('[aria-rowindex]')).toBeNull()
  })

  it('keeps a title in view as the columns scroll sideways', async () => {
    render(
      <ShowTable
        data={testShows(6)}
        fields={showFields}
        columnMin={30}
        defaultView={byStatus}
      />
    )
    const scroller = document.querySelector<HTMLElement>(
      '[data-slot="record-table-scroller"]'
    )!
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    const title = toggle('On sale 2')
    const before = title.getBoundingClientRect()
    scroller.scrollLeft = 200
    await expect.poll(() => scroller.scrollLeft).toBe(200)
    await expect
      .poll(() => title.getBoundingClientRect().left)
      .toBeCloseTo(before.left, 0)
    expect(title.getBoundingClientRect().width).toBeCloseTo(before.width, 0)
    expect(title.getBoundingClientRect().right).toBeLessThanOrEqual(
      scroller.getBoundingClientRect().right + 0.5
    )
  })

  it('collapses a group from its title, keeping it out of the view, as its records change', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    const table = (count: number) => (
      <ShowTable
        data={testShows(count)}
        fields={groupedShowFields}
        defaultView={{ layout: { type: 'table', groupBy: ['status', 'city'] } }}
        onViewChange={onViewChange}
      />
    )
    const { rerender } = render(table(6))
    const calls = onViewChange.mock.calls.length
    expect(toggle('On sale 2')).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle('On sale 2'))
    expect(toggle('On sale 2')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Ocean Alley 1')).toBeNull()
    // Its inner groups go with it; Cancelled's Brisbane stays.
    expect(screen.getAllByRole('heading', { name: 'Brisbane 1' })).toHaveLength(
      1
    )
    expect(screen.getByText('Ball Park Music 1')).toBeVisible()
    // An inner group collapses on its own.
    await user.click(toggle('Melbourne 1'))
    expect(screen.queryByText('Ball Park Music 1')).toBeNull()
    expect(screen.getByText('Julia Jacklin 1')).toBeVisible()
    rerender(table(9))
    expect(toggle('On sale 3')).toHaveAttribute('aria-expanded', 'false')
    expect(toggle('Sold out 3')).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle('On sale 3'))
    expect(screen.getByText('Ocean Alley 1')).toBeVisible()
    expect(onViewChange.mock.calls.length).toBe(calls)
  })

  it('selects a Shift range in the order the groups show it, leaving out a collapsed group', async () => {
    const user = userEvent.setup()
    render(
      <ShowTable
        data={testShows(6)}
        fields={showFields}
        selectable
        defaultView={byStatus}
      />
    )
    const box = (name: string) => screen.getByRole('checkbox', { name })
    const checked = (name: string) =>
      box(`Select ${name}`).getAttribute('aria-checked')
    await user.click(box('Select Ocean Alley 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Ball Park Music 1'))
    await user.keyboard('{/Shift}')
    await expect.poll(() => checked('Ball Park Music 1')).toBe('true')
    expect(checked('angie McMahon 1')).toBe('true')
    expect(checked('Julia Jacklin 1')).toBe('false')

    await user.click(toggle('Sold out 2'))
    await user.click(box('Select angie McMahon 1'))
    await user.click(box('Select angie McMahon 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Middle Kids 1'))
    await user.keyboard('{/Shift}')
    await expect.poll(() => checked('Middle Kids 1')).toBe('true')
    expect(checked('Julia Jacklin 1')).toBe('true')
    await user.click(toggle('Sold out 2'))
    expect(checked('Alex Lahey 1')).toBe('false')
  })

  for (const selectable of [false, true])
    it(`re-flows grouped rows under their titles at 375px${selectable ? ', selectable' : ''}`, async () => {
      const { container } = render(
        <ShowTable
          width={375}
          data={testShows(6)}
          fields={showFields}
          defaultView={byStatus}
          selectable={selectable}
        />
      )
      // A frame for the window and container queries to settle.
      await new Promise(requestAnimationFrame)
      expect(screen.queryByRole('listitem')).toBeNull()
      const heading = screen.getByRole('heading', {
        level: 2,
        name: 'On sale 2'
      })
      expect(screen.getByRole('table', { name: 'Shows' })).toContainElement(
        heading
      )
      const rows = heading.closest('[role="rowgroup"]')!
        .nextElementSibling as HTMLElement
      expect(within(rows).getAllByRole('row')).toHaveLength(2)
      // The title's text starts where the rows' text does, past no checkbox.
      const button = within(heading).getByRole('button')
      const textStart =
        button.getBoundingClientRect().left +
        parseFloat(getComputedStyle(button).paddingInlineStart)
      const title = within(within(rows).getAllByRole('row')[0]!)
        .getAllByRole('cell')
        .find((cell) => cell.dataset.narrow === 'title')!
      expect(
        Math.abs(textStart - title.getBoundingClientRect().left)
      ).toBeLessThanOrEqual(1)
      const frame = container.querySelector<HTMLElement>(
        '[data-slot="record-table-frame"]'
      )!
      expect(frame.hasAttribute('data-narrow')).toBe(false)
      const scroller = container.querySelector<HTMLElement>(
        '[data-slot="record-table-scroller"]'
      )!
      expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)
    })

  it('groups from Configure, keeping the columns, and ungroups from None', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <ShowTable
        data={testShows(4)}
        fields={groupedShowFields}
        defaultView={{
          layout: { type: 'table', columns: { hidden: ['sold'] } }
        }}
        onViewChange={onViewChange}
      />
    )
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
    await pickOption(user, {
      from: { panel, name: 'Group by' },
      option: 'Status'
    })
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { hidden: ['sold'] },
      groupBy: ['status']
    })
    await pickOption(user, { from: { panel, name: 'Then by' }, option: 'City' })
    expect(onViewChange.mock.lastCall![0].layout.groupBy).toEqual([
      'status',
      'city'
    ])
    await expect
      .poll(() => screen.queryAllByRole('heading', { level: 3 }).length)
      .toBeGreaterThan(0)
    await pickOption(user, {
      from: { panel, name: 'Group by' },
      option: 'None'
    })
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'table',
      columns: { hidden: ['sold'] }
    })
  })

  it('stays ungrouped when it loads by range, and offers no Group by', async () => {
    const user = userEvent.setup()
    render(
      <ShowTable
        fields={showFields}
        defaultView={byStatus}
        loadRange={async ({ start, end }) => ({
          rows: testShows(end).slice(start),
          rowCount: 6
        })}
      />
    )
    await expect
      .poll(
        () => document.querySelectorAll('[data-slot="record-table-row"]').length
      )
      .toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
    await within(panel).findAllByRole('button', { name: /^Show / })
    expect(
      within(panel).queryByRole('combobox', { name: 'Group by' })
    ).toBeNull()
  })
})
