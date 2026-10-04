import { useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  type RecordPosition,
  type RecordView,
  placeRange,
  recordFields
} from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { CARD_GAP_REM } from './RecordTableNarrowRows'
import { frame } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const settle = async () => {
  await frame()
  await frame()
}
const CARD_GAP = CARD_GAP_REM * 16

type NotedShow = TestShow & { tall: boolean; note: string }

const fields = [
  ...showFields,
  recordFields<NotedShow>().text('note', { label: 'Note' })
]
const column = tableColumns<NotedShow>(fields)
const cardColumns = [
  column.field('show', { pin: true, narrow: 'title' }),
  column.field('city', { narrow: 'description' }),
  column.field('sold', { narrow: 'detail' }),
  column.field('note', {
    narrow: 'detail',
    cell: ({ row }) =>
      row.tall ? (
        <span className='grid'>
          <span>Doors at 7pm</span>
          <span>Support from Ember Galah Ball</span>
          <span>All ages, licensed</span>
        </span>
      ) : (
        'Doors at 7pm'
      )
  })
]

const noted = (count: number, tall = (index: number) => index % 7 === 0) =>
  testShows(count).map((show, index) => ({
    ...show,
    tall: tall(index),
    note: 'Doors at 7pm'
  }))

const cards = (container: HTMLElement) =>
  [
    ...container.querySelectorAll<HTMLElement>(
      '[data-slot="record-table-card"]'
    )
  ].sort(
    (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
  )

const box = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-testid="box"]')!

function expectNoOverlap(container: HTMLElement) {
  const shown = cards(container)
  for (let index = 1; index < shown.length; index++) {
    const previous = shown[index - 1]!.getBoundingClientRect()
    const next = shown[index]!.getBoundingClientRect()
    expect(next.top).toBeGreaterThanOrEqual(previous.bottom + CARD_GAP - 1)
  }
}

/** The card nearest the middle of the box, which stays in view for a step under half its height. */
function anchor(container: HTMLElement) {
  const middle = box(container).getBoundingClientRect().top + 300
  const card = cards(container).reduce((nearest, element) =>
    Math.abs(element.getBoundingClientRect().top - middle) <
    Math.abs(nearest.getBoundingClientRect().top - middle)
      ? element
      : nearest
  )
  const rect = card.getBoundingClientRect()
  return { id: card.dataset.rowId!, top: rect.top, height: rect.height }
}

/** Scrolls by `delta`, checking the anchor card moves by it, give or take one card. */
async function scrollAndCheck(
  container: HTMLElement,
  delta: number,
  seen: Set<string>
) {
  const scroller = box(container)
  const before = anchor(container)
  const from = scroller.scrollTop
  const room = scroller.scrollHeight - scroller.clientHeight
  const step = Math.max(-from, Math.min(delta, room - from))
  scroller.scrollTop = from + step
  await settle()
  const moved = cards(container).find(
    (element) => element.dataset.rowId === before.id
  )
  expect(moved).toBeDefined()
  const drift = moved!.getBoundingClientRect().top - (before.top - step)
  expect(Math.abs(drift)).toBeLessThanOrEqual(before.height)
  expectNoOverlap(container)
  for (const card of cards(container)) seen.add(card.dataset.rowId!)
}

function Ranged({ row = 0 }: { row?: number }) {
  const [view, setView] = useState<RecordView>({
    query: { search: '', filters: [], sort: [] },
    layout: { type: 'table' }
  })
  const [position, setPosition] = useState<RecordPosition>({ row })
  const [data, setData] = useState<(NotedShow | undefined)[]>([])
  return (
    <div
      data-testid='box'
      style={{ width: 360, height: 600, overflowY: 'auto' }}
    >
      <RecordTable
        caption='Shows'
        data={data}
        fields={fields}
        columns={cardColumns}
        getRowId={(item) => item.id}
        rowCount={2000}
        view={view}
        onViewChange={(next) => {
          if (next.query.search !== view.query.search) setData([])
          setView(next)
        }}
        position={position}
        onPositionChange={setPosition}
        loadRange={({ start, end }) => {
          const rows = noted(
            Math.min(end, 2000),
            () => view.query.search === ''
          ).slice(start)
          setData((current) => placeRange(current, start, rows))
        }}
      />
    </div>
  )
}

describe('RecordTable narrow cards in a browser', () => {
  it('measures 1,000 cards without overlap or jumps', async () => {
    const { container } = render(
      <div
        data-testid='box'
        style={{ width: 360, height: 600, overflowY: 'auto' }}
      >
        <RecordTable
          caption='Shows'
          data={noted(1000)}
          fields={fields}
          columns={cardColumns}
          getRowId={(row) => row.id}
          defaultPosition={{ pageSize: 10_000 }}
        />
      </div>
    )
    await expect.poll(() => cards(container).length).toBeGreaterThan(0)
    await settle()
    const scroller = box(container)
    const seen = new Set<string>()
    while (
      scroller.scrollTop + scroller.clientHeight <
      scroller.scrollHeight - 1
    )
      await scrollAndCheck(container, 250, seen)
    await expect
      .poll(() =>
        cards(container).some((card) => card.dataset.rowId === 'show-999')
      )
      .toBe(true)
    const last = cards(container).at(-1)!
    expect(last.dataset.rowId).toBe('show-999')
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      scroller.getBoundingClientRect().bottom + 1
    )
    expect(seen.size).toBe(1000)
    while (scroller.scrollTop > 0) await scrollAndCheck(container, -250, seen)
    const first = cards(container)[0]!
    expect(first.dataset.rowId).toBe('show-0')
    expect(
      Math.abs(
        first.getBoundingClientRect().top -
          screen.getByRole('list', { name: 'Shows' }).getBoundingClientRect()
            .top
      )
    ).toBeLessThanOrEqual(1)
  }, 120_000)

  it("starts a new range query's cards from the estimate, not the last query's heights", async () => {
    const user = userEvent.setup()
    const { container } = render(<Ranged />)
    await expect.poll(() => cards(container).length).toBeGreaterThan(0)
    const scroller = box(container)
    const seen = new Set<string>()
    // Every card on this query is tall, measured as it passes.
    while (scroller.scrollTop < 8000) await scrollAndCheck(container, 250, seen)
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'a'
    )
    await expect.poll(() => scroller.scrollTop).toBe(0)
    await expect
      .poll(() => cards(container)[0]?.textContent?.includes('All ages'))
      .toBe(false)
    // A jump past the cards above, so each enters from above while scrolling up.
    scroller.scrollTop = 6000
    await expect.poll(() => cards(container).length).toBeGreaterThan(0)
    await settle()
    await new Promise((resolve) => setTimeout(resolve, 600))
    while (scroller.scrollTop > 0) {
      const before = anchor(container)
      const step = Math.min(150, scroller.scrollTop)
      scroller.scrollTop -= step
      await settle()
      const moved = cards(container).find(
        (element) => element.dataset.rowId === before.id
      )
      expect(moved).toBeDefined()
      expect(
        Math.abs(moved!.getBoundingClientRect().top - (before.top + step))
      ).toBeLessThanOrEqual(2)
      expectNoOverlap(container)
    }
  }, 120_000)

  it('lands a restored range row under the toolbar once cards are measured', async () => {
    const { container } = render(<Ranged row={120} />)
    const toolbar = container.querySelector<HTMLElement>(
      '[data-slot="records-toolbar"]'
    )!
    const offset = () => {
      const card = cards(container).find(
        (element) => element.dataset.rowId === 'show-120'
      )
      return card
        ? Math.abs(
            card.getBoundingClientRect().top -
              toolbar.getBoundingClientRect().bottom
          )
        : null
    }
    await expect.poll(offset).toBeLessThanOrEqual(2)
    await new Promise((resolve) => setTimeout(resolve, 800))
    expect(offset()).toBeLessThanOrEqual(2)
  })
})
