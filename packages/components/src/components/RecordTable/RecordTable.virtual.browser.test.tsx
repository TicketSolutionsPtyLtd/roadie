import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { nudgeFrames } from '../../css/testUtils'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { findScrollParent } from '../Records/scrollParent'
import { showFields, testShows } from '../Records/testUtils'
import { ROW_PX, showColumns } from './testUtils'

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

// Linux WebKit runs no frames while a test sits idle, so each poll wakes them.
// CI's runners take seconds to scroll through a few ranges, so polls wait longer.
const framed = <T,>(read: () => T) =>
  expect.poll(
    async () => {
      await nudgeFrames()
      return read()
    },
    { timeout: 8000 }
  )

const rows = (container: HTMLElement) =>
  container.querySelectorAll<HTMLElement>('[data-slot="record-table-row"]')

describe('RecordTable virtualised rows', { timeout: 30_000 }, () => {
  it('renders only the rows near the screen of a 10,000 row page in a pane', async () => {
    const { container } = render(
      <div style={{ height: 600, display: 'grid' }}>
        <Pane>
          <Pane.Header>
            <Pane.Title>Shows</Pane.Title>
          </Pane.Header>
          <Pane.Body>
            <RecordTable
              caption='Shows'
              data={testShows(10_000)}
              fields={showFields}
              columns={showColumns}
              defaultPosition={{ pageSize: 10_000 }}
            />
          </Pane.Body>
        </Pane>
      </div>
    )
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    // Re-assigned each poll: the first assignment can clamp to a stale height.
    await framed(() => {
      viewport.scrollTop = viewport.scrollHeight
      return container.textContent?.includes('angie McMahon 1667')
    }).toBe(true)
    expect(rows(container).length).toBeLessThan(80)
    expect(container.querySelector('[role="table"]')).toHaveAttribute(
      'aria-rowcount',
      '10001'
    )
    expect(rows(container).item(rows(container).length - 1)).toHaveAttribute(
      'aria-rowindex',
      '10001'
    )
  })

  it('virtualises against the window when nothing else scrolls', async () => {
    const shows = testShows(300)
    const target = shows[199]!.show
    const { container } = render(
      <div>
        <div style={{ height: 1500 }} />
        <RecordTable
          caption='Shows'
          data={shows}
          fields={showFields}
          columns={showColumns}
          defaultPosition={{ pageSize: 300 }}
        />
      </div>
    )
    const content = container.querySelector<HTMLElement>(
      '[data-slot="record-table-content"]'
    )!
    await framed(() => {
      const documentTop = content.getBoundingClientRect().top + window.scrollY
      window.scrollTo(0, documentTop + 199 * ROW_PX)
      return container.textContent?.includes(target)
    }).toBe(true)
    expect(rows(container).length).toBeLessThan(80)
  })

  it('sizes the window to rows at a larger root font size', async () => {
    const root = document.documentElement
    root.style.fontSize = '20px'
    try {
      const { container } = render(
        <div data-testid='box' style={{ height: 600, overflowY: 'auto' }}>
          <RecordTable
            caption='Shows'
            data={testShows(1000)}
            fields={showFields}
            columns={showColumns}
            defaultPosition={{ pageSize: 1000 }}
          />
        </div>
      )
      const box = container.querySelector<HTMLElement>('[data-testid="box"]')!
      const body = container.querySelector<HTMLElement>(
        '[data-slot="record-table-body"]'
      )!
      await framed(() => body.getBoundingClientRect().height).toBe(1000 * 60)
      await framed(() => {
        box.scrollTop = body.offsetTop + 500 * 60
        const row = container.querySelector(
          '[data-slot="record-table-row"][aria-rowindex="502"]'
        )
        if (!row) return null
        return Math.round(
          row.getBoundingClientRect().top - body.getBoundingClientRect().top
        )
      }).toBe(500 * 60)
    } finally {
      root.style.fontSize = ''
    }
  })

  it('keeps every row of a page of 100 in the table', () => {
    const { container } = render(
      <RecordTable
        caption='Shows'
        data={testShows(100)}
        fields={showFields}
        columns={showColumns}
        defaultPosition={{ pageSize: 100 }}
      />
    )
    expect(rows(container)).toHaveLength(100)
    expect(container.querySelector('[role="table"]')).not.toHaveAttribute(
      'aria-rowcount'
    )
  })
})

describe('RecordTable focus in a window of rows', { timeout: 30_000 }, () => {
  it.each([
    ['scrolling with the page', undefined, 'record-table-scroller'],
    ['in its own box', '24rem', 'record-table-viewport']
  ] as const)(
    'hands focus to the table when the focused row scrolls away (%s)',
    async (_, maxHeight, target) => {
      const { container } = render(
        <div data-testid='box' style={{ height: 600, overflowY: 'auto' }}>
          <RecordTable
            caption='Shows'
            data={testShows(300)}
            fields={showFields}
            columns={showColumns}
            getRowId={(row) => row.id}
            bulkActions={[{ label: 'Archive', onAction: () => {} }]}
            defaultPosition={{ pageSize: 300 }}
            maxHeight={maxHeight}
          />
        </div>
      )
      await framed(() =>
        container.querySelector<HTMLElement>(
          '[data-row-id="show-4"] [role="checkbox"], [data-row-id="show-4"] input'
        )
      ).not.toBeNull()
      container
        .querySelector<HTMLElement>(
          '[data-row-id="show-4"] [role="checkbox"], [data-row-id="show-4"] input'
        )!
        .focus()
      const scroller =
        maxHeight === undefined
          ? container.querySelector<HTMLElement>('[data-testid="box"]')!
          : container.querySelector<HTMLElement>(
              '[data-slot="record-table-viewport"]'
            )!
      await framed(() => {
        scroller.scrollTop = 200 * ROW_PX
        return container.querySelector('[data-row-id="show-4"]')
      }).toBeNull()
      expect(document.activeElement).toBe(
        container.querySelector(`[data-slot="${target}"]`)
      )
    }
  )
})

describe('findScrollParent', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns the nearest ancestor with vertical overflow', () => {
    const parent = document.createElement('div')
    parent.style.overflowY = 'auto'
    const middle = document.createElement('div')
    const child = document.createElement('div')
    middle.append(child)
    parent.append(middle)
    document.body.append(parent)
    expect(findScrollParent(child)).toBe(parent)
  })

  it('returns null when no ancestor scrolls', () => {
    const parent = document.createElement('div')
    const child = document.createElement('div')
    parent.append(child)
    document.body.append(parent)
    expect(findScrollParent(child)).toBeNull()
  })
})
