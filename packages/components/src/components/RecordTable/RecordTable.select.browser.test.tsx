import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Menu } from '../Menu'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { ALL, WIDE_BOX, frame, rect, slot, wideColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const near = (a: number, b: number) => Math.abs(a - b) <= 1
const background = (element: Element) =>
  getComputedStyle(element).backgroundColor
const cells = (row: Element) => [...row.querySelectorAll('[role="cell"]')]

function Shows() {
  return (
    <div style={{ width: WIDE_BOX }}>
      <RecordTable
        caption='Shows'
        data={testShows(20)}
        fields={showFields}
        columns={wideColumns}
        getRowId={(row) => row.id}
        getRowHref={(row) => `#${row.id}`}
        defaultPosition={ALL}
        rowActions={() => <Menu.Item>Edit</Menu.Item>}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
        tableActions={[
          { label: 'Export CSV', onAction: () => {} },
          { label: 'Print door list', onAction: () => {} }
        ]}
      />
    </div>
  )
}

describe('RecordTable selection in a browser', () => {
  it('tints every cell of a selected row the same opaque colour', async () => {
    const { container } = render(<Shows />)
    const row = slot(container, 'record-table-row')
    const [, title, city] = cells(row)
    const before = background(city!)
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await expect.poll(() => background(city!)).not.toBe(before)
    expect(background(title!)).toBe(background(city!))
    expect(background(cells(row).at(-1)!)).toBe(background(city!))
  })

  it('keeps the checkbox and title at the start and the actions at the end while scrolling sideways', async () => {
    const { container } = render(<Shows />)
    await frame()
    const scroller = slot(container, 'record-table-scroller')
    const row = slot(container, 'record-table-row')
    const [select, title] = cells(row)
    const actions = cells(row).at(-1)!
    const start = rect(select!).left
    const titleStart = rect(title!).left
    const end = rect(actions).right
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    await expect
      .poll(() => {
        scroller.scrollLeft = 200
        return scroller.scrollLeft
      })
      .toBeGreaterThan(0)
    await frame()
    expect(near(rect(select!).left, start)).toBe(true)
    expect(near(rect(title!).left, titleStart)).toBe(true)
    expect(near(rect(actions).right, end)).toBe(true)
    expect(near(end, rect(scroller).right)).toBe(true)
  })

  it('tints a clickable row on hover', async () => {
    const { container } = render(<Shows />)
    const row = slot(container, 'record-table-row')
    const city = cells(row)[2]!
    const resting = background(city)
    await userEvent.hover(city)
    await expect.poll(() => background(city)).not.toBe(resting)
    expect(getComputedStyle(row).cursor).toBe('pointer')
  })

  it('keeps the toolbar actions at the search field height', async () => {
    render(<Shows />)
    await frame()
    const search = rect(screen.getByRole('searchbox')).height
    expect(
      rect(screen.getByRole('button', { name: 'Export CSV' })).height
    ).toBe(search)
    expect(
      rect(screen.getByRole('button', { name: 'More actions' })).height
    ).toBe(search)
  })
})
