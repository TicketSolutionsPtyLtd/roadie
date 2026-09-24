import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import { DataTable, type DataTableColumn } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
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
      venue: 'The Lantern Room, Fortitude Valley · Sat 14 Nov',
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
