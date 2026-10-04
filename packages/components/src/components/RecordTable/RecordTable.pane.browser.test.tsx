import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { tableColumns, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { rect, slot } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await page.viewport(1024, 768)
})

const column = tableColumns<TestShow>(showFields)
const wide = [
  tableLayout([
    column.field('show', { pin: true, width: { min: 30 } }),
    column.field('city', { width: { min: 30 } }),
    column.field('sold', { width: { min: 30 } }),
    column.field('gross', { width: { min: 30 } })
  ])
]
const narrow = [tableLayout([column.field('show', { width: { min: 8 } })])]

function ShowsPane({ layouts }: { layouts: typeof wide }) {
  const records = useRecords({
    data: testShows(80),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable: true
  })
  return (
    <Records.Provider records={records} layouts={layouts} caption='Shows'>
      <Pane className='h-full'>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>
          <Records.Toolbar />
          <Records.Content />
        </Pane.Body>
      </Pane>
    </Records.Provider>
  )
}

async function renderAt(width: number, layouts: typeof wide) {
  await page.viewport(width, 800)
  const { container } = render(
    <div style={{ height: 640, width, display: 'grid' }}>
      <ShowsPane layouts={layouts} />
    </div>
  )
  await expect.poll(() => slot(container, 'record-table-row')).not.toBeNull()
  await nudgeFrames()
  return container
}

const innerEdges = (viewport: HTMLElement) => {
  const box = rect(viewport)
  return { left: box.left, right: box.left + viewport.clientWidth }
}

const firstCell = (container: HTMLElement) =>
  slot(container, 'record-table-row').firstElementChild!

const verticalScrollers = (container: HTMLElement) =>
  [...slot(container, 'pane').querySelectorAll<HTMLElement>('*')].filter(
    (element) =>
      ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) &&
      element.scrollHeight > element.clientHeight + 1
  )

describe.each([390, 360, 1280])('RecordTable in a pane at %ipx', (width) => {
  it('bleeds an overflowing table to the pane’s inner edges', async () => {
    const container = await renderAt(width, wide)
    const edges = innerEdges(slot(container, 'pane-viewport'))
    await expect
      .poll(() => rect(slot(container, 'record-table-scroller')).left)
      .toBeCloseTo(edges.left, 0)
    const scroller = rect(slot(container, 'record-table-scroller'))
    expect(scroller.right).toBeCloseTo(edges.right, 0)
    const bar = rect(slot(container, 'record-table-scrollbar-x'))
    expect(bar.width).toBeGreaterThan(scroller.width - 24)
  })

  it('lines the first column up with the search at rest', async () => {
    const container = await renderAt(width, wide)
    const search = rect(slot(container, 'query-field'))
    await expect
      .poll(() => rect(firstCell(container)).left)
      .toBeCloseTo(search.left, 0)
    expect(
      rect(slot(container, 'record-table-head-row').firstElementChild!).left
    ).toBeCloseTo(search.left, 0)
  })

  it('runs an overflowing table’s rows edge to edge', async () => {
    const container = await renderAt(width, wide)
    const edges = innerEdges(slot(container, 'pane-viewport'))
    await expect
      .poll(() => rect(slot(container, 'record-table-row')).left)
      .toBeCloseTo(edges.left, 0)
  })

  it('keeps the pinned columns and the header in place as it scrolls', async () => {
    const container = await renderAt(width, wide)
    const viewport = slot(container, 'pane-viewport')
    const scroller = slot(container, 'record-table-scroller')
    scroller.scrollLeft = 300
    scroller.dispatchEvent(new Event('scroll'))
    viewport.scrollTop = 1500
    await nudgeFrames()
    const edges = innerEdges(viewport)
    await expect
      .poll(() => rect(firstCell(container)).left)
      .toBeCloseTo(edges.left, 0)
    expect(
      Math.abs(
        rect(slot(container, 'record-table-head')).top -
          rect(slot(container, 'records-toolbar')).bottom
      )
    ).toBeLessThanOrEqual(1)
  })

  it('leaves a table that fits inside the content box', async () => {
    const container = await renderAt(width, narrow)
    const toolbar = rect(slot(container, 'records-toolbar'))
    const scroller = rect(slot(container, 'record-table-scroller'))
    expect(scroller.left).toBeCloseTo(toolbar.left, 0)
    expect(scroller.right).toBeCloseTo(toolbar.right, 0)
    expect(rect(slot(container, 'record-table-row')).left).toBeCloseTo(
      toolbar.left,
      0
    )
  })

  it('scrolls down in the pane alone', async () => {
    const container = await renderAt(width, wide)
    expect(verticalScrollers(container)).toEqual([
      slot(container, 'pane-viewport')
    ])
  })
})

describe('RecordTable in a card in a pane', () => {
  it('stays inside the card', async () => {
    function CardPane() {
      const records = useRecords({
        data: testShows(20),
        fields: showFields,
        getRowId: (row) => row.id
      })
      return (
        <Pane className='h-full'>
          <Pane.Body>
            <div data-testid='card' className='p-4'>
              <Records records={records} layouts={wide} caption='Shows'>
                <Records.Content />
              </Records>
            </div>
          </Pane.Body>
        </Pane>
      )
    }
    await page.viewport(390, 800)
    const { container, getByTestId } = render(
      <div style={{ height: 640, width: 390, display: 'grid' }}>
        <CardPane />
      </div>
    )
    await expect.poll(() => slot(container, 'record-table-row')).not.toBeNull()
    const card = rect(getByTestId('card'))
    const scroller = rect(slot(container, 'record-table-scroller'))
    expect(scroller.left).toBeCloseTo(card.left + 16, 0)
    expect(scroller.right).toBeCloseTo(card.right - 16, 0)
  })
})
