import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

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

function renderChart(rows = table.rows, state: 'ready' | 'loading' = 'ready') {
  return render(
    <div style={{ width: 560 }}>
      <Chart
        state={state}
        label='Julia Jacklin pace'
        value={0.4}
        format='percent'
        context='Behind similar shows'
        size='md'
        source='Oztix sales.'
        table={{ ...table, rows }}
      >
        <svg role='img' aria-label='Pace chart' className='size-full' />
      </Chart>
    </div>
  )
}

const heightOf = (element: Element) => element.getBoundingClientRect().height

describe('Chart views', () => {
  it('keeps the card height when switching between chart and table', async () => {
    const { container, getByRole } = renderChart()
    const card = container.querySelector('[data-slot=data-card]')!
    const chartHeight = heightOf(card)

    await userEvent.click(getByRole('tab', { name: 'Table' }))
    expect(getByRole('table')).toBeVisible()
    expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)

    await userEvent.click(getByRole('tab', { name: 'Chart' }))
    expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)
  })

  it('scrolls a long table inside the plot height', async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      days: 90 - i * 3,
      show: i / 100
    }))
    const { container, getByRole } = renderChart(rows)
    const card = container.querySelector('[data-slot=data-card]')!
    const chartHeight = heightOf(card)

    await userEvent.click(getByRole('tab', { name: 'Table' }))
    const panel = container.querySelector<HTMLElement>(
      '[data-chart-view=table]'
    )!
    expect(Math.abs(heightOf(card) - chartHeight)).toBeLessThanOrEqual(0.5)
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight)
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
    }
  })

  it('reserves the plot height while loading', () => {
    const ready = renderChart()
    const readyHeight = heightOf(
      ready.container.querySelector('[data-slot=data-card]')!
    )
    ready.unmount()
    const loading = renderChart(table.rows, 'loading')
    const loadingHeight = heightOf(
      loading.container.querySelector('[data-slot=data-card]')!
    )
    expect(Math.abs(readyHeight - loadingHeight)).toBeLessThanOrEqual(1)
  })
})
