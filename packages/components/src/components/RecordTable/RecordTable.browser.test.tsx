import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RecordTable } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { Pane } from '../Pane'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { showFields, testShows } from '../Records/testUtils'
import { tableColumns } from './columns'
import {
  ALL,
  WIDE_BOX,
  frame,
  rect,
  showColumns,
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

function InPane({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: 600, display: 'grid' }}>
      <Pane>
        <Pane.Header>
          <Pane.Title>Shows</Pane.Title>
        </Pane.Header>
        <Pane.Body>{children}</Pane.Body>
      </Pane>
    </div>
  )
}

const scrollSideways = async (container: HTMLElement) => {
  const scroller = slot(container, 'record-table-scroller')
  scroller.scrollLeft = 200
  scroller.dispatchEvent(new Event('scroll'))
  await frame()
  expect(scroller.scrollLeft).toBeGreaterThan(0)
  return scroller
}

describe('RecordTable in a pane', () => {
  it('sticks the toolbar and header to their own scroll box inside a pane', async () => {
    const { container } = render(
      <InPane>
        <div data-testid='box' style={{ height: 300, overflowY: 'auto' }}>
          <RecordTable
            data={testShows(100)}
            fields={showFields}
            columns={showColumns}
            defaultPosition={ALL}
          />
        </div>
      </InPane>
    )
    const box = container.querySelector<HTMLElement>('[data-testid="box"]')!
    await expect
      .poll(() => {
        box.scrollTop = 2000
        const toolbar = rect(slot(container, 'records-toolbar'))
        const head = rect(slot(container, 'record-table-head'))
        return Math.max(
          Math.abs(toolbar.top - rect(box).top),
          Math.abs(head.top - toolbar.bottom)
        )
      })
      .toBeLessThanOrEqual(1)
  })

  it('sticks the toolbar under the pane header and the header under the toolbar', async () => {
    const { container } = render(
      <InPane>
        <RecordTable
          data={testShows(100)}
          fields={showFields}
          columns={showColumns}
          defaultPosition={ALL}
        />
      </InPane>
    )
    const viewport = slot(container, 'pane-viewport')
    await expect
      .poll(() => {
        viewport.scrollTop = 4000
        const pane = rect(slot(container, 'pane-header'))
        const toolbar = rect(slot(container, 'records-toolbar'))
        const head = rect(slot(container, 'record-table-head'))
        return Math.max(
          Math.abs(toolbar.top - pane.bottom),
          Math.abs(head.top - toolbar.bottom)
        )
      })
      .toBeLessThanOrEqual(1)
  })

  it('keeps the header off the first row inside a clipped box in a pane', async () => {
    const { container } = render(
      <InPane>
        <div style={{ overflow: 'hidden' }}>
          <RecordTable
            data={testShows(20)}
            fields={showFields}
            columns={showColumns}
          />
        </div>
      </InPane>
    )
    await expect
      .poll(
        () =>
          rect(slot(container, 'record-table-row')).top -
          rect(slot(container, 'record-table-head')).bottom
      )
      .toBeGreaterThanOrEqual(-0.5)
  })
})

describe('RecordTable columns', () => {
  it('keeps header and cells aligned when scrolled sideways', async () => {
    const { container } = render(
      <div style={{ width: WIDE_BOX }}>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={wideColumns}
        />
      </div>
    )
    await scrollSideways(container)
    const headers = container.querySelectorAll('[role="columnheader"]')
    const cells = slot(container, 'record-table-row').querySelectorAll(
      '[role="cell"]'
    )
    for (const index of [0, 3])
      expect(
        Math.abs(rect(headers[index]!).left - rect(cells[index]!).left)
      ).toBeLessThanOrEqual(1)
  })

  it('keeps two pinned columns at their offsets above the other cells', async () => {
    const column =
      tableColumns<ReturnType<typeof testShows>[number]>(showFields)
    const { container } = render(
      <div style={{ width: WIDE_BOX }}>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={[
            column.field('show', { pin: true, width: { min: 12 } }),
            column.field('city', { pin: true, width: { min: 12 } }),
            ...wideColumns.slice(2)
          ]}
        />
      </div>
    )
    const [first, second] = slot(
      container,
      'record-table-row'
    ).querySelectorAll<HTMLElement>('[data-pin]')
    const scroller = slot(container, 'record-table-scroller')
    const left = rect(scroller).left
    const firstWidth = rect(first!).width
    await scrollSideways(container)
    expect(Math.abs(rect(first!).left - left)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(rect(second!).left - (left + firstWidth))
    ).toBeLessThanOrEqual(1)
    for (const cell of container.querySelectorAll('[data-pin]'))
      expect(getComputedStyle(cell).zIndex).toBe('10')
  })

  it.each([
    ['16px', 48],
    ['20px', 60]
  ])(
    'keeps a long title on one line inside a row, at a %s root %ipx tall',
    async (rootSize, height) => {
      document.documentElement.style.fontSize = rootSize
      try {
        const shows = testShows(3)
        shows[0]!.show = 'Ocean Alley and friends '.repeat(8)
        const { container } = render(
          // In rem, so the larger root stays wide.
          <div style={{ width: `${WIDE_BOX / 16}rem` }}>
            <RecordTable
              data={shows}
              fields={showFields}
              columns={showColumns}
            />
          </div>
        )
        await frame()
        const [row, next] = container.querySelectorAll<HTMLElement>(
          '[data-slot="record-table-row"]'
        )
        expect(rect(row!).height).toBe(height)
        const title = row!.querySelector('[role="cell"] > span')!
        expect(rect(title).bottom).toBeLessThanOrEqual(rect(next!).top)
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
      } finally {
        document.documentElement.style.fontSize = ''
      }
    }
  )

  it('right-aligns figures under their header', async () => {
    const { container } = render(
      <div style={{ width: 900 }}>
        <RecordTable
          data={testShows(3)}
          fields={showFields}
          columns={showColumns}
        />
      </div>
    )
    await frame()
    const header = container.querySelectorAll('[role="columnheader"]')[2]!
    const cell = slot(container, 'record-table-row').querySelectorAll(
      '[role="cell"]'
    )[2]!
    const sortButton = header.querySelector('button')!
    expect(
      Math.abs(rect(sortButton).right - rect(cell.firstElementChild!).right)
    ).toBeLessThanOrEqual(1)
  })
})

describe('RecordTable cells', () => {
  it('clip with room for a focus ring where the engine can', () => {
    const { container } = render(
      <RecordTable
        data={testShows(2)}
        fields={showFields}
        columns={showColumns}
      />
    )
    const style = getComputedStyle(
      slot(container, 'record-table-row').querySelector('[role="cell"]')!
    )
    if (CSS.supports('overflow-clip-margin', '0.25rem')) {
      expect(style.overflowX).toBe('clip')
      expect(style.overflowClipMargin).not.toBe('0px')
    } else expect(style.overflowX).toBe('visible')
  })
})

describe('RecordTable sticky chrome', () => {
  it('scrolls its own box with the scrollbar under the header', async () => {
    const { container } = render(
      <RecordTable
        caption='Shows'
        data={testShows(100)}
        fields={showFields}
        columns={showColumns}
        defaultPosition={ALL}
        maxHeight='20rem'
      />
    )
    const viewport = slot(container, 'record-table-viewport')
    expect(rect(viewport).height).toBeLessThanOrEqual(320)
    await expect
      .poll(() => {
        viewport.scrollTop = 4000
        return Math.abs(
          rect(slot(container, 'record-table-head')).top - rect(viewport).top
        )
      })
      .toBeLessThanOrEqual(1)
    expect(
      rect(slot(container, 'record-table-scrollbar')).top
    ).toBeGreaterThanOrEqual(
      rect(slot(container, 'record-table-head')).bottom - 1
    )
    expect(rect(slot(container, 'records-toolbar')).bottom).toBeLessThanOrEqual(
      rect(viewport).top
    )
  })
})

describe('RecordTable surface', () => {
  const bg = (container: HTMLElement, name: string) =>
    getComputedStyle(slot(container, name)).backgroundColor

  it('paints sticky parts with the surface behind the table, not an outer pane', async () => {
    const { container } = render(
      <InPane>
        <div data-testid='card' className='bg-sunken'>
          <RecordTable
            data={testShows(20)}
            fields={showFields}
            columns={showColumns}
          />
        </div>
      </InPane>
    )
    const card = getComputedStyle(
      container.querySelector('[data-testid="card"]')!
    ).backgroundColor
    await expect.poll(() => bg(container, 'record-table-head')).toBe(card)
    expect(bg(container, 'records-toolbar')).toBe(card)
  })

  it('paints pinned body cells with the same surface', async () => {
    const { container } = render(
      <div data-testid='card' className='bg-sunken'>
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      </div>
    )
    const card = getComputedStyle(
      container.querySelector('[data-testid="card"]')!
    ).backgroundColor
    const pinned = slot(container, 'record-table-row').querySelector(
      '[data-pin]'
    )!
    await expect.poll(() => getComputedStyle(pinned).backgroundColor).toBe(card)
  })

  it('keeps the surface when the table moves into its own box', async () => {
    const table = (maxHeight?: string) => (
      <div data-testid='card' className='bg-sunken'>
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
          maxHeight={maxHeight}
        />
      </div>
    )
    const { container, rerender } = render(table())
    rerender(table('20rem'))
    const card = getComputedStyle(
      container.querySelector('[data-testid="card"]')!
    ).backgroundColor
    await expect.poll(() => bg(container, 'record-table-head')).toBe(card)
  })

  it('follows a surface that changes behind it', async () => {
    const { container } = render(
      <div data-testid='card' className='bg-sunken'>
        <RecordTable
          data={testShows(5)}
          fields={showFields}
          columns={showColumns}
        />
      </div>
    )
    const card = container.querySelector<HTMLElement>('[data-testid="card"]')!
    await expect
      .poll(() => bg(container, 'record-table-head'))
      .toBe(getComputedStyle(card).backgroundColor)
    card.className = 'bg-raised'
    await expect
      .poll(() => bg(container, 'record-table-head'))
      .toBe(getComputedStyle(card).backgroundColor)
  })

  it('follows the theme when it switches', async () => {
    const { container } = render(
      <div data-testid='card' className='bg-sunken'>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={showColumns}
        />
      </div>
    )
    const card = () =>
      getComputedStyle(container.querySelector('[data-testid="card"]')!)
        .backgroundColor
    const light = card()
    document.documentElement.classList.add('dark')
    try {
      await expect.poll(() => card()).not.toBe(light)
      await expect.poll(() => bg(container, 'record-table-head')).toBe(card())
    } finally {
      document.documentElement.classList.remove('dark')
    }
  })

  it('uses the pane surface when the pane is behind it', async () => {
    const { container } = render(
      <InPane>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={showColumns}
        />
      </InPane>
    )
    const pane = getComputedStyle(slot(container, 'pane')).backgroundColor
    await expect.poll(() => bg(container, 'record-table-head')).toBe(pane)
  })

  it('looks past a translucent fill to an opaque one', async () => {
    const { container } = render(
      <InPane>
        <div style={{ backgroundColor: 'rgb(255 0 0 / 0.5)' }}>
          <RecordTable
            data={testShows(20)}
            fields={showFields}
            columns={showColumns}
          />
        </div>
      </InPane>
    )
    const pane = getComputedStyle(slot(container, 'pane')).backgroundColor
    await expect.poll(() => bg(container, 'record-table-head')).toBe(pane)
  })

  it('keeps a surface the consumer sets', async () => {
    const { container } = render(
      <div className='bg-raised [--records-surface:var(--intent-bg-raised)]'>
        <RecordTable
          data={testShows(20)}
          fields={showFields}
          columns={showColumns}
        />
      </div>
    )
    const raised = getComputedStyle(
      container.firstElementChild!
    ).backgroundColor
    await expect.poll(() => bg(container, 'record-table-head')).toBe(raised)
  })
})

describe('RecordTable loading', () => {
  it('keeps row height and runs the bar along the header bottom edge', async () => {
    const shows = testShows(5)
    const { container, rerender } = render(
      <RecordTable data={shows} fields={showFields} columns={showColumns} />
    )
    await frame()
    const rowHeight = () => rect(slot(container, 'record-table-row')).height
    expect(rowHeight()).toBe(48)
    rerender(
      <RecordTable
        data={shows}
        fields={showFields}
        columns={showColumns}
        loading
      />
    )
    await frame()
    expect(rowHeight()).toBe(48)
    const head = rect(slot(container, 'record-table-head'))
    const bar = rect(slot(container, 'record-table-progress'))
    expect(bar.height).toBeGreaterThan(0)
    expect(bar.height).toBeLessThanOrEqual(4)
    expect(Math.round(bar.bottom)).toBe(Math.round(head.bottom))
  })
})

describe('RecordTable states', () => {
  it('centres the empty state in the visible width of a table that scrolls sideways', async () => {
    const { container } = render(
      <div style={{ width: 360 }}>
        <RecordTable
          caption='Shows'
          data={[]}
          fields={showFields}
          columns={wideColumns}
        />
      </div>
    )
    await frame()
    const frameBox = rect(slot(container, 'record-table-frame'))
    const title = rect(slot(container, 'empty-state-title'))
    const middle = (box: DOMRect) => box.left + box.width / 2
    expect(Math.abs(middle(title) - middle(frameBox))).toBeLessThanOrEqual(1)
  })
})

describe('RecordTable status badges', () => {
  it('ends a long label with an ellipsis in a narrow column', async () => {
    const fields = showFields.map((field) =>
      field.key === 'status'
        ? {
            ...field,
            status: {
              on_sale: {
                intent: 'success' as const,
                label: 'On sale until the doors close tonight'
              }
            }
          }
        : field
    )
    const column = tableColumns<ReturnType<typeof testShows>[number]>(fields)
    const { container } = render(
      <RecordTable
        data={testShows(1)}
        fields={fields}
        columns={[column.field('status', { width: { min: 6 } })]}
      />
    )
    await frame()
    const badge = slot(container, 'badge')
    const label = badge.firstElementChild as HTMLElement
    expect(label.scrollWidth).toBeGreaterThan(label.clientWidth)
    expect(rect(label).left).toBeGreaterThanOrEqual(rect(badge).left)
    expect(rect(badge).right).toBeLessThanOrEqual(
      rect(badge.closest('[role="cell"]')!).right + 0.5
    )
  })
})
