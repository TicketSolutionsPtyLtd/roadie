import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { settledBox } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import { RecordTable, tableColumns } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'
import type { RecordViewDefaults } from './types'

const STILL = '*, *::before, *::after { transition: none !important }'
const TIMEOUT = { timeout: 20_000 }

let removeStylesheets = () => {}
beforeAll(() => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  cleanup()
  await page.viewport(1024, 768)
})

const column = tableColumns<TestShow>(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('status'),
  column.field('starts')
]

function Shows({ defaultView }: { defaultView?: RecordViewDefaults }) {
  return (
    <RecordTable
      caption='Shows'
      data={testShows(40)}
      fields={showFields}
      columns={columns}
      getRowId={(row) => row.id}
      defaultView={defaultView}
      timeZone='Australia/Sydney'
      now={new Date('2026-10-03T02:00:00Z')}
      tableActions={[{ label: 'Export CSV', onAction: () => {} }]}
    />
  )
}

const searchField = () =>
  screen
    .getByRole('combobox', { name: 'Search and filter' })
    .closest<HTMLElement>('[data-slot="query-field"]')!
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')].find(
    (element) => element.textContent?.includes(label)
  )!
const box = (element: Element) => element.getBoundingClientRect()

const manyFilters: RecordViewDefaults = {
  query: {
    filters: [
      { field: 'status', operator: 'is', values: ['on_sale', 'sold_out'] },
      { field: 'sold', operator: 'gt', value: 100 },
      { field: 'gross', operator: 'between', value: [100, 250000] },
      { field: 'starts', operator: 'within', value: 'this-month' },
      { field: 'city', operator: 'contains', value: 'Perth' }
    ]
  }
}

describe('Records.Search in a browser', TIMEOUT, () => {
  it('keeps the toolbar buttons on the first row as chips wrap', async () => {
    await page.viewport(700, 768)
    render(<Shows defaultView={manyFilters} />)
    const field = searchField()
    expect(box(field).height).toBeGreaterThan(40)
    const configure = screen.getByRole('button', { name: 'Configure table' })
    expect(box(configure).top).toBe(box(field).top)
    expect(box(configure).height).toBe(40)
  })

  it('opens a chip’s editor under it, and a date picker inside it', async () => {
    render(
      <Shows
        defaultView={{
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }}
      />
    )
    const starts = chip('Starts')
    await userEvent.click(
      within(starts).getByRole('button', { name: /^Starts/ })
    )
    const dialog = await screen.findByRole('dialog', { name: 'Starts' })
    const editor = await settledBox(dialog)
    expect(editor.top).toBeGreaterThan(box(starts).bottom)
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^Choose dates/ })
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /^Next week/ })
    )
    await expect.poll(() => chip('Starts')?.textContent).toContain('Next week')
    const after = screen.getByRole('dialog', { name: 'Starts' })
    expect(after).toBeVisible()
    // The edited chip remounts; the editor stays under the chip that holds it.
    const moved = await settledBox(after)
    expect(moved.top).toBeGreaterThan(box(chip('Starts')).bottom)
    expect(Math.abs(moved.left - box(chip('Starts')).left)).toBeLessThan(2)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    await userEvent.click(
      within(chip('Starts')).getByRole('button', { name: /^Starts/ })
    )
    const reopened = await settledBox(
      await screen.findByRole('dialog', { name: 'Starts' })
    )
    expect(reopened.top).toBeGreaterThan(box(chip('Starts')).bottom)
  })

  it('edits a chip in a bottom drawer on a phone', async () => {
    await page.viewport(390, 844)
    render(
      <Shows
        defaultView={{
          query: {
            filters: [{ field: 'status', operator: 'is', values: ['on_sale'] }]
          }
        }}
      />
    )
    await userEvent.click(
      within(chip('Status')).getByRole('button', { name: /^Status/ })
    )
    const drawer = await screen.findByRole('dialog', { name: 'Status' })
    const sheet = await settledBox(drawer)
    expect(Math.round(sheet.bottom)).toBe(844)
    expect(
      within(drawer).getByRole('heading', { name: 'Status' })
    ).toBeVisible()
    await userEvent.click(
      within(drawer).getByRole('checkbox', { name: 'Sold out' })
    )
    await expect
      .poll(() => chip('Status')?.textContent)
      .toContain('On sale or Sold out')
  })
})
