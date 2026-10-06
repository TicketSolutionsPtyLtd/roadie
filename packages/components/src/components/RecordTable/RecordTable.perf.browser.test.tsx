import { type ReactNode, useState } from 'react'

import { type Root, createRoot } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { placeRange } from '@oztix/roadie-core/records'

import { RecordTable, tableColumns } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { RecordTableSettingsLazy } from './RecordTableSettingsLazy'
import { countRenders } from './renderCounter'
import { showColumns } from './testUtils'

declare module 'vitest/browser' {
  interface BrowserCommands {
    throttleCpu: (rate: number) => Promise<void>
    renderMetrics: () => Promise<{ styleMs: number; layoutMs: number }>
  }
}

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await commands.throttleCpu(4)
})
afterAll(async () => {
  await commands.throttleCpu(1)
  removeStylesheet()
})
let activeRoot: Root | undefined
let activeContainer: HTMLElement | undefined
afterEach(() => {
  activeRoot?.unmount()
  activeContainer?.remove()
  activeRoot = undefined
  activeContainer = undefined
})

const frame = () => new Promise<number>(requestAnimationFrame)

// Production React has no `act`; two settling frames keep mount cost out of the measurements.
async function mount(node: ReactNode) {
  activeContainer = document.createElement('div')
  document.body.append(activeContainer)
  activeRoot = createRoot(activeContainer)
  activeRoot.render(node)
  await frame()
  await frame()
  return activeContainer
}

const FRAME_BUDGET = 1000 / 60 + 0.5

/** Frame times while `step` runs each frame, and the longest task meanwhile. */
async function measureFrames(step: () => void, frames = 120) {
  const longTasks: number[] = []
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) longTasks.push(entry.duration)
  })
  observer.observe({ type: 'longtask', buffered: false })
  const times: number[] = []
  await new Promise<void>((resolve) => {
    let index = 0
    let last = performance.now()
    const tick = (now: number) => {
      times.push(now - last)
      last = now
      step()
      index += 1
      if (index < frames) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
  observer.disconnect()
  const sorted = times.slice(5).sort((a, b) => a - b)
  return {
    p95: sorted[Math.floor(sorted.length * 0.95)]!,
    longest: Math.max(0, ...longTasks)
  }
}

const SCROLL_BOX = { height: 800, overflowY: 'auto' } as const
const RANGE_SHOWS = testShows(100_000)

function RangeScrolling() {
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  return (
    <div style={SCROLL_BOX} data-testid='scroller'>
      <RecordTable
        data={data}
        fields={showFields}
        columns={showColumns}
        rowCount={RANGE_SHOWS.length}
        getRowId={(row) => row.id}
        bulkActions={[{ label: 'Export', onAction: () => {} }]}
        defaultSelection={{ ids: ['show-0'] }}
        loadRange={({ start, end }) =>
          setData((current) =>
            placeRange(current, start, RANGE_SHOWS.slice(start, end))
          )
        }
      />
    </div>
  )
}

/** An app screen about 30,000 elements large, with the table in a Pane. */
function AppPage({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div style={{ width }}>
      <Navigator value='shows'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='shows'>Shows</Navigator.Item>
          <Navigator.Item value='orders'>Orders</Navigator.Item>
        </Navigator.Primary>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <div className='grid gap-4'>
            {children}
            {Array.from({ length: 2000 }, (_, index) => (
              <section key={index} className='grid gap-1'>
                <h3>Section {index}</h3>
                {Array.from({ length: 4 }, (_, line) => (
                  <p key={line}>
                    <span>Line</span> <b>{line}</b>
                  </p>
                ))}
              </section>
            ))}
          </div>
        </Pane>
      </Navigator>
    </div>
  )
}

async function styleCost(run: () => Promise<void> | void) {
  const before = await commands.renderMetrics()
  await run()
  await frame()
  await frame()
  const after = await commands.renderMetrics()
  return after.styleMs - before.styleMs
}

async function until(check: () => boolean) {
  const start = performance.now()
  while (!check()) {
    if (performance.now() - start > 5000)
      throw new Error('Timed out waiting for the panel')
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const panel = () => document.querySelector('[data-slot="records-options"]')
// The columns load on first open, so the panel is ready once they show.
const columnsShown = () =>
  document.querySelector('[data-slot="records-options"] [data-slot="list"]') !==
  null

async function clickToPaint(click: () => void, opened: () => boolean) {
  const start = performance.now()
  click()
  await until(opened)
  await new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0))
  )
  return performance.now() - start
}

describe('RecordTable performance', () => {
  it('opens and closes Configure table on a large app page in a few frames', async () => {
    const container = await mount(
      <AppPage width={1440}>
        <RecordTable
          caption='Shows'
          data={testShows(50)}
          fields={showFields}
          columns={showColumns}
          getRowId={(row) => row.id}
        />
      </AppPage>
    )
    const button = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Configure table"]'
    )!
    // As a page a moment after it loads, once Options has preloaded the columns.
    await RecordTableSettingsLazy.preload()
    await frame()
    let renders: Record<string, number> = {}
    let latency = 0
    const opening = await styleCost(async () => {
      renders = await countRenders(async () => {
        latency = await clickToPaint(() => button.click(), columnsShown)
      })
    })
    const closing = await styleCost(async () => {
      panel()!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await until(() => panel() === null)
    })
    expect(latency).toBeLessThanOrEqual(300)
    expect(opening).toBeLessThanOrEqual(150)
    expect(closing).toBeLessThanOrEqual(150)
    // Options rendering proves the counter is wired, so zero rows means zero.
    expect(renders['Records.Options']).toBeGreaterThan(0)
    expect(renders.RecordTableRow ?? 0).toBe(0)
  })
})

describe('RecordTable scrolling, CPU 4x', () => {
  const scroller = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-testid="scroller"]')!

  it('scrolls a page of 10,000 rows at 60fps', async () => {
    const container = await mount(
      <div style={SCROLL_BOX} data-testid='scroller'>
        <RecordTable
          data={testShows(10_000)}
          fields={showFields}
          columns={showColumns}
          defaultPosition={{ pageSize: 10_000 }}
        />
      </div>
    )
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })

  it('scrolls 100,000 rows loaded by range at 60fps', async () => {
    const container = await mount(<RangeScrolling />)
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(
      container.querySelectorAll('[data-slot="record-table-row"]').length
    ).toBeGreaterThan(0)
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })
})

const NARROW_BOX = { height: 800, width: 360, overflowY: 'auto' } as const
const narrowColumn = tableColumns<TestShow>(showFields)
const listColumns = [
  narrowColumn.field('show', { pin: true, narrow: 'title' }),
  narrowColumn.field('city', { narrow: 'description' }),
  narrowColumn.field('status', { narrow: 'trailing' }),
  narrowColumn.field('gross')
]
const cardColumns = [
  narrowColumn.field('show', { pin: true, narrow: 'title' }),
  narrowColumn.field('city', { narrow: 'description' }),
  narrowColumn.field('sold', { narrow: 'detail' }),
  narrowColumn.field('gross', { narrow: 'detail' })
]
const CARD_SHOWS = testShows(2000)

function RangeCards() {
  const [data, setData] = useState<(TestShow | undefined)[]>([])
  return (
    <div style={NARROW_BOX} data-testid='scroller'>
      <RecordTable
        caption='Shows'
        data={data}
        fields={showFields}
        columns={cardColumns}
        rowCount={CARD_SHOWS.length}
        getRowId={(row) => row.id}
        loadRange={({ start, end }) =>
          setData((current) =>
            placeRange(current, start, CARD_SHOWS.slice(start, end))
          )
        }
      />
    </div>
  )
}

const pressSelect = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent === 'Select')!
    .click()

describe('RecordTable narrow rows, CPU 4x', () => {
  const scroller = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-testid="scroller"]')!

  it('scrolls 10,000 records as list rows at 60fps', async () => {
    const container = await mount(
      <div style={NARROW_BOX} data-testid='scroller'>
        <RecordTable
          caption='Shows'
          data={testShows(10_000)}
          fields={showFields}
          columns={listColumns}
          getRowId={(row) => row.id}
          defaultPosition={{ pageSize: 10_000 }}
        />
      </div>
    )
    expect(
      container.querySelector('[data-slot="record-table-list-row"]')
    ).not.toBeNull()
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })

  it('scrolls 2,000 cards at 60fps', async () => {
    const container = await mount(
      <div style={NARROW_BOX} data-testid='scroller'>
        <RecordTable
          caption='Shows'
          data={CARD_SHOWS}
          fields={showFields}
          columns={cardColumns}
          getRowId={(row) => row.id}
          defaultPosition={{ pageSize: 2000 }}
        />
      </div>
    )
    expect(
      container.querySelector('[data-slot="record-table-card"]')
    ).not.toBeNull()
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })

  it('scrolls range-mode cards at 60fps', async () => {
    const container = await mount(<RangeCards />)
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(
      container.querySelectorAll('[data-slot="record-table-card"]').length
    ).toBeGreaterThan(0)
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })

  it('toggles one row within two frames in Select mode among 10,000 rows', async () => {
    const container = await mount(
      <div style={NARROW_BOX}>
        <RecordTable
          caption='Shows'
          data={testShows(10_000)}
          fields={showFields}
          columns={listColumns}
          getRowId={(row) => row.id}
          defaultPosition={{ pageSize: 10_000 }}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </div>
    )
    pressSelect(container)
    await frame()
    await frame()
    const checkbox = container.querySelector<HTMLElement>(
      '[data-slot="record-table-list-row"] [role="checkbox"]'
    )!
    const longTasks: number[] = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration)
    })
    observer.observe({ type: 'longtask', buffered: false })
    const start = performance.now()
    checkbox.click()
    await frame()
    const elapsed = performance.now() - start
    observer.disconnect()
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    expect(elapsed).toBeLessThanOrEqual(FRAME_BUDGET * 2)
    expect(Math.max(0, ...longTasks)).toBeLessThanOrEqual(50)
  })

  it('scrolls list rows under the translucent bulk bar at 60fps', async () => {
    const container = await mount(
      <div style={NARROW_BOX} data-testid='scroller'>
        <RecordTable
          caption='Shows'
          data={testShows(10_000)}
          fields={showFields}
          columns={listColumns}
          getRowId={(row) => row.id}
          defaultPosition={{ pageSize: 10_000 }}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </div>
    )
    pressSelect(container)
    await frame()
    await frame()
    container
      .querySelector<HTMLElement>(
        '[data-slot="record-table-list-row"] [role="checkbox"]'
      )!
      .click()
    await frame()
    await frame()
    const bar = container.querySelector<HTMLElement>(
      '[data-slot="records-bulk-actions"]'
    )
    expect(bar).not.toBeNull()
    expect(getComputedStyle(bar!).backdropFilter).not.toBe('none')
    const box = scroller(container)
    const result = await measureFrames(() => {
      box.scrollTop += 60
    })
    expect(result.p95).toBeLessThanOrEqual(FRAME_BUDGET)
    expect(result.longest).toBeLessThanOrEqual(50)
  })

  it('ticks a narrow row on a large app page without restyling it', async () => {
    const container = await mount(
      <AppPage width={560}>
        <RecordTable
          caption='Shows'
          data={testShows(50)}
          fields={showFields}
          columns={listColumns}
          getRowId={(row) => row.id}
          bulkActions={[{ label: 'Export', onAction: () => {} }]}
        />
      </AppPage>
    )
    pressSelect(container)
    await frame()
    await frame()
    const checkbox = container.querySelector<HTMLElement>(
      '[data-slot="record-table-list-row"] [role="checkbox"]'
    )!
    const cost = await styleCost(() => checkbox.click())
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    expect(cost).toBeLessThanOrEqual(100)
  })

  it('hovers narrow rows on a large app page without restyling it', async () => {
    const container = await mount(
      <AppPage width={560}>
        <RecordTable
          caption='Shows'
          data={testShows(50)}
          fields={showFields}
          columns={listColumns}
          getRowId={(row) => row.id}
          getRowHref={(row) => `/shows/${row.id}`}
        />
      </AppPage>
    )
    const rows = [
      ...container.querySelectorAll<HTMLElement>(
        '[data-slot="record-table-list-row"]'
      )
    ].slice(0, 8)
    await userEvent.hover(rows[0]!)
    const cost = await styleCost(async () => {
      for (const row of rows.slice(1)) await userEvent.hover(row)
    })
    expect(cost / (rows.length - 1)).toBeLessThanOrEqual(20)
  })
})
