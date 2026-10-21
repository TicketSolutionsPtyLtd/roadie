import { cleanup, render } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { BarChart } from '../BarChart'
import { Chart } from '../Chart'
import { LineChart } from '../LineChart'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { afterResize } from './browserTesting'

const days = Array.from({ length: 8 }, (_, i) => ({
  day: `2026-10-0${i + 1}`,
  sold: [120, 180, 150, 240, 310, 260, 400, 380][i]!
}))

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await commands.parkPointer()
})

function renderChart(plot: React.ReactElement) {
  const result = render(
    <div style={{ width: 560 }}>
      <Chart label='Tickets sold' source='Oztix sales.'>
        {plot}
      </Chart>
    </div>
  )
  const { container } = result
  return {
    ...result,
    svg: () => container.querySelector<SVGElement>('svg.ts-chart')!,
    host: () => container.querySelector('[data-slot=chart-plot-host]')!,
    live: () => container.querySelector('[data-slot=chart-plot-announcement]')!,
    tooltip: () =>
      container.querySelector<HTMLElement>('[data-slot=chart-plot-tooltip]'),
    brush: () => container.querySelector('[data-chart-brush]')
  }
}

type Rendered = ReturnType<typeof renderChart>

/** Each x's position in the test frame, read from where the tooltip sits. */
async function pointPositions(chart: Rendered, count: number) {
  chart.svg().focus()
  await expect.poll(() => chart.tooltip()).not.toBeNull()
  const box = chart.host().getBoundingClientRect()
  const positions: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    const tip = chart.tooltip()!
    positions.push({
      x: box.left + parseFloat(tip.style.left),
      y: box.top + box.height / 2
    })
    if (i < count - 1) {
      const before = tip.style.left
      await userEvent.keyboard('{ArrowRight}')
      await expect.poll(() => chart.tooltip()?.style.left).not.toBe(before)
    }
  }
  chart.svg().blur()
  return positions
}

async function drag(
  from: { x: number; y: number },
  to: { x: number; y: number }
) {
  await commands.pointer([
    { type: 'move', x: from.x, y: from.y },
    { type: 'down' },
    { type: 'move', x: to.x, y: to.y, steps: 8 },
    { type: 'up' }
  ])
}

describe('range selection by pointer', () => {
  it('reports the dragged days once, inclusive', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    const at = await pointPositions(chart, 8)
    await drag(at[2]!, at[5]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(1)
    expect(onRangeSelect).toHaveBeenCalledWith({
      start: '2026-10-03',
      end: '2026-10-06'
    })
  })

  it('reports nothing for a drag inside one day', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    const at = await pointPositions(chart, 2)
    await drag(at[1]!, { x: at[1]!.x + 3, y: at[1]!.y })
    await afterResize()
    expect(onRangeSelect).not.toHaveBeenCalled()
  })

  it('ends a weekly bar range on the last week’s last day', async () => {
    const onRangeSelect = vi.fn()
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'].map(
      (week, i) => ({ week, sold: 100 + i * 40 })
    )
    const chart = renderChart(
      <BarChart
        data={weeks}
        x='week'
        y='sold'
        interval='week'
        onRangeSelect={onRangeSelect}
      />
    )
    await afterResize()
    const at = await pointPositions(chart, 4)
    await drag(at[1]!, at[3]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(1)
    expect(onRangeSelect).toHaveBeenCalledWith({
      start: '2026-09-14',
      end: '2026-10-04'
    })
  })

  it('keeps the tooltip following the pointer over the brush', async () => {
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    const at = await pointPositions(chart, 4)
    await expect.poll(() => chart.tooltip()).toBeNull()
    await commands.pointer([{ type: 'move', x: at[3]!.x, y: at[3]!.y }])
    await expect.poll(() => chart.tooltip()?.textContent).toContain('4 Oct')
  })
})

describe('range selection by keyboard', () => {
  it('grows with Shift+Arrow, reads the range, and applies on Enter', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard(
      '{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{/Shift}'
    )
    await expect
      .poll(() => chart.live().textContent)
      .toBe('Selected 2 to 4 October, 3 days. Enter to apply.')
    expect(onRangeSelect).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).toHaveBeenCalledExactlyOnceWith({
      start: '2026-10-02',
      end: '2026-10-04'
    })
  })

  it('moves a handle without applying until Enter', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}')
    const end = await vi.waitFor(() => {
      const handle = chart
        .brush()
        ?.querySelector<SVGElement>(
          '[data-chart-brush-handle=end][role=slider]'
        )
      if (!handle) throw new Error('No end handle yet')
      return handle
    })
    end.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect
      .poll(() => end.getAttribute('aria-valuetext'))
      .toBe('Sunday 4 October')
    expect(onRangeSelect).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).toHaveBeenCalledExactlyOnceWith({
      start: '2026-10-01',
      end: '2026-10-04'
    })
  })

  it('clears on Escape and on new data', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    // d3 hides the handles of an empty brush rather than removing them.
    const handles = () =>
      [...(chart.brush()?.querySelectorAll('[role=slider]') ?? [])].filter(
        (el) => getComputedStyle(el).display !== 'none'
      ).length
    await expect.poll(() => chart.brush()).not.toBeNull()
    expect(handles()).toBe(0)
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    await expect.poll(handles).toBe(2)
    await userEvent.keyboard('{Escape}')
    await expect.poll(handles).toBe(0)
    expect(chart.live().textContent).toBe('Selection cleared')

    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    await expect.poll(handles).toBe(2)
    chart.rerender(
      <div style={{ width: 560 }}>
        <Chart label='Tickets sold' source='Oztix sales.'>
          <LineChart
            data={days.slice(2)}
            x='day'
            y='sold'
            onRangeSelect={onRangeSelect}
          />
        </Chart>
      </div>
    )
    await expect.poll(handles).toBe(0)
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).not.toHaveBeenCalled()
  })
})

describe('range selection off', () => {
  it.each([
    [
      'without onRangeSelect',
      <LineChart key='a' data={days} x='day' y='sold' />
    ],
    [
      'on numeric x',
      <LineChart
        key='b'
        data={days.map((d, i) => ({ ...d, day: i }))}
        x='day'
        y='sold'
        onRangeSelect={() => {}}
      />
    ],
    [
      'on category bars',
      <BarChart
        key='c'
        data={[
          { tier: 'GA', sold: 300 },
          { tier: 'VIP', sold: 80 }
        ]}
        x='tier'
        y='sold'
        onRangeSelect={() => {}}
      />
    ]
  ])('draws no brush %s', async (_, plot) => {
    const chart = renderChart(plot)
    await afterResize()
    await expect.poll(() => chart.svg()).not.toBeNull()
    expect(chart.brush()).toBeNull()
    expect(chart.host().hasAttribute('data-range')).toBe(false)
  })
})
