import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from './testUtils'
import type { RecordViewDefaults } from './types'

const STILL = '*, *::before, *::after { transition: none !important }'
const TIMEOUT = { timeout: 20_000 }

let removeStylesheets = () => {}
beforeAll(async () => {
  const removeRoadie = useStylesheet(roadieCss)
  const removeStill = useStylesheet(STILL)
  removeStylesheets = () => {
    removeRoadie()
    removeStill()
  }
  await loadBrandFont()
})
afterAll(() => removeStylesheets())
afterEach(async () => {
  cleanup()
  await page.viewport(1024, 768)
})

const column = tableColumns<TestShow>(showFields)
const layouts = [
  tableLayout([
    column.field('show', { pin: true }),
    column.field('city'),
    column.field('status'),
    column.field('starts')
  ])
]

const oneChip: RecordViewDefaults = {
  query: {
    filters: [
      { field: 'city', operator: 'contains', value: 'Kazoo Hollow Room' }
    ]
  }
}

function ShowsPane({ defaultView }: { defaultView?: RecordViewDefaults }) {
  const records = useRecords({
    data: testShows(80),
    fields: showFields,
    getRowId: (row) => row.id,
    defaultView
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

const slot = (name: string) =>
  document.querySelector<HTMLElement>(`[data-slot="${name}"]`)!
const box = (element: Element) => element.getBoundingClientRect()
const searchField = () => slot('query-field')
const configure = () => screen.getByRole('button', { name: 'Configure table' })

async function renderAt(width: number, defaultView?: RecordViewDefaults) {
  await page.viewport(width, 800)
  render(
    <div style={{ height: 640, width, display: 'grid' }}>
      <ShowsPane defaultView={defaultView} />
    </div>
  )
  await expect.poll(() => slot('pane-header')).not.toBeNull()
}

async function scrollUntilStuck() {
  const viewport = slot('pane-viewport')
  viewport.scrollTop = 2000
  await nudgeFrames()
  await expect
    .poll(
      () => box(slot('pane-header')).bottom - box(slot('records-toolbar')).top
    )
    .toBeLessThanOrEqual(1)
  expect(viewport.scrollTop).toBeGreaterThan(0)
}

const gapUnderHeader = () =>
  box(searchField()).top - box(slot('pane-header')).bottom

describe.each([390, 360, 280, 1280])(
  'Records.Toolbar in a pane at %ipx',
  (width) => {
    it(
      'leaves a gap between the pane header and the search at rest',
      TIMEOUT,
      async () => {
        await renderAt(width)
        await expect.poll(gapUnderHeader).toBeGreaterThanOrEqual(8)
      }
    )

    it('keeps the gap while the toolbar sticks', TIMEOUT, async () => {
      await renderAt(width)
      await scrollUntilStuck()
      expect(gapUnderHeader()).toBeGreaterThanOrEqual(8)
    })

    // Narrow rows have no column headers.
    it.skipIf(width < 640)(
      'sticks the column headers under the whole toolbar',
      TIMEOUT,
      async () => {
        await renderAt(width)
        await scrollUntilStuck()
        await expect
          .poll(() =>
            Math.abs(
              box(slot('record-table-head')).top -
                box(slot('records-toolbar')).bottom
            )
          )
          .toBeLessThanOrEqual(1)
      }
    )

    it('keeps the search one row tall with one chip', TIMEOUT, async () => {
      await renderAt(width, oneChip)
      await expect.poll(() => slot('combobox-chip')).not.toBeNull()
      expect(box(searchField()).height).toBe(40)
    })

    it('keeps Configure on the search’s row', TIMEOUT, async () => {
      await renderAt(width, oneChip)
      await expect.poll(() => box(configure()).top).toBe(box(searchField()).top)
    })
  }
)

describe('Records.Toolbar outside a pane', () => {
  it('adds no space above the search', TIMEOUT, async () => {
    function Shows() {
      const records = useRecords({
        data: testShows(10),
        fields: showFields,
        getRowId: (row) => row.id
      })
      return (
        <Records records={records} layouts={layouts} caption='Shows'>
          <Records.Toolbar />
          <Records.Content />
        </Records>
      )
    }
    render(<Shows />)
    await expect.poll(() => slot('query-field')).not.toBeNull()
    expect(box(searchField()).top).toBe(box(slot('records-toolbar')).top)
  })
})
