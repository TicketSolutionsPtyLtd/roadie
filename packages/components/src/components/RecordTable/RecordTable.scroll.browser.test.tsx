import { useEffect, useState } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import type { RecordView } from '@oztix/roadie-core/records'

import { RecordTable, tableLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Navigator } from '../Navigator'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { Records, useRecords } from '../Records'
import { showFields, testShows } from '../Records/testUtils'
import {
  ALL,
  WIDE_BOX,
  WIDE_PANE,
  frame,
  rect,
  slot,
  wideColumns
} from './testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

/** Elements other than `except` that scroll sideways natively. */
function sidewaysScrollers(root: HTMLElement, except: HTMLElement[]) {
  return [...root.querySelectorAll<HTMLElement>('*')].filter(
    (element) =>
      !except.includes(element) &&
      ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)
  )
}

/** The first row whose top is below the header, as a stand-in for "on screen". */
function rowBelow(container: HTMLElement, top: number) {
  return [
    ...container.querySelectorAll<HTMLElement>('[data-slot="record-table-row"]')
  ].find((row) => rect(row).top >= top)!
}

function expectAligned(container: HTMLElement, row: HTMLElement) {
  const headers = container.querySelectorAll('[role="columnheader"]')
  const cells = row.querySelectorAll('[role="cell"]')
  for (const index of [0, 3])
    expect(
      Math.abs(rect(headers[index]!).left - rect(cells[index]!).left)
    ).toBeLessThanOrEqual(1)
}

const boxed = (
  <div style={{ width: WIDE_BOX }}>
    <RecordTable
      caption='Shows'
      data={testShows(100)}
      fields={showFields}
      columns={wideColumns}
      defaultPosition={ALL}
      maxHeight='20rem'
    />
  </div>
)

describe('RecordTable maxHeight scrolls both ways in one box', () => {
  it('scrolls one viewport down and sideways, keeping the header and pinned column put', async () => {
    const { container } = render(boxed)
    const viewport = slot(container, 'record-table-viewport')
    await expect
      .poll(() => {
        viewport.scrollTop = 3000
        viewport.scrollLeft = 200
        return viewport.scrollTop > 0 && viewport.scrollLeft > 0
      })
      .toBe(true)
    await frame()
    const box = rect(viewport)
    const head = slot(container, 'record-table-head')
    expect(Math.abs(rect(head).top - box.top)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(rect(head.querySelector('[data-pin]')!).left - box.left)
    ).toBeLessThanOrEqual(1)
    const row = rowBelow(container, rect(head).bottom)
    expect(
      Math.abs(rect(row.querySelector('[data-pin]')!).left - box.left)
    ).toBeLessThanOrEqual(1)
    expectAligned(container, row)
  })

  it('leaves no native sideways scroller inside the box', async () => {
    const { container } = render(boxed)
    await frame()
    expect(
      sidewaysScrollers(slot(container, 'record-table-box'), [
        slot(container, 'record-table-viewport')
      ])
    ).toEqual([])
  })

  it('draws a horizontal Roadie scrollbar along the bottom of the box', async () => {
    const { container } = render(boxed)
    await expect
      .poll(() => slot(container, 'record-table-scrollbar-x'))
      .not.toBeNull()
    const bar = slot(container, 'record-table-scrollbar-x')
    expect(bar.dataset.orientation).toBe('horizontal')
    expect(
      Math.abs(
        rect(bar).bottom - rect(slot(container, 'record-table-viewport')).bottom
      )
    ).toBeLessThan(4)
  })

  it('names the box, the one tab stop, as a region that scrolls', async () => {
    const { container } = render(boxed)
    const region = screen.getByRole('region', { name: 'Shows, scrolls' })
    expect(region).toBe(slot(container, 'record-table-viewport'))
    await expect.poll(() => region.tabIndex).toBe(0)
  })

  it('shows the horizontal scrollbar once a shown column makes the table overflow', async () => {
    const hidden: RecordView = {
      query: { search: '', filters: [], sort: [] },
      layout: { type: 'table', columns: { hidden: ['sold', 'gross'] } }
    }
    const shown: RecordView = { ...hidden, layout: { type: 'table' } }
    const table = (view: RecordView) => (
      <div style={{ width: WIDE_BOX }}>
        <RecordTable
          caption='Shows'
          data={testShows(100)}
          fields={showFields}
          columns={wideColumns}
          defaultPosition={ALL}
          view={view}
          maxHeight='20rem'
        />
      </div>
    )
    const { container, rerender } = render(table(hidden))
    const viewport = slot(container, 'record-table-viewport')
    await frame()
    expect(viewport.scrollWidth - viewport.clientWidth).toBeLessThanOrEqual(1)
    expect(slot(container, 'record-table-scrollbar-x')).toBeNull()
    rerender(table(shown))
    await expect
      .poll(() =>
        slot(container, 'record-table-scrollbar-x')?.hasAttribute(
          'data-has-overflow-x'
        )
      )
      .toBe(true)
  })
})

describe('RecordTable in a scrolling pane scrolls sideways with a Roadie scrollbar', () => {
  function renderInPane(footer = false) {
    return render(
      <div style={{ height: 600, width: WIDE_PANE, display: 'grid' }}>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <RecordTable
              caption='Shows'
              data={testShows(100)}
              fields={showFields}
              columns={wideColumns}
              defaultPosition={ALL}
            />
          </Pane.Body>
          {footer && (
            <Pane.Footer>
              <p>Footer</p>
            </Pane.Footer>
          )}
        </Pane>
      </div>
    )
  }

  it('sticks the horizontal scrollbar to the bottom of the pane mid-table', async () => {
    const { container } = renderInPane()
    const pane = slot(container, 'pane-viewport')
    pane.scrollTop = 1500
    await expect
      .poll(() => slot(container, 'record-table-scrollbar-x'))
      .not.toBeNull()
    const bar = slot(container, 'record-table-scrollbar-x')
    expect(bar.dataset.orientation).toBe('horizontal')
    await expect
      .poll(() => Math.abs(rect(bar).bottom - rect(pane).bottom))
      .toBeLessThan(4)
  })

  it('sticks the horizontal scrollbar above a pane footer', async () => {
    const { container } = renderInPane(true)
    slot(container, 'pane-viewport').scrollTop = 1500
    await expect
      .poll(() => slot(container, 'record-table-scrollbar-x'))
      .not.toBeNull()
    await expect
      .poll(() =>
        Math.abs(
          rect(slot(container, 'record-table-scrollbar-x')).bottom -
            rect(slot(container, 'pane-footer')).top
        )
      )
      .toBeLessThan(4)
  })

  it('keeps the header with the rows, and the pane the only vertical scroller', async () => {
    const { container } = renderInPane()
    slot(container, 'pane-viewport').scrollTop = 1500
    const scroller = slot(container, 'record-table-scroller')
    scroller.scrollLeft = 200
    scroller.dispatchEvent(new Event('scroll'))
    await frame()
    expect(scroller.scrollLeft).toBeGreaterThan(0)
    const head = slot(container, 'record-table-head')
    expect(
      Math.abs(rect(head).top - rect(slot(container, 'records-toolbar')).bottom)
    ).toBeLessThanOrEqual(1)
    expectAligned(container, rowBelow(container, rect(head).bottom))
    expect(scroller.scrollHeight - scroller.clientHeight).toBeLessThanOrEqual(1)
  })

  it('keeps the sideways region focusable with its name', () => {
    renderInPane()
    const region = screen.getByRole('region', {
      name: 'Shows, scrolls sideways'
    })
    const scroller = region.querySelector<HTMLElement>(
      '[data-slot="record-table-scroller"]'
    )!
    expect(scroller.tabIndex).toBe(0)
    expect(['auto', 'scroll']).toContain(getComputedStyle(scroller).overflowX)
  })
})

describe('RecordTable sideways scrollbar, more', () => {
  it('shows no native scrollbar on the sideways scroller', async () => {
    const { container } = render(
      <div style={{ width: WIDE_BOX }}>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={wideColumns}
        />
      </div>
    )
    await frame()
    const scroller = slot(container, 'record-table-scroller')
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    expect(scroller.offsetHeight - scroller.clientHeight).toBe(0)
  })

  function LateFooter() {
    const [loaded, setLoaded] = useState(false)
    useEffect(() => {
      const timer = setTimeout(() => setLoaded(true), 50)
      return () => clearTimeout(timer)
    }, [])
    return (
      <Pane>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>
          <RecordTable
            caption='Shows'
            data={loaded ? testShows(100) : []}
            fields={showFields}
            columns={wideColumns}
            defaultPosition={ALL}
          />
        </Pane.Body>
        {loaded && (
          <Pane.Footer>
            <p>100 shows</p>
          </Pane.Footer>
        )}
      </Pane>
    )
  }

  it('clears a pane footer that mounts after the data arrives', async () => {
    const { container } = render(
      <div style={{ height: 600, width: WIDE_PANE, display: 'grid' }}>
        <LateFooter />
      </div>
    )
    await expect.poll(() => slot(container, 'pane-footer')).not.toBeNull()
    slot(container, 'pane-viewport').scrollTop = 1500
    await expect
      .poll(() => slot(container, 'record-table-scrollbar-x'))
      .not.toBeNull()
    await expect
      .poll(() =>
        Math.abs(
          rect(slot(container, 'record-table-scrollbar-x')).bottom -
            rect(slot(container, 'pane-footer')).top
        )
      )
      .toBeLessThan(4)
  })

  it('sits above a Navigator tab bar with a fine pointer', async () => {
    await page.viewport(720, 844)
    try {
      const { container } = render(
        <div style={{ height: 844, display: 'grid' }}>
          <Navigator value='shows'>
            <Navigator.Primary aria-label='Primary'>
              <Navigator.Item value='shows'>Shows</Navigator.Item>
              <Navigator.Item value='orders'>Orders</Navigator.Item>
            </Navigator.Primary>
            <Pane column='list' tabBar='visible'>
              <RecordTable
                caption='Shows'
                data={testShows(100)}
                fields={showFields}
                columns={wideColumns}
                defaultPosition={ALL}
              />
            </Pane>
          </Navigator>
        </div>
      )
      await expect
        .poll(() => slot(container, 'record-table-head'))
        .not.toBeNull()
      expect(matchMedia('(pointer: fine)').matches).toBe(true)
      slot(container, 'pane-viewport').scrollTop = 1500
      await expect
        .poll(() => slot(container, 'record-table-scrollbar-x'))
        .not.toBeNull()
      const tabs = container.querySelector<HTMLElement>(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )!
      // Above the tab bar, and only just: the pane's padding already clears it for sticky parts.
      await expect
        .poll(() => {
          const gap =
            rect(tabs).top -
            rect(slot(container, 'record-table-scrollbar-x')).bottom
          return gap >= 0 && gap < 24
        })
        .toBe(true)
    } finally {
      await page.viewport(1920, 1080)
    }
  })
})

describe('RecordTable fill', () => {
  it('fills a pane body and scrolls both ways inside the table box', async () => {
    const { container } = render(
      <div style={{ height: 600, width: WIDE_PANE, display: 'grid' }}>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <RecordTable
              caption='Shows'
              data={testShows(100)}
              fields={showFields}
              columns={wideColumns}
              defaultPosition={ALL}
              fill
            />
          </Pane.Body>
        </Pane>
      </div>
    )
    const pane = slot(container, 'pane-viewport')
    const viewport = slot(container, 'record-table-viewport')
    await frame()
    expect(pane.scrollHeight - pane.clientHeight).toBeLessThanOrEqual(1)
    expect(rect(viewport).height).toBeGreaterThan(200)
    expect(rect(viewport).bottom).toBeLessThanOrEqual(rect(pane).bottom + 1)
    await expect
      .poll(() => {
        viewport.scrollTop = 3000
        viewport.scrollLeft = 200
        return viewport.scrollTop > 0 && viewport.scrollLeft > 0
      })
      .toBe(true)
    await frame()
    expect(
      Math.abs(
        rect(slot(container, 'record-table-head')).top - rect(viewport).top
      )
    ).toBeLessThanOrEqual(1)
  })

  it('fills a parent of definite height', async () => {
    const { container } = render(
      <div style={{ height: 500, width: WIDE_BOX }}>
        <RecordTable
          data={testShows(100)}
          fields={showFields}
          columns={wideColumns}
          defaultPosition={ALL}
          fill
        />
      </div>
    )
    await frame()
    const root = slot(container, 'records')
    const viewport = slot(container, 'record-table-viewport')
    expect(Math.abs(rect(root).height - 500)).toBeLessThanOrEqual(1)
    expect(rect(viewport).bottom).toBeLessThanOrEqual(rect(root).bottom + 1)
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
  })

  const layouts = [tableLayout(wideColumns)]

  function ProviderFill() {
    const records = useRecords({
      data: testShows(100),
      fields: showFields,
      defaultPosition: ALL
    })
    return (
      <Records.Provider records={records} layouts={layouts} caption='Shows'>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <Records.Content fill />
            <Records.Status />
          </Pane.Body>
        </Pane>
      </Records.Provider>
    )
  }

  function RootFill() {
    const records = useRecords({
      data: testShows(100),
      fields: showFields,
      defaultPosition: ALL
    })
    return (
      <Pane>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>
          <Records.Root records={records} layouts={layouts} caption='Shows'>
            <Records.Toolbar />
            <Records.Content fill />
            <Records.Pagination />
          </Records.Root>
        </Pane.Body>
      </Pane>
    )
  }

  for (const [name, Fill] of [
    ['a Provider, Content directly in Pane.Body', ProviderFill],
    ['Records.Root', RootFill]
  ] as const) {
    it(`fills a pane body composed with ${name}`, async () => {
      const { container } = render(
        <div style={{ height: 600, width: WIDE_PANE, display: 'grid' }}>
          <Fill />
        </div>
      )
      const pane = slot(container, 'pane-viewport')
      const viewport = slot(container, 'record-table-viewport')
      await expect
        .poll(() => pane.scrollHeight - pane.clientHeight)
        .toBeLessThanOrEqual(1)
      expect(rect(viewport).height).toBeGreaterThan(200)
      expect(rect(viewport).bottom).toBeLessThanOrEqual(rect(pane).bottom + 1)
      expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    })
  }
})

describe('Records spread across a pane by a Provider', () => {
  const layouts = [tableLayout(wideColumns)]

  function ProviderPane() {
    const records = useRecords({
      data: testShows(100),
      fields: showFields,
      defaultPosition: ALL
    })
    return (
      <Records.Provider records={records} layouts={layouts} caption='Shows'>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <Records.Toolbar />
            <Records.Content />
          </Pane.Body>
          <Pane.Footer>
            <Records.Pagination />
          </Pane.Footer>
        </Pane>
      </Records.Provider>
    )
  }

  it('keeps the header under the toolbar, at rest and stuck', async () => {
    const { container } = render(
      <div style={{ height: 600, width: WIDE_PANE, display: 'grid' }}>
        <ProviderPane />
      </div>
    )
    await frame()
    const toolbar = () => rect(slot(container, 'records-toolbar'))
    const head = () => rect(slot(container, 'record-table-head'))
    expect(head().top).toBeGreaterThanOrEqual(toolbar().bottom - 0.5)
    const pane = slot(container, 'pane-viewport')
    await expect
      .poll(() => {
        pane.scrollTop = 1500
        return Math.abs(head().top - toolbar().bottom)
      })
      .toBeLessThanOrEqual(1)
    expect(
      getComputedStyle(slot(container, 'record-table-head')).backgroundColor
    ).toBe(getComputedStyle(slot(container, 'pane')).backgroundColor)
  })
})
