import { Activity, type ReactNode, StrictMode, useMemo, useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent as browserUser, page } from 'vitest/browser'

import { type RecordPosition, placeRange } from '@oztix/roadie-core/records'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames, withFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import {
  forgetPaneScroll,
  historyEntryKey,
  rememberPaneScroll
} from '../Pane/paneScroll'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { ROW_HEIGHT } from './RecordTableRow'
import { showColumns } from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

type Span = { start: number; end: number }

function Ranged({
  total,
  rowCount,
  spans,
  failAt,
  slowAt,
  maxHeight
}: {
  total: number
  rowCount?: number
  spans: Span[]
  /** Rejects the first request for the range starting here. */
  failAt?: number
  /** Settles the range starting here a moment later, so the test sees it pending. */
  slowAt?: number
  /** Scrolls the table in its own box rather than the outer one. */
  maxHeight?: string
}) {
  // Rows built on request: 100,000 up front would slow every render.
  const show = useMemo(() => {
    const sample = testShows(1)[0]!
    return (index: number): TestShow => ({
      ...sample,
      id: `show-${index}`,
      show: `show-${index}`
    })
  }, [])
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  const [failed] = useState(() => new Set<number>())
  return (
    <div
      data-testid='box'
      style={maxHeight ? undefined : { height: 600, overflowY: 'auto' }}
    >
      <RecordTable
        caption='Shows'
        maxHeight={maxHeight}
        data={data}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        rowCount={rowCount}
        loadRange={({ start, end }) => {
          spans.push({ start, end })
          const settle = () => {
            if (start === failAt && !failed.has(start)) {
              failed.add(start)
              throw new Error('Offline')
            }
            const rows = Array.from(
              { length: Math.max(0, Math.min(end, total) - start) },
              (_, offset) => show(start + offset)
            )
            setData((current) => placeRange(current, start, rows))
          }
          if (start !== slowAt) return settle()
          return new Promise<void>((resolve) => setTimeout(resolve, 300)).then(
            settle
          )
        }}
      />
    </div>
  )
}

const box = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-testid="box"]')!
const dataRows = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="record-table-row"]')
const placeholders = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="record-table-placeholder-row"]')

describe('RecordTable range mode in a browser', { timeout: 30_000 }, () => {
  it('jumps deep into 100,000 rows and loads only that range', async () => {
    const spans: Span[] = []
    const { container } = render(
      <Ranged total={100_000} rowCount={100_000} spans={spans} />
    )
    const scroller = box(container)
    expect(scroller.scrollHeight).toBeGreaterThanOrEqual(100_000 * ROW_HEIGHT)
    await framed(() => {
      scroller.scrollTop = ROW_HEIGHT * 50_000
      return container.textContent?.includes('show-50000')
    }).toBe(true)
    expect(
      spans.some(
        ({ start, end }) => start % 50 === 0 && start <= 50_000 && end > 50_000
      )
    ).toBe(true)
    expect(dataRows(container).length + placeholders(container).length).toBe(
      container.querySelectorAll('[data-slot="record-table-body"] > *').length
    )
    expect(
      container.querySelectorAll('[data-slot="record-table-body"] > *').length
    ).toBeLessThan(80)
  })

  it('loads ranges in order to the end without rowCount', async () => {
    const spans: Span[] = []
    const { container } = render(<Ranged total={400} spans={spans} />)
    const scroller = box(container)
    await framed(() => {
      scroller.scrollTop = scroller.scrollHeight
      return container.textContent?.includes('show-399')
    }).toBe(true)
    await framed(() =>
      container.querySelector('[role="table"]')?.getAttribute('aria-rowcount')
    ).toBe('401')
    expect(spans.map(({ start }) => start)).toEqual(
      Array.from({ length: spans.length }, (_, index) => index * 50)
    )
    expect(spans.at(-1)!.start).toBeGreaterThanOrEqual(400)
    expect(placeholders(container)).toHaveLength(0)
    expect(
      container
        .querySelector('[data-slot="record-table-body"] > :last-child')
        ?.getAttribute('aria-rowindex')
    ).toBe('401')
  })
})

function Positioned({
  total,
  rowCount,
  row,
  spans,
  delay = 0,
  onRow
}: {
  total: number
  rowCount?: number
  row: number
  spans: Span[]
  /** Milliseconds each range takes to arrive. */
  delay?: number
  onRow?: (row: number) => void
}) {
  const [position, setPosition] = useState<RecordPosition>({ row })
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  return (
    <RecordTable
      caption='Shows'
      data={data}
      fields={showFields}
      columns={showColumns}
      getRowId={(item) => item.id}
      rowCount={rowCount}
      position={position}
      onPositionChange={(next) => {
        onRow?.(next.row)
        setPosition(next)
      }}
      loadRange={({ start, end }) => {
        spans.push({ start, end })
        const rows = testShowsFrom(start, Math.min(end, total))
        const place = () =>
          setData((current) => placeRange(current, start, rows))
        if (delay === 0) return place()
        return new Promise<void>((resolve) =>
          setTimeout(() => {
            place()
            resolve()
          }, delay)
        )
      }}
    />
  )
}

const sample = testShows(1)[0]!
const testShowsFrom = (start: number, end: number): TestShow[] =>
  Array.from({ length: Math.max(0, end - start) }, (_, offset) => ({
    ...sample,
    id: `show-${start + offset}`,
    show: `show-${start + offset}`
  }))

const InBox = ({ children }: { children: ReactNode }) => (
  <div data-testid='box' style={{ height: 600, overflowY: 'auto' }}>
    {children}
  </div>
)

const InPane = ({ children }: { children: ReactNode }) => (
  <div style={{ height: 600, display: 'grid' }}>
    <Pane>
      <Pane.Header>
        <Pane.Title>Shows</Pane.Title>
      </Pane.Header>
      <Pane.Body>{children}</Pane.Body>
    </Pane>
  </div>
)

const rowAt = (container: HTMLElement, index: number) =>
  container.querySelector<HTMLElement>(
    `[data-slot="record-table-row"][aria-rowindex="${index + 2}"]`
  )

/** Pixels between a row's top and the stuck header's bottom; null until it renders. */
function underHeader(container: HTMLElement, index: number) {
  const row = rowAt(container, index)
  if (!row?.textContent?.includes(`show-${index}`)) return null
  const head = container
    .querySelector('[data-slot="record-table-head"]')!
    .getBoundingClientRect()
  return Math.abs(row.getBoundingClientRect().top - head.bottom)
}

function firstVisible(container: HTMLElement) {
  const head = container
    .querySelector('[data-slot="record-table-head"]')!
    .getBoundingClientRect()
  const row = [
    ...container.querySelectorAll<HTMLElement>('[data-slot="record-table-row"]')
  ].find((element) => element.getBoundingClientRect().bottom > head.bottom)
  return Number(row?.getAttribute('aria-rowindex')) - 2
}

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
const wait = (ms: number) =>
  withFrames(() => new Promise((resolve) => setTimeout(resolve, ms)))
// Linux WebKit runs no frames while a test sits idle, so each poll wakes them.
// CI's runners take seconds to scroll through a few ranges, so polls wait longer.
const framed = <T,>(read: () => T, { timeout = 8000 } = {}) =>
  expect.poll(
    async () => {
      await nudgeFrames()
      return read()
    },
    { timeout }
  )

describe('RecordTable range failure in a browser', { timeout: 30_000 }, () => {
  const inlineError = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="record-table-range-error"]'
    )

  // Scrolls until the range is requested, then leaves the position alone.
  const scrollUntilRequested = async (
    scroller: HTMLElement,
    spans: Span[],
    start: number,
    rowCount?: number
  ) => {
    await framed(() => {
      scroller.scrollTop =
        rowCount === undefined
          ? scroller.scrollHeight
          : ROW_HEIGHT * (start - 5)
      return spans.some((span) => span.start === start)
    }).toBe(true)
    return scroller.scrollTop
  }

  it.each([
    ['with rowCount', 5000, 1000],
    ['without rowCount', undefined, 100]
  ] as const)(
    'keeps the scroll position when a range fails and on Retry (%s)',
    async (_, rowCount, failAt) => {
      const spans: Span[] = []
      const { container } = render(
        <Ranged
          total={5000}
          rowCount={rowCount}
          spans={spans}
          failAt={failAt}
          slowAt={failAt}
        />
      )
      const scroller = box(container)
      const top = await scrollUntilRequested(scroller, spans, failAt, rowCount)
      expect(top).toBeGreaterThan(0)
      await framed(() => inlineError(container)).not.toBeNull()
      expect(scroller.scrollTop).toBe(top)
      expect(inlineError(container)!.getBoundingClientRect().height).toBe(
        ROW_HEIGHT
      )
      // A real click: user-event focuses the button with a scroll WebKit applies late.
      await page
        .elementLocator(inlineError(container)!.querySelector('button')!)
        .click()
      expect(document.activeElement).toBe(
        container.querySelector('[data-slot="record-table-scroller"]')
      )
      await framed(
        () => inlineError(container) === null && dataRows(container).length > 0
      ).toBe(true)
      expect(scroller.scrollTop).toBe(top)
      expect(spans.filter(({ start }) => start === failAt).length).toBe(2)
    }
  )

  it('keeps a failed range and a keyboard Retry inside a table in its own box', async () => {
    const spans: Span[] = []
    const { container } = render(
      <Ranged
        total={5000}
        rowCount={5000}
        spans={spans}
        failAt={1000}
        slowAt={1000}
        maxHeight='30rem'
      />
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="record-table-viewport"]'
    )!
    const top = await scrollUntilRequested(viewport, spans, 1000, 5000)
    await framed(() => inlineError(container)).not.toBeNull()
    expect(viewport.scrollTop).toBe(top)
    inlineError(container)!
      .querySelector<HTMLElement>('button')!
      .focus({ preventScroll: true })
    await browserUser.keyboard('{Enter}')
    expect(document.activeElement).toBe(viewport)
    expect(viewport).toHaveAccessibleName('Shows, scrolls')
    expect(viewport.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(viewport).outlineStyle).toBe('solid')
    await framed(
      () => inlineError(container) === null && dataRows(container).length > 0
    ).toBe(true)
    expect(viewport.scrollTop).toBe(top)
  })

  it('keeps the scroll position when a range lands at the end of the list', async () => {
    const spans: Span[] = []
    const { container } = render(
      <Ranged total={5000} spans={spans} slowAt={100} />
    )
    const scroller = box(container)
    const top = await scrollUntilRequested(scroller, spans, 100)
    expect(top).toBeGreaterThan(0)
    expect(placeholders(container).length).toBeGreaterThan(0)
    await framed(() => placeholders(container).length).toBe(0)
    expect(scroller.scrollTop).toBe(top)
  })
})

describe('RecordTable range position in a browser', { timeout: 30_000 }, () => {
  it('leaves the page where it is when it opens at the first row', async () => {
    const { container } = render(
      <InBox>
        <div style={{ height: 800 }}>Above the table</div>
        <Positioned total={5000} rowCount={5000} row={0} spans={[]} />
      </InBox>
    )
    await framed(() => rowAt(container, 0)).not.toBeNull()
    await wait(700)
    expect(box(container).scrollTop).toBe(0)
  })

  it('restores the row under the header against the window', async () => {
    const spans: Span[] = []
    const { container } = render(
      <Positioned total={5000} rowCount={5000} row={480} spans={spans} />
    )
    await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
    await wait(300)
    // Only the restored window and a screen either side; nothing from the top it left.
    const starts = spans.map(({ start }) => start)
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(400)
    expect(Math.max(...starts)).toBeLessThanOrEqual(550)
  })

  it('wins over the pane restoring its own remembered offset', async () => {
    const key = 'range-position-entry'
    const navigation = Object.getOwnPropertyDescriptor(window, 'navigation')
    Object.defineProperty(window, 'navigation', {
      configurable: true,
      value: { currentEntry: { key } }
    })
    try {
      expect(historyEntryKey()).toBe(key)
      // A standalone detail pane's seat; the offset is from another layout.
      rememberPaneScroll(key, '0:detail:1', 470 * ROW_HEIGHT)
      const { container } = render(
        <InPane>
          <Positioned total={5000} rowCount={5000} row={480} spans={[]} />
        </InPane>
      )
      const viewport = container.querySelector<HTMLElement>(
        '[data-slot="pane-viewport"]'
      )!
      await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
      // Past the pane's settle frames and the table's hold.
      await wait(800)
      expect(underHeader(container, 480)).toBeLessThanOrEqual(1)
      expect(viewport.scrollTop).not.toBe(470 * ROW_HEIGHT)
    } finally {
      forgetPaneScroll()
      if (navigation) Object.defineProperty(window, 'navigation', navigation)
      else delete (window as { navigation?: unknown }).navigation
    }
  })

  it('returns to the top for a new search', async () => {
    const user = userEvent.setup()
    const rows: number[] = []
    const { container } = render(
      <InBox>
        <Positioned
          total={5000}
          rowCount={5000}
          row={0}
          spans={[]}
          onRow={(row) => rows.push(row)}
        />
      </InBox>
    )
    const scroller = box(container)
    await framed(() => rowAt(container, 0)).not.toBeNull()
    await framed(() => {
      scroller.scrollTop = 300 * ROW_HEIGHT
      return rows.some((row) => row > 250)
    }).toBe(true)
    await wait(400)
    const before = rows.length
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'a'
    )
    await framed(() => scroller.scrollTop).toBe(0)
    await wait(800)
    expect(rows.slice(before)).toEqual(rows.slice(before).map(() => 0))
    expect(firstVisible(container)).toBe(0)
  })

  it('reports a scrollbar drag during the hold once it lapses', async () => {
    const rows: number[] = []
    const { container } = render(
      <InBox>
        <Positioned
          total={5000}
          rowCount={5000}
          row={480}
          spans={[]}
          onRow={(row) => rows.push(row)}
        />
      </InBox>
    )
    const scroller = box(container)
    await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
    // A drag on the scrollbar fires no wheel, touch or key event.
    scroller.scrollTop = 200 * ROW_HEIGHT
    await framed(() => rows.at(-1)).toBeDefined()
    expect(Math.abs(rows.at(-1)! - 200)).toBeLessThanOrEqual(2)
    expect(rows.at(-1)).toBe(firstVisible(container))
  })

  it('reports a scrollbar drag during the hold once it lapses in StrictMode', async () => {
    const rows: number[] = []
    const { container } = render(
      <StrictMode>
        <InBox>
          <Positioned
            total={5000}
            rowCount={5000}
            row={480}
            spans={[]}
            onRow={(row) => rows.push(row)}
          />
        </InBox>
      </StrictMode>
    )
    const scroller = box(container)
    await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
    scroller.scrollTop = 200 * ROW_HEIGHT
    await framed(() => rows.at(-1)).toBeDefined()
    expect(Math.abs(rows.at(-1)! - 200)).toBeLessThanOrEqual(2)
    expect(rows.at(-1)).toBe(firstVisible(container))
  })

  it('reports a scrollbar drag after the hold is hidden and shown again', async () => {
    const rows: number[] = []
    const table = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <InBox>
          <Positioned
            total={5000}
            rowCount={5000}
            row={480}
            spans={[]}
            onRow={(row) => rows.push(row)}
          />
        </InBox>
      </Activity>
    )
    const { container, rerender } = render(table('visible'))
    await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
    // Effects clean up and run again inside the hold, as StrictMode's remount does.
    rerender(table('hidden'))
    rerender(table('visible'))
    await wait(700)
    box(container).scrollTop = 200 * ROW_HEIGHT
    await framed(() => rows.at(-1)).toBeDefined()
    expect(Math.abs(rows.at(-1)! - 200)).toBeLessThanOrEqual(2)
  })

  it('restores the row under the header in a pane, and again on remount', async () => {
    const first = render(
      <InPane>
        <Positioned total={5000} rowCount={5000} row={480} spans={[]} />
      </InPane>
    )
    await framed(() => underHeader(first.container, 480)).toBeLessThanOrEqual(1)
    first.unmount()

    const again = render(
      <InPane>
        <Positioned total={5000} rowCount={5000} row={480} spans={[]} />
      </InPane>
    )
    await framed(() => underHeader(again.container, 480)).toBeLessThanOrEqual(1)
  })

  it('loads ranges in order to the row without rowCount', async () => {
    const spans: Span[] = []
    const { container } = render(
      <InBox>
        <Positioned total={1000} row={480} spans={spans} />
      </InBox>
    )
    await framed(() => underHeader(container, 480)).toBeLessThanOrEqual(1)
    const starts = spans.map(({ start }) => start)
    expect(starts.slice(0, 10)).toEqual(
      Array.from({ length: 10 }, (_, index) => index * 50)
    )
    // The row's own range, then at most one more for the screen below it.
    expect(Math.max(...starts)).toBeLessThanOrEqual(500)
  })

  it('gives up a pending restore on a wheel', async () => {
    const spans: Span[] = []
    const { container } = render(
      <InBox>
        <Positioned total={1000} row={480} spans={spans} delay={200} />
      </InBox>
    )
    const scroller = box(container)
    scroller.dispatchEvent(new WheelEvent('wheel', { bubbles: true }))
    await framed(() => rowAt(container, 0)).not.toBeNull()
    await wait(600)
    expect(scroller.scrollTop).toBe(0)
    expect(spans).toEqual([{ start: 0, end: 50 }])
  })

  it('reports the first visible row while scrolling, a few times a second', async () => {
    const rows: number[] = []
    const { container } = render(
      <InBox>
        <Positioned
          total={5000}
          rowCount={5000}
          row={0}
          spans={[]}
          onRow={(row) => rows.push(row)}
        />
      </InBox>
    )
    const scroller = box(container)
    await framed(() => rowAt(container, 0)).not.toBeNull()
    const started = performance.now()
    for (;;) {
      const progress = Math.min(1, (performance.now() - started) / 1000)
      scroller.scrollTop = progress * 100 * ROW_HEIGHT
      await frame()
      if (progress === 1) break
    }
    await framed(() => rows.at(-1) === firstVisible(container)).toBe(true)
    await wait(400)
    expect(Math.abs(rows.at(-1)! - 100)).toBeLessThanOrEqual(2)
    expect(rows.at(-1)).toBe(firstVisible(container))
    expect(rows.length).toBeLessThanOrEqual(5)
  })
})
