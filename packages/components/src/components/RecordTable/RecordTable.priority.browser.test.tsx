import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RecordTable, tableColumns, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { PRIORITY_HIDES_BELOW } from './layout'
import { frame } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const column = tableColumns<TestShow>(showFields)
const columns = [
  column.field('show', { pin: true, width: { min: 12, grow: 2 } }),
  column.field('city', { priority: 1, width: { min: 8 } }),
  column.field('sold', { priority: 2, width: { min: 6 } }),
  column.field('gross', { priority: 3, width: { min: 7 } })
]

const box = () => document.querySelector<HTMLElement>('[data-testid="box"]')!
const resize = async (width: number) => {
  box().style.width = `${width}px`
  await frame()
  await frame()
}

const shownCells = (row: Element) =>
  [...row.children].filter(
    (cell) => getComputedStyle(cell).display !== 'none'
  ) as HTMLElement[]

const headers = () =>
  screen.getAllByRole('columnheader').map((cell) => cell.textContent)

function expectAligned() {
  const [head, ...rows] = screen.getAllByRole('row')
  const headLefts = shownCells(head!).map(
    (cell) => cell.getBoundingClientRect().left
  )
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) {
    const lefts = shownCells(row).map(
      (cell) => cell.getBoundingClientRect().left
    )
    expect(lefts).toEqual(headLefts)
  }
}

const widths: [number, string[]][] = [
  [1100, ['Show', 'City', 'Sold', 'Gross']],
  [960, ['Show', 'City', 'Sold']],
  [850, ['Show', 'City']],
  [700, ['Show']]
]

function Composed() {
  const records = useRecords({
    data: testShows(8),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true
  })
  return (
    <Records.Provider
      records={records}
      layouts={[tableLayout(columns)]}
      caption='Shows'
    >
      <Records.Content />
    </Records.Provider>
  )
}

describe('RecordTable column priority in a browser', () => {
  it('hides at the documented widths', () => {
    expect(PRIORITY_HIDES_BELOW).toEqual({ 3: 64, 2: 56, 1: 48 })
  })

  it('hides priority columns as the table narrows, header and rows aligned', async () => {
    render(
      <div data-testid='box' style={{ width: 1100 }}>
        <RecordTable
          caption='Shows'
          data={testShows(8)}
          fields={showFields}
          columns={columns}
        />
      </div>
    )
    for (const [width, shown] of widths) {
      await resize(width)
      await expect.poll(headers).toEqual(shown)
      for (const row of screen.getAllByRole('row')) {
        const cells = shownCells(row)
        expect(cells).toHaveLength(shown.length)
        expect(getComputedStyle(cells.at(-1)!).paddingRight).toBe('0px')
      }
      expectAligned()
    }
  })

  it('hides by priority in a Provider composition with no Root', async () => {
    render(
      <div data-testid='box' style={{ width: 1100 }}>
        <Composed />
      </div>
    )
    for (const [width, shown] of widths) {
      await resize(width)
      await expect.poll(headers).toEqual(['', ...shown])
      expectAligned()
    }
  })
})
