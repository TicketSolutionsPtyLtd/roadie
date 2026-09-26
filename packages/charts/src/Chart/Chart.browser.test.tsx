import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import type {
  DataTableColumn,
  DataTableRow
} from '@oztix/roadie-components/data-table'

import { Chart } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { useStylesheet } from '../testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const table = {
  columns: [
    { key: 'days', header: 'Days to show', kind: 'number' as const },
    {
      key: 'show',
      header: 'This show',
      kind: 'number' as const,
      format: 'percent' as const
    }
  ],
  rows: [
    { days: 90, show: 0.11 },
    { days: 60, show: 0.27 },
    { days: 30, show: 0.4 }
  ]
}

type Layout = { size: 'md' | 'full'; width: number }
const MD: Layout = { size: 'md', width: 560 }
const LAYOUTS: Layout[] = [MD, { size: 'full', width: 1800 }]

function renderChart(
  rows: readonly DataTableRow[] = table.rows,
  state: 'ready' | 'loading' = 'ready',
  { size, width }: Layout = MD,
  columns: readonly DataTableColumn[] = table.columns
) {
  return render(
    <div style={{ width }}>
      <Chart
        state={state}
        label='Julia Jacklin pace'
        value={0.4}
        format='percent'
        context='Behind similar shows'
        size={size}
        source='Oztix sales.'
        table={{ columns, rows }}
      >
        <svg role='img' aria-label='Pace chart' className='size-full' />
      </Chart>
    </div>
  )
}

const heightOf = (element: Element) => element.getBoundingClientRect().height

describe('Chart views', () => {
  it.each(LAYOUTS)(
    'keeps the $size card height at $width px when switching views',
    async (layout) => {
      const { container, getByRole } = renderChart(table.rows, 'ready', layout)
      const card = container.querySelector('[data-slot=data-card]')!
      const chartHeight = heightOf(card)

      await userEvent.click(getByRole('tab', { name: 'Table' }))
      expect(getByRole('table')).toBeVisible()
      expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)

      await userEvent.click(getByRole('tab', { name: 'Chart' }))
      expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)
    }
  )

  it('scrolls a long table inside the plot height', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      days: 90 - i * 3,
      show: i / 100
    }))
    const { container, getByRole } = renderChart(rows)
    const card = container.querySelector('[data-slot=data-card]')!
    const chartHeight = heightOf(card)

    await userEvent.click(getByRole('tab', { name: 'Table' }))
    const scroller = container.querySelector('[data-slot=data-table-scroller]')!
    expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
  })

  it('hides the inactive view from assistive tech', () => {
    const { container, queryByRole } = renderChart()
    const tablePanel = container.querySelector('[data-chart-view=table]')!
    expect(getComputedStyle(tablePanel).visibility).toBe('hidden')
    expect(queryByRole('table')).toBeNull()
  })

  it('keeps the label row no taller than the label', () => {
    const { container } = renderChart()
    const label = container.querySelector('[data-slot=data-card-label]')!
    const row = label.parentElement!
    expect(heightOf(row)).toBeLessThanOrEqual(heightOf(label) + 0.5)
    for (const tab of container.querySelectorAll('[role=tab]')) {
      const { width, height } = tab.getBoundingClientRect()
      expect(width).toBeGreaterThanOrEqual(24)
      expect(height).toBeGreaterThanOrEqual(24)
      expect(Math.abs(width - height)).toBeLessThanOrEqual(0.5)
    }
  })

  it.each(LAYOUTS)(
    'reserves the $size plot height at $width px while loading',
    (layout) => {
      const ready = renderChart(table.rows, 'ready', layout)
      const readyHeight = heightOf(
        ready.container.querySelector('[data-slot=data-card]')!
      )
      ready.unmount()
      const loading = renderChart(table.rows, 'loading', layout)
      const loadingHeight = heightOf(
        loading.container.querySelector('[data-slot=data-card]')!
      )
      expect(Math.abs(readyHeight - loadingHeight)).toBeLessThanOrEqual(1)
    }
  )
})

const wideColumns: DataTableColumn[] = [
  { key: 'day', header: 'Day', kind: 'text' },
  ...['Sold', 'Forecast', 'Similar shows', 'Similar shows range'].map(
    (header, i) => ({ key: `c${i}`, header, kind: 'number' as const })
  )
]
const wideRows = Array.from({ length: 30 }, (_, i) => ({
  day: `Sun ${i + 1} Aug`,
  c0: 1464,
  c1: 2400,
  c2: 1300,
  c3: '1,100 to 1,500'
}))

describe('Chart table view never clips a column', () => {
  it('fills a wide card with every column in view', async () => {
    const { container, getByRole } = renderChart(
      wideRows,
      'ready',
      { size: 'full', width: 1800 },
      wideColumns
    )
    await userEvent.click(getByRole('tab', { name: 'Table' }))
    const scroller = container.querySelector('[data-slot=data-table-scroller]')!
    const panel = container.querySelector('[data-chart-view=table]')!
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth)
    expect(heightOf(getByRole('table'))).toBeGreaterThan(0)
    expect(
      Math.abs(
        scroller.getBoundingClientRect().width -
          panel.getBoundingClientRect().width
      )
    ).toBeLessThanOrEqual(0.5)
  })

  it('scrolls sideways inside the plot height when the card is narrow', async () => {
    const { container, getByRole } = renderChart(
      wideRows,
      'ready',
      { size: 'md', width: 320 },
      wideColumns
    )
    await userEvent.click(getByRole('tab', { name: 'Table' }))
    const scroller = container.querySelector<HTMLElement>(
      '[data-slot=data-table-scroller]'
    )!
    const panel = container.querySelector('[data-chart-view=table]')!
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    expect(scroller.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      panel.getBoundingClientRect().bottom + 0.5
    )
    scroller.scrollLeft = scroller.scrollWidth
    const last = [...container.querySelectorAll('th')].at(-1)!
    expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(
      scroller.getBoundingClientRect().right + 0.5
    )
  })
})
