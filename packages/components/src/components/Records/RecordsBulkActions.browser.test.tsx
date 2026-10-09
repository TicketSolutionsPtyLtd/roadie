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

import { Records, useRecords } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { RecordTable, tableLayout } from '../RecordTable'
import { frame, rect, showColumns, slot } from '../RecordTable/testUtils'
import { showFields, testShows } from './testUtils'
import type { RecordsBulkAction } from './types'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

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
      <RecordTable
        caption='Shows'
        data={testShows(8)}
        fields={showFields}
        columns={showColumns}
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
        layouts={[tableLayout(showColumns)]}
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
