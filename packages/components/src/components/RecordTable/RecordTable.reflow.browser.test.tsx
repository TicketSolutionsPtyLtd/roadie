import { cleanup, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { RecordTable, type RecordTableColumn, tableColumns } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { frame } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const TIMEOUT = { timeout: 20_000 }
const column = tableColumns<TestShow>(showFields)
const roles = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('status', { narrow: 'trailing', priority: 1 }),
  column.field('gross')
]

function Shows({
  width,
  columns = roles,
  rows = 12,
  actions = false
}: {
  width: number
  columns?: RecordTableColumn<TestShow>[]
  rows?: number
  actions?: boolean
}) {
  return (
    <div data-testid='box' style={{ width }}>
      <RecordTable
        caption='Shows'
        data={testShows(rows)}
        fields={showFields}
        columns={columns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `#${row.id}`}
        defaultPosition={{ pageSize: rows }}
        rowActions={actions ? () => null : undefined}
      />
    </div>
  )
}

const rect = (element: Element) => element.getBoundingClientRect()
const shown = (element: Element) => getComputedStyle(element).display !== 'none'
const firstRow = () =>
  screen
    .getAllByRole('row')
    .find((row) => within(row).queryAllByRole('cell').length)!
const cellOf = (row: HTMLElement, text: RegExp) =>
  within(row)
    .getAllByRole('cell')
    .find((cell) => text.test(cell.textContent ?? ''))!

describe.each([360, 960])('RecordTable at %ipx', (width) => {
  it('keeps its records in one table', TIMEOUT, async () => {
    render(<Shows width={width} />)
    await frame()
    const table = screen.getByRole('table', { name: 'Shows' })
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(12)
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('names every shown cell by its column header', TIMEOUT, async () => {
    render(<Shows width={width} />)
    await frame()
    expect(screen.getByRole('columnheader', { name: 'Show' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'City' })).toBeTruthy()
  })

  it(
    'follows the record’s link from anywhere on its row',
    TIMEOUT,
    async () => {
      render(<Shows width={width} />)
      await frame()
      const row = firstRow()
      await userEvent.click(cellOf(row, /Kazoo|Antler|Echidna|Foxglove|\w+/))
      expect(location.hash).toBe(`#${row.dataset.rowId}`)
    }
  )
})

describe('RecordTable under 40rem', () => {
  it('places each column by its narrow role', TIMEOUT, async () => {
    render(<Shows width={360} />)
    await frame()
    const row = firstRow()
    const [show, city, status, gross] = within(row).getAllByRole('cell', {
      hidden: true
    })
    expect(Math.abs(rect(show!).left - rect(city!).left)).toBeLessThan(1)
    expect(rect(show!).bottom).toBeLessThanOrEqual(rect(city!).top + 1)
    expect(rect(status!).left).toBeGreaterThanOrEqual(rect(show!).right - 1)
    expect(shown(status!)).toBe(true)
    expect(shown(gross!)).toBe(false)
  })

  it(
    'lines the title up with the table and ends with the row actions',
    TIMEOUT,
    async () => {
      render(<Shows width={360} actions />)
      await frame()
      const row = firstRow()
      const more = within(row).getByRole('button', { name: /More actions/ })
      expect(rect(cellOf(row, /\w/)).left).toBeCloseTo(rect(row).left, 0)
      expect(rect(more).right).toBeLessThanOrEqual(rect(row).right + 1)
      expect(rect(more).right).toBeGreaterThan(rect(row).right - 48)
    }
  )

  it('lays the row out on one line above 40rem', TIMEOUT, async () => {
    render(<Shows width={960} />)
    await frame()
    const cells = within(firstRow()).getAllByRole('cell')
    expect(cells.every(shown)).toBe(true)
    const tops = new Set(cells.map((cell) => Math.round(rect(cell).top)))
    expect(tops.size).toBe(1)
  })

  it(
    'hides the column headers from sight and their sort from Tab',
    TIMEOUT,
    async () => {
      render(<Shows width={360} />)
      await frame()
      const head = screen.getAllByRole('row')[0]!
      expect(rect(head).height).toBeLessThanOrEqual(1)
      expect(screen.queryByRole('button', { name: /^Show/ })).toBeNull()
    }
  )

  it('keeps the same rows as the table narrows', TIMEOUT, async () => {
    render(<Shows width={960} />)
    await frame()
    const row = firstRow()
    screen.getByTestId('box').style.width = '360px'
    await frame()
    await frame()
    expect(row.isConnected).toBe(true)
    expect(rect(row).height).toBe(64)
  })

  it('windows long tables by the narrow row’s height', TIMEOUT, async () => {
    render(<Shows width={360} rows={300} />)
    await frame()
    await frame()
    const body = document.querySelector('[data-slot="record-table-body"]')!
    await expect.poll(() => rect(body).height).toBeCloseTo(300 * 64, -1)
  })

  it('keeps a pinned title in line with its description', TIMEOUT, async () => {
    // Pinned after a wide pinned column, so its sticky start is well past where the grid puts it.
    const columns = [
      column.field('city', {
        pin: true,
        narrow: 'leading',
        width: { min: 12 }
      }),
      column.field('show', { pin: true, narrow: 'title' }),
      column.field('status', { narrow: 'description' }),
      column.field('gross', { narrow: 'trailing' })
    ]
    render(<Shows width={360} columns={columns} actions />)
    await frame()
    const row = firstRow()
    const [, show, status] = within(row).getAllByRole('cell')
    expect(rect(show!).left).toBeCloseTo(rect(status!).left, 0)
  })

  it(
    'windows by the new height when the description column goes',
    TIMEOUT,
    async () => {
      const titleOnly = [roles[0]!, roles[2]!]
      const { rerender } = render(<Shows width={360} rows={300} />)
      await frame()
      await frame()
      const body = document.querySelector('[data-slot="record-table-body"]')!
      await expect.poll(() => rect(body).height).toBeCloseTo(300 * 64, -1)
      rerender(<Shows width={360} rows={300} columns={titleOnly} />)
      await expect.poll(() => rect(body).height).toBeCloseTo(300 * 48, -1)
    }
  )
})
