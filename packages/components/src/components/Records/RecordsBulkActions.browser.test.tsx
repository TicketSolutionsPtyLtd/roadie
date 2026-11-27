import { cleanup, render, screen, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import {
  loadBrandFont,
  useStylesheet
} from '@oztix/roadie-browser-testing/stylesheet'

import { Records, useRecords } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { RecordList, listLayout } from '../RecordList'
import { frame, rect, slot } from '../RecordTable/testUtils'
import { showFields, testShows } from './testUtils'
import type { RecordsBulkAction } from './types'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

// A list's bar floats; a re-flowed table keeps its bar in the header row.
const row = { title: 'show', description: 'city' } as const

// The bar's inset from the records' edges, each side.
const INSET = 16

function Shows({
  width,
  actions
}: {
  width: number
  actions: RecordsBulkAction[]
}) {
  return (
    <div data-testid='width' style={{ width }}>
      <RecordList
        caption='Shows'
        data={testShows(8)}
        fields={showFields}
        row={row}
        getRowId={(row) => row.id}
        defaultSelection={{ ids: ['show-0'] }}
        bulkActions={actions}
      />
    </div>
  )
}

// Composed without Records.Select, so the bar keeps its own Clear beside the count.
function Composed({
  width,
  actions
}: {
  width: number
  actions: RecordsBulkAction[]
}) {
  const records = useRecords({
    data: testShows(8),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true,
    defaultSelection: { ids: ['show-0'] }
  })
  return (
    <div data-testid='width' style={{ width }}>
      <Records.Root
        records={records}
        layouts={[listLayout(row)]}
        caption='Shows'
      >
        <Records.Content />
        <Records.BulkActions actions={actions} />
      </Records.Root>
    </div>
  )
}

const bulkActions = (labels: string[]) =>
  labels.map((label) => ({ label, onAction: vi.fn() }))
const floating = () => screen.getByRole('group', { name: 'Bulk actions' })
const more = () =>
  within(floating()).queryByRole('button', { name: 'More actions' })
const settle = async () => {
  await frame()
  await frame()
}

describe('Records floating bulk actions in a browser', () => {
  it('keeps the first action out and runs the rest, in order, from More actions last', async () => {
    const actions = bulkActions([
      'Export orders',
      'Archive shows',
      'Print door list',
      'Email ticket holders'
    ])
    render(<Shows width={360} actions={actions} />)
    await settle()
    const labels = within(floating())
      .getAllByRole('button')
      .map((button) => button.textContent || button.getAttribute('aria-label'))
    expect(labels.at(-1)).toBe('More actions')
    const inline = labels.filter((label) =>
      actions.some((action) => action.label === label)
    )
    expect(inline[0]).toBe('Export orders')
    await userEvent.click(more()!)
    const items = (await screen.findAllByRole('menuitem')).map(
      (item) => item.textContent
    )
    expect(items.length).toBeGreaterThan(0)
    expect([...inline, ...items]).toEqual(actions.map(({ label }) => label))
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Email ticket holders' })
    )
    expect(actions[3]!.onAction).toHaveBeenCalledOnce()
  })

  it('counts the gaps between the count and its buttons when fitting', async () => {
    const { container } = render(
      <Composed
        width={620}
        actions={bulkActions([
          'Export orders',
          'Archive shows',
          'Print door list'
        ])}
      />
    )
    await settle()
    expect(
      within(floating()).getByRole('button', { name: 'Clear selection' })
    ).toBeVisible()
    expect(more()).toBeNull()
    const natural = rect(floating()).width
    const gap = parseFloat(getComputedStyle(floating()).columnGap)
    expect(gap).toBeGreaterThan(1)
    const sizer = container.querySelector<HTMLElement>('[data-testid="width"]')!
    const fitTo = async (records: number) => {
      sizer.style.width = `${records}px`
      await settle()
      expect(rect(slot(container, 'records')).width).toBeCloseTo(records, 1)
    }
    // Every part fits, but not once one gap is counted.
    await fitTo(natural + 2 * INSET - gap / 2)
    await expect.poll(more).not.toBeNull()
    await fitTo(Math.ceil(natural + 2 * INSET) + 1)
    await expect.poll(more).toBeNull()
  })
})

function Scrolling({
  footer = 0,
  width = 360,
  actions = ['Export orders']
}: {
  /** A pane's sticky footer height, as the pane publishes it. */
  footer?: number
  width?: number
  actions?: string[]
}) {
  const records = useRecords({
    data: testShows(40),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true,
    defaultSelection: { ids: ['show-0'] }
  })
  return (
    <div
      data-testid='scroller'
      style={{
        width,
        height: 400,
        overflow: 'auto',
        ['--pane-sticky-bottom' as string]: `${footer}px`
      }}
    >
      <Records.Root
        records={records}
        layouts={[listLayout(row)]}
        caption='Shows'
      >
        <Records.Content />
        <Records.BulkActions actions={bulkActions(actions)} />
      </Records.Root>
      <p style={{ height: 600 }}>After the shows</p>
    </div>
  )
}

describe('Records bulk actions in a scroll box', () => {
  it('rides the foot of the box while the records run past it, then rests at their end', async () => {
    render(<Scrolling />)
    await settle()
    const box = screen.getByTestId('scroller')
    const records = slot(box, 'records')
    expect(rect(records).bottom).toBeGreaterThan(rect(box).bottom)
    expect(rect(box).bottom - rect(floating()).bottom).toBeCloseTo(INSET, 0)

    box.scrollTop = rect(records).height
    await settle()
    expect(rect(records).bottom).toBeLessThan(rect(box).bottom)
    expect(rect(floating()).bottom).toBeLessThanOrEqual(rect(records).bottom)
    expect(rect(records).bottom - rect(floating()).bottom).toBeLessThan(INSET)
  })

  it("clears a pane's sticky footer", async () => {
    render(<Scrolling footer={40} />)
    await settle()
    const box = screen.getByTestId('scroller')
    expect(rect(box).bottom - rect(floating()).bottom).toBeCloseTo(
      40 + INSET,
      0
    )
  })

  it('lets a tap beside the bar reach the records under it', async () => {
    render(<Scrolling />)
    await settle()
    const box = screen.getByTestId('scroller')
    const bar = rect(floating())
    const beside = document.elementFromPoint(
      rect(box).left + 4,
      bar.top + bar.height / 2
    )
    expect(slot(box, 'records').contains(beside)).toBe(true)
    expect(beside?.closest('[data-slot="records-bulk-dock"]')).toBeNull()
  })

  it('keeps its inset beside a bar too wide for the records', async () => {
    render(<Scrolling width={220} actions={['Email every ticket holder']} />)
    await settle()
    const records = rect(slot(screen.getByTestId('scroller'), 'records'))
    const bar = rect(floating())
    expect(bar.left - records.left).toBeGreaterThanOrEqual(INSET - 0.5)
    expect(records.right - bar.right).toBeGreaterThanOrEqual(INSET - 0.5)
  })
})
