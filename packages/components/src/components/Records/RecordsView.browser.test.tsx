import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { type RecordView, recordFields } from '@oztix/roadie-core/records'

import { Records, useRecords } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { gridLayout } from '../RecordGrid'
import { tableColumns, tableLayout } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'

const STILL = '*, *::before, *::after { transition: none !important }'
const TIMEOUT = { timeout: 20_000 }

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeStill()
    removeRoadie()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  cleanup()
  await page.viewport(1280, 800)
})

const column = tableColumns<TestShow>(showFields)
const layouts = [
  tableLayout([
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('sold')
  ]),
  gridLayout<TestShow>({ title: 'show', details: ['city', 'sold'] })
]

function Shows({
  onView,
  label
}: {
  onView?: (view: RecordView) => void
  label?: string
}) {
  const records = useRecords({
    data: testShows(6),
    fields: showFields,
    onViewChange: onView
  })
  return (
    <Records records={records} layouts={layouts} caption='Shows'>
      <Records.Header>
        <Records.Search />
        <Records.View label={label} />
      </Records.Header>
      <Records.Content />
    </Records>
  )
}

const viewButton = () => screen.getByRole('button', { name: 'View' })
const rect = (element: Element) => element.getBoundingClientRect()

async function openView() {
  await userEvent.click(viewButton())
  const drawer = await screen.findByRole('dialog', { name: 'View' })
  // A drawer, with its own title, not a popover lined up with the button.
  expect(within(drawer).getByRole('heading', { name: 'View' })).toBeVisible()
  // The table's settings load lazily, and the drawer grows upward when they do.
  await within(drawer).findByRole('region', { name: 'Columns' }, TIMEOUT)
  return drawer
}

describe('Records.View', () => {
  it('switches the layout from the drawer', TIMEOUT, async () => {
    render(<Shows />)
    const drawer = await openView()
    await userEvent.click(
      within(within(drawer).getByRole('group', { name: 'Layout' })).getByRole(
        'button',
        { name: 'Grid' }
      )
    )
    await expect
      .poll(() => document.querySelector('[data-slot="record-grid-card"]'))
      .not.toBeNull()
    // The drawer stays open on the grid's own settings.
    expect(
      await within(drawer).findByRole(
        'region',
        { name: 'Card fields' },
        TIMEOUT
      )
    ).toBeVisible()
  })

  it('edits the sort and the columns', TIMEOUT, async () => {
    let shown: RecordView | undefined
    render(<Shows onView={(view) => (shown = view)} />)
    const drawer = await openView()
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Add sort' })
    )
    await expect.poll(() => shown?.query.sort.length).toBe(1)
    const sold = await within(drawer).findByRole(
      'button',
      { name: 'Show Sold' },
      TIMEOUT
    )
    await userEvent.click(sold)
    await expect
      .poll(() =>
        screen
          .getAllByRole('columnheader', { hidden: true })
          .map((header) => header.textContent)
      )
      .not.toContain('Sold')
  })

  it('names the button and the drawer with label', TIMEOUT, async () => {
    render(<Shows label='Display' />)
    await userEvent.click(screen.getByRole('button', { name: 'Display' }))
    expect(await screen.findByRole('dialog', { name: 'Display' })).toBeVisible()
  })

  it('renders nothing with nothing to set', () => {
    const field = recordFields<TestShow>()
    const fields = [field.text('show', { label: 'Show', sortable: false })]
    function Lone() {
      const records = useRecords({ data: testShows(3), fields })
      return (
        <Records
          records={records}
          layouts={[
            tableLayout([tableColumns<TestShow>(fields).field('show')])
          ]}
          caption='Shows'
        >
          <Records.Header>
            <Records.Search />
            <Records.View />
          </Records.Header>
          <Records.Content />
        </Records>
      )
    }
    render(<Lone />)
    expect(screen.queryByRole('button', { name: 'View' })).toBeNull()
  })

  for (const [size, width, height] of [
    ['a phone', 375, 812],
    ['a desktop', 1280, 800]
  ] as const)
    it(`opens as a bottom drawer on ${size}`, TIMEOUT, async () => {
      await page.viewport(width, height)
      render(<Shows />)
      const drawer = await openView()
      await expect
        .poll(() => window.innerHeight - rect(drawer).bottom)
        .toBeLessThanOrEqual(16)
      expect(rect(drawer).left).toBeGreaterThanOrEqual(0)
      expect(rect(drawer).right).toBeLessThanOrEqual(window.innerWidth)
      await userEvent.keyboard('{Escape}')
      await expect
        .poll(() => screen.queryByRole('dialog', { name: 'View' }))
        .toBeNull()
      expect(document.activeElement).toBe(viewButton())
    })
})
