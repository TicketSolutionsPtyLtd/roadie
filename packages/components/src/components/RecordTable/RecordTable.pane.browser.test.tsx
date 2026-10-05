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
const fits = [
  tableLayout([
    column.field('show', { pin: true, width: { min: 8 } }),
    column.field('city')
  ])
]

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

async function renderAt(
  width: number,
  layouts: typeof wide,
  slotName = 'record-table-row'
) {
  await page.viewport(width, 800)
  const { container } = render(
    <div style={{ height: 640, width, display: 'grid' }}>
      <ShowsPane layouts={layouts} />
    </div>
  )
  await expect.poll(() => slot(container, slotName)).not.toBeNull()
  await nudgeFrames()
  return container
}

const innerEdges = (container: HTMLElement) => {
  const viewport = slot(container, 'pane-viewport')
  const box = rect(viewport)
  return { left: box.left, right: box.left + viewport.clientWidth }
}

const contentLeft = (element: Element) =>
  rect(element).left + parseFloat(getComputedStyle(element).paddingLeft)

const firstCell = (container: HTMLElement) =>
  slot(container, 'record-table-row').firstElementChild!
const firstHeader = (container: HTMLElement) =>
  slot(container, 'record-table-head-row').firstElementChild!
const searchLeft = (container: HTMLElement) =>
  rect(slot(container, 'query-field')).left

const verticalScrollers = (container: HTMLElement) =>
  [...slot(container, 'pane').querySelectorAll<HTMLElement>('*')].filter(
    (element) =>
      ['auto', 'scroll'].includes(getComputedStyle(element).overflowY) &&
      element.scrollHeight > element.clientHeight + 1
  )

async function scrollTable(container: HTMLElement, left: number, top: number) {
  const scroller = slot(container, 'record-table-scroller')
  scroller.scrollLeft = left
  scroller.dispatchEvent(new Event('scroll'))
  slot(container, 'pane-viewport').scrollTop = top
  await nudgeFrames()
}

const hit = (x: number, y: number) => document.elementFromPoint(x, y)
const middle = (element: Element) => {
  const box = rect(element)
  return box.top + box.height / 2
}

describe.each([
  ['an overflowing', wide],
  ['a fitting', fits]
] as const)('%s table in a pane at 1280px', (_, layouts) => {
  it('spans the pane edge to edge, rows and dividers too', async () => {
    const container = await renderAt(1280, layouts)
    const edges = innerEdges(container)
    for (const name of [
      'record-table-scroller',
      'record-table-row',
      'record-table-head-row'
    ]) {
      const box = rect(slot(container, name))
      expect(box.left).toBeCloseTo(edges.left, 0)
      if (layouts === fits) expect(box.right).toBeCloseTo(edges.right, 0)
    }
    expect(rect(slot(container, 'record-table-scroller')).right).toBeCloseTo(
      edges.right,
      0
    )
  })

  it('lines the first column’s content up with the search at rest', async () => {
    const container = await renderAt(1280, layouts)
    expect(contentLeft(firstCell(container))).toBeCloseTo(
      searchLeft(container),
      0
    )
    expect(contentLeft(firstHeader(container))).toBeCloseTo(
      searchLeft(container),
      0
    )
  })

  it('scrolls down in the pane alone', async () => {
    const container = await renderAt(1280, layouts)
    expect(verticalScrollers(container)).toEqual([
      slot(container, 'pane-viewport')
    ])
  })
})

describe('An overflowing table in a pane, scrolled sideways', () => {
  it('keeps the first column lined up with the search, over the columns that pass under it', async () => {
    const container = await renderAt(1280, wide)
    await scrollTable(container, 400, 1500)
    const row = [
      ...container.querySelectorAll('[data-slot=record-table-row]')
    ].find(
      (element) =>
        rect(element).top > rect(slot(container, 'record-table-head')).bottom
    )!
    const cell = row.firstElementChild!
    expect(contentLeft(cell)).toBeCloseTo(searchLeft(container), 0)
    const gutter = innerEdges(container).left + 4
    expect(hit(gutter, middle(row))?.closest('[role=cell]')).toBe(cell)
    expect(
      hit(gutter, middle(slot(container, 'record-table-head-row')))?.closest(
        '[role=columnheader]'
      )
    ).toBe(firstHeader(container))
  })
})

describe.each([390, 360, 1280])(
  'A stuck toolbar in a pane at %ipx',
  (width) => {
    it('paints the pane’s margins beside it and down to the rows', async () => {
      const container = await renderAt(
        width,
        wide,
        width < 640 ? 'record-table-list-row' : 'record-table-row'
      )
      slot(container, 'pane-viewport').scrollTop = 1500
      await nudgeFrames()
      const toolbar = slot(container, 'records-toolbar')
      const edges = innerEdges(container)
      const header = rect(slot(container, 'pane-header'))
      await expect.poll(() => rect(toolbar).top).toBeCloseTo(header.bottom, 0)
      // Clear of the pane's scrollbar, which overlays its end edge.
      for (const x of [edges.left + 4, edges.right - 16])
        for (const y of [
          rect(toolbar).top + 2,
          middle(toolbar),
          rect(toolbar).bottom - 1
        ])
          expect(toolbar.contains(hit(x, y))).toBe(true)
      if (width >= 640) {
        const head = slot(container, 'record-table-head')
        expect(rect(head).top).toBeCloseTo(rect(toolbar).bottom, 0)
        expect(head.contains(hit(edges.left + 4, rect(head).top + 1))).toBe(
          true
        )
      }
    })
  }
)

describe.each([390, 360])('Narrow rows in a pane at %ipx', (width) => {
  it('keep the pane’s inset', async () => {
    const container = await renderAt(width, wide, 'record-table-list-row')
    expect(rect(slot(container, 'record-table-frame')).left).toBeCloseTo(
      searchLeft(container),
      0
    )
    const toolbar = slot(container, 'records-toolbar')
    expect(rect(slot(container, 'record-table-frame')).right).toBeCloseTo(
      rect(toolbar).right - parseFloat(getComputedStyle(toolbar).paddingRight),
      0
    )
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
    await page.viewport(1280, 800)
    const { container, getByTestId } = render(
      <div style={{ height: 640, width: 1280, display: 'grid' }}>
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
