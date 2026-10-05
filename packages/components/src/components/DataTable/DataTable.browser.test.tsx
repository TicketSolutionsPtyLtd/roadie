import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { DataTable, type DataTableColumn, type DataTableRow } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const columns: DataTableColumn[] = [
  { key: 'show', header: 'Show', kind: 'text', pin: true },
  { key: 'daily', header: 'Daily', kind: 'sparkline', priority: 3 },
  { key: 'sellThrough', header: 'Sell-through', kind: 'meter', priority: 2 },
  {
    key: 'gross',
    header: 'Gross',
    kind: 'number',
    format: 'compactCurrency',
    priority: 1
  },
  { key: 'pace', header: 'Pace', kind: 'number' }
]
const rows = [
  {
    show: 'Ball Park Music',
    daily: [1, 2, 3, 4, 5],
    sellThrough: 0.77,
    gross: 118400,
    pace: 112
  }
]

const visible = (container: HTMLElement) =>
  [...container.querySelectorAll('th')]
    .filter((th) => getComputedStyle(th).display !== 'none')
    .map((th) => th.textContent)

describe('DataTable priorities', () => {
  it.each([
    [800, ['Show', 'Daily', 'Sell-through', 'Gross', 'Pace']],
    [600, ['Show', 'Sell-through', 'Gross', 'Pace']],
    [480, ['Show', 'Gross', 'Pace']],
    [360, ['Show', 'Pace']]
  ])('shows the right columns at %ipx', (width, expected) => {
    const { container } = render(
      <div style={{ width }}>
        <DataTable columns={columns} rows={rows} />
      </div>
    )
    expect(visible(container)).toEqual(expected)
  })

  it('shows every column with a pinned first column after Show all', async () => {
    const { container, getByRole } = render(
      <div style={{ width: 360 }}>
        <DataTable columns={columns} rows={rows} />
      </div>
    )
    await userEvent.click(getByRole('button', { name: 'Show all columns' }))
    expect(visible(container)).toHaveLength(5)
    expect(
      getComputedStyle(container.querySelector('th[data-pin]')!).position
    ).toBe('sticky')
  })
})

describe('DataTable never clips', () => {
  const venueColumns: DataTableColumn[] = [
    {
      key: 'show',
      header: 'Show',
      kind: 'text',
      pin: true,
      secondaryKey: 'venue'
    },
    { key: 'daily', header: 'Daily', kind: 'sparkline', priority: 3 },
    { key: 'sellThrough', header: 'Sell-through', kind: 'meter', priority: 2 },
    { key: 'pace', header: 'Pace index', kind: 'delta', format: 'index' },
    {
      key: 'gross',
      header: 'Gross',
      kind: 'number',
      format: 'compactCurrency',
      priority: 1
    }
  ]
  const venueRows = [
    {
      show: 'Ball Park Music',
      venue: 'Kazoo Hollow Room, Fortitude Valley · Sat 14 Nov',
      daily: [1, 2, 3, 4, 5],
      sellThrough: 0.77,
      pace: 112,
      gross: 118400
    }
  ]

  it('wraps a long secondary line to fit a 326px card', () => {
    const { container } = render(
      <div style={{ width: 326 }}>
        <DataTable columns={venueColumns} rows={venueRows} />
      </div>
    )
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    const table = scroller.querySelector('table')!
    expect(getComputedStyle(scroller).overflowX).toBe('auto')
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)
    expect(table.getBoundingClientRect().right).toBeLessThanOrEqual(
      scroller.getBoundingClientRect().right + 0.5
    )
  })

  it('scrolls rather than clips when the columns cannot fit', () => {
    const wide = venueColumns.map(({ priority: _, ...column }) => column)
    const { container } = render(
      <div style={{ width: 326 }}>
        <DataTable columns={wide} rows={venueRows} />
      </div>
    )
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    scroller.scrollLeft = scroller.scrollWidth
    expect(scroller.scrollLeft).toBeGreaterThan(0)
  })

  it('keeps the pinned column at the left edge when scrolled without expanding', () => {
    const wide = venueColumns.map(({ priority: _, ...column }) => column)
    const { container } = render(
      <div style={{ width: 326 }}>
        <DataTable columns={wide} rows={venueRows} />
      </div>
    )
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    scroller.scrollLeft = scroller.scrollWidth
    expect(scroller.scrollLeft).toBeGreaterThan(0)
    const pinnedHeader = container.querySelector<HTMLElement>('th[data-pin]')!
    const pinnedCell = container.querySelector<HTMLElement>('td[data-pin]')!
    expect(getComputedStyle(pinnedHeader).position).toBe('sticky')
    expect(getComputedStyle(pinnedCell).position).toBe('sticky')
    expect(pinnedHeader.getBoundingClientRect().left).toBeCloseTo(
      scroller.getBoundingClientRect().left,
      0
    )
    expect(pinnedCell.getBoundingClientRect().left).toBeCloseTo(
      scroller.getBoundingClientRect().left,
      0
    )
  })
})

describe('DataTable status with a secondary line', () => {
  const statusColumns: DataTableColumn[] = [
    { key: 'show', header: 'Show', kind: 'text', pin: true },
    {
      key: 'status',
      header: 'Status',
      kind: 'status',
      status: { ahead: { intent: 'success' } },
      secondaryKey: 'forecast'
    }
  ]
  const statusRows = [
    {
      show: 'Ball Park Music',
      status: 'ahead',
      forecast: 'forecast 640 of 600, well past the target for this show'
    }
  ]

  it('keeps the badge its own width, with the line under it', () => {
    const { container } = render(
      <div style={{ width: 800 }}>
        <DataTable columns={statusColumns} rows={statusRows} />
      </div>
    )
    const badge = container.querySelector('[data-slot=badge]')!
    const line = badge.nextElementSibling!
    const badgeBox = badge.getBoundingClientRect()
    const lineBox = line.getBoundingClientRect()
    expect(badgeBox.width).toBeLessThan(lineBox.width / 2)
    expect(badgeBox.left).toBeCloseTo(lineBox.left, 0)
    expect(lineBox.top).toBeGreaterThanOrEqual(badgeBox.bottom - 0.5)
  })

  it('wraps a long line to fit a 326px card', () => {
    const { container } = render(
      <div style={{ width: 326 }}>
        <DataTable columns={statusColumns} rows={statusRows} />
      </div>
    )
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)
  })
})

describe('DataTable row links', () => {
  const linkColumns: DataTableColumn[] = [
    { key: 'show', header: 'Show', kind: 'text', pin: true },
    { key: 'city', header: 'City', kind: 'text' },
    { key: 'sold', header: 'Tickets sold', kind: 'number' },
    { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' }
  ]
  const linkRows = [
    { show: 'Ball Park Music', city: 'Brisbane', sold: 1840, gross: 118400 },
    { show: 'Angie McMahon', city: 'Melbourne', sold: 620, gross: 40200 }
  ]

  const renderLinked = (width: number, pin = true) =>
    render(
      <div style={{ width }}>
        <DataTable
          columns={linkColumns.map((column) =>
            column.key === 'show' ? { ...column, pin } : column
          )}
          rows={linkRows}
          getRowHref={(row) => `#${String(row.city).toLowerCase()}`}
        />
      </div>
    )

  const centre = (element: Element) => {
    const box = element.getBoundingClientRect()
    return [box.left + box.width / 2, box.top + box.height / 2] as const
  }
  const linkAt = (element: Element) =>
    document.elementFromPoint(...centre(element))?.closest('a')

  it.each([true, false])(
    'covers every cell with the title link (pinned: %s)',
    (pin) => {
      const { container } = renderLinked(600, pin)
      const row = container.querySelector('tbody tr')!
      for (const cell of row.querySelectorAll('td'))
        expect(linkAt(cell)?.getAttribute('href')).toBe('#brisbane')
    }
  )

  it('covers the visible row of a scrolled table without widening it', () => {
    const { container } = renderLinked(280)
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    const unlinked = render(
      <div style={{ width: 280 }}>
        <DataTable columns={linkColumns} rows={linkRows} />
      </div>
    ).container.querySelector<HTMLElement>('[data-slot=data-table-scroller]')!
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    expect(scroller.scrollWidth).toBe(unlinked.scrollWidth)
    scroller.scrollLeft = scroller.scrollWidth
    const cells = container.querySelectorAll('tbody tr:first-child td')
    expect(linkAt(cells[cells.length - 1]!)?.getAttribute('href')).toBe(
      '#brisbane'
    )
  })

  it.each([600, 280])(
    'covers a row whose pinned title is second, at %ipx, without widening it',
    (width) => {
      const secondColumns: DataTableColumn[] = [
        { key: 'sold', header: 'Tickets sold', kind: 'number' },
        { key: 'show', header: 'Show', kind: 'text', pin: true },
        { key: 'city', header: 'City', kind: 'text' },
        { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' }
      ]
      const table = (getRowHref?: (row: DataTableRow) => string) =>
        render(
          <div style={{ width }}>
            <DataTable
              columns={secondColumns}
              rows={linkRows}
              getRowHref={getRowHref}
            />
          </div>
        ).container
      const unlinked = table().querySelector<HTMLElement>(
        '[data-slot=data-table-scroller]'
      )!
      const container = table((row) => `#${String(row.city).toLowerCase()}`)
      const scroller = container.querySelector<HTMLElement>(
        '[data-slot=data-table-scroller]'
      )!
      expect(scroller.scrollWidth).toBe(unlinked.scrollWidth)
      const coversRow = () => {
        for (const cell of container.querySelectorAll(
          'tbody tr:first-child td'
        )) {
          const box = cell.getBoundingClientRect()
          const view = scroller.getBoundingClientRect()
          // Only the part of a cell the scroller shows can be pressed.
          const left = Math.max(box.left, view.left) + 2
          const right = Math.min(box.right, view.right) - 2
          if (right <= left) continue
          for (const x of [left, (left + right) / 2, right])
            expect(
              document
                .elementFromPoint(x, box.top + box.height / 2)
                ?.closest('a')
                ?.getAttribute('href')
            ).toBe('#brisbane')
        }
      }
      coversRow()
      scroller.scrollLeft = scroller.scrollWidth
      coversRow()
    }
  )

  it('rings the row on keyboard focus', async () => {
    const { container } = renderLinked(600)
    const row = container.querySelector<HTMLElement>('tbody tr')!
    // Tab skips links in WebKit, and a click earlier in the file stops a key press alone reading as keyboard focus.
    await userEvent.keyboard('{Shift}')
    const link = row.querySelector('a')!
    link.focus({ focusVisible: true })
    await new Promise(requestAnimationFrame)
    const ring = getComputedStyle(link, '::after')
    expect(ring.outlineStyle).toBe('solid')
    expect(parseFloat(ring.outlineWidth)).toBe(4)
  })

  it('tints the row on hover without shrinking it', async () => {
    const { container } = renderLinked(600)
    const row = container.querySelector<HTMLElement>('tbody tr')!
    const cell = row.querySelector('td:last-child')!
    const rest = getComputedStyle(cell).backgroundColor
    await userEvent.hover(row.querySelector('a')!)
    expect(getComputedStyle(cell).backgroundColor).not.toBe(rest)
    expect(getComputedStyle(row).transform).toBe('none')
  })
})

describe('DataTable pinned cells', () => {
  it('leaves a data-pin outside a DataTable in normal flow', () => {
    const { container } = render(<div data-pin=''>Elsewhere</div>)
    expect(getComputedStyle(container.firstElementChild!).position).toBe(
      'static'
    )
  })
})
