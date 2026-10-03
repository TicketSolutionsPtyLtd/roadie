import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Records, useRecords } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { type TestShow, showFields, testShows } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const layouts = [tableLayout([column.field('show')])]

function Paged() {
  const records = useRecords({ data: testShows(240), fields: showFields })
  return (
    <Records.Provider records={records} layouts={layouts}>
      <Records.Pagination pageSizes={[10, 50, 100]} />
    </Records.Provider>
  )
}

const rowsPerPage = () =>
  screen.getByRole('combobox', { name: 'Rows per page' })
const width = () => rowsPerPage().getBoundingClientRect().width

describe('Records.Pagination rows per page', () => {
  it('keeps its width as the page size changes', async () => {
    render(<Paged />)
    const before = width()
    await userEvent.click(rowsPerPage())
    await userEvent.click(
      await screen.findByRole('option', { name: '10 per page' })
    )
    await expect
      .poll(
        () =>
          rowsPerPage().querySelector('[data-slot="select-value"]')?.textContent
      )
      .toBe('10 per page')
    expect(width()).toBe(before)
  })

  it('keeps the chevron beside the value', async () => {
    render(<Paged />)
    const value = rowsPerPage().querySelector('[data-slot="select-value"]')!
    const icon = rowsPerPage().querySelector('[data-slot="select-icon"]')!
    await expect.poll(() => value.textContent).toBe('50 per page')
    expect(
      icon.getBoundingClientRect().left - value.getBoundingClientRect().right
    ).toBeCloseTo(6, 0)
  })

  it('opens a list at least as wide as the trigger', async () => {
    render(<Paged />)
    await userEvent.click(rowsPerPage())
    const listbox = await screen.findByRole('listbox')
    await expect
      .poll(() => listbox.getBoundingClientRect().width)
      .toBeGreaterThanOrEqual(width())
  })
})
