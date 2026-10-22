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
  await expect.poll(() => chart.brush()).not.toBeNull()
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

  it('replaces a held range with a new drag', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    const at = await pointPositions(chart, 8)
    await drag(at[1]!, at[3]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(1)
    await drag(at[5]!, at[7]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(2)
    expect(onRangeSelect).toHaveBeenLastCalledWith({
      start: '2026-10-06',
      end: '2026-10-08'
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

const bars = [
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
  '2026-10-05'
].map((day, i) => ({ day, sold: 120 + i * 40 }))

/** How far each bar runs under the shading, as a share of its width. */
function shadedShare(chart: Rendered) {
  const band = chart.svg().querySelector('[data-ts-key="range-band"]')
  const hidden = chart.brush()!.querySelector('.selection')!
  if (!band || Number(getComputedStyle(hidden).fillOpacity) !== 0) return null
  const shade = band.getBoundingClientRect()
  return [
    ...chart.svg().querySelectorAll('path[data-ts-key^="series-1:"]')
  ].map((bar) => {
    const box = bar.getBoundingClientRect()
    const overlap =
      Math.min(box.right, shade.right) - Math.max(box.left, shade.left)
    return Math.round((Math.max(0, overlap) / box.width) * 100) / 100
  })
}

describe('range selection over bars', () => {
  it('shades whole bars from a drag', async () => {
    const chart = renderChart(
      <BarChart data={bars} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    const at = await pointPositions(chart, 5)
    await drag(at[1]!, at[3]!)
    await expect.poll(() => shadedShare(chart)).toEqual([0, 1, 1, 1, 0])
  })

  it('moves a held range of bars by dragging inside it', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <BarChart data={bars} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    const at = await pointPositions(chart, 5)
    await drag(at[0]!, at[2]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(1)
    await drag(at[1]!, at[2]!)
    await expect.poll(() => onRangeSelect.mock.calls.length).toBe(2)
    expect(onRangeSelect).toHaveBeenLastCalledWith({
      start: '2026-10-02',
      end: '2026-10-04'
    })
    await expect.poll(() => shadedShare(chart)).toEqual([0, 1, 1, 1, 0])
  })

  it('shades whole bars from Shift+Arrow', async () => {
    const chart = renderChart(
      <BarChart data={bars} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    await expect.poll(() => chart.brush()).not.toBeNull()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard(
      '{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{/Shift}'
    )
    await expect.poll(() => shadedShare(chart)).toEqual([0, 1, 1, 1, 0])
    await userEvent.keyboard('{Escape}')
    await expect
      .poll(() => chart.svg().querySelector('[data-ts-key="range-band"]'))
      .toBeNull()
  })

  it('leaves a line chart’s range to the brush', async () => {
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    const at = await pointPositions(chart, 4)
    await drag(at[1]!, at[3]!)
    await expect
      .poll(() => chart.host().getAttribute('data-range'))
      .toBe('held')
    const selection = chart.brush()!.querySelector('.selection')!
    expect(getComputedStyle(selection).fillOpacity).toBe('0.16')
    expect(chart.svg().querySelector('[data-ts-key="range-band"]')).toBeNull()
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

  it('selects weekly bars with Shift+Arrow', async () => {
    const onRangeSelect = vi.fn()
    const weeks = ['2026-09-07', '2026-09-14', '2026-09-21'].map((week, i) => ({
      week,
      sold: 100 + i * 40
    }))
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
    await expect.poll(() => chart.brush()).not.toBeNull()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
    await expect
      .poll(() => chart.live().textContent)
      .toBe('Selected 7 to 20 September, 2 weeks. Enter to apply.')
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).toHaveBeenCalledExactlyOnceWith({
      start: '2026-09-07',
      end: '2026-09-20'
    })
  })

  it('selects to either end with Shift+Home and Shift+End', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Shift>}{End}{/Shift}')
    await expect
      .poll(() => chart.live().textContent)
      .toBe('Selected 3 to 8 October, 6 days. Enter to apply.')
    await userEvent.keyboard('{Shift>}{Home}{/Shift}')
    await expect
      .poll(() => chart.live().textContent)
      .toBe('Selected 1 to 3 October, 3 days. Enter to apply.')
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).toHaveBeenCalledExactlyOnceWith({
      start: '2026-10-01',
      end: '2026-10-03'
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
      .toBe('Sunday, 4 October 2026')
    expect(onRangeSelect).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(onRangeSelect).toHaveBeenCalledExactlyOnceWith({
      start: '2026-10-01',
      end: '2026-10-04'
    })
    await userEvent.keyboard('{End}')
    await expect
      .poll(() => end.getAttribute('aria-valuetext'))
      .toBe('Thursday, 8 October 2026')
  })

  it.each([
    ['Escape clears from a handle', '{Escape}'],
    ['a handle meets the other', '{ArrowLeft}']
  ])('keeps focus in the chart when %s', async (_, key) => {
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')
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
    await userEvent.keyboard(key)
    await expect
      .poll(() => chart.host().getAttribute('data-range'))
      .toBe('empty')
    await expect.poll(() => document.activeElement).toBe(chart.svg())
  })

  it('clears on Escape and on new data', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    // d3 hides the handles of an empty brush rather than removing them, and
    // a chart that failed to draw has no brush at all.
    const handles = () => {
      const brush = chart.brush()
      if (!brush) return 'no brush'
      return [...brush.querySelectorAll('[role=slider]')].filter(
        (el) => getComputedStyle(el).display !== 'none'
      ).length
    }
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

    chart.rerender(
      <div style={{ width: 560 }}>
        <Chart label='Tickets sold' source='Oztix sales.'>
          <LineChart
            data={days}
            x='day'
            y='sold'
            onRangeSelect={onRangeSelect}
          />
        </Chart>
      </div>
    )
    await afterResize()
    expect(handles()).toBe(0)
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

// Desktop WebKit and Firefox can't construct touches.
const canTouch = (() => {
  try {
    new Touch({ identifier: 0, target: document.body })
    return true
  } catch {
    return false
  }
})()

describe('range selection on touch', () => {
  it('shows the tooltip for a tap, as a plain chart does', async () => {
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    await expect.poll(() => chart.brush()).not.toBeNull()
    expect(getComputedStyle(chart.brush()!).touchAction).toBe('auto')
    const overlay = chart.brush()!.querySelector('.overlay')!
    const box = overlay.getBoundingClientRect()
    const at = {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      clientX: box.left + box.width * 0.6,
      clientY: box.top + box.height / 2
    }
    overlay.dispatchEvent(new PointerEvent('pointerdown', at))
    await expect.poll(() => chart.tooltip()).not.toBeNull()
    // Touch leaves the element as soon as the finger lifts.
    for (const type of ['pointerup', 'pointerout', 'pointerleave'])
      overlay.dispatchEvent(new PointerEvent(type, at))
    await afterResize()
    expect(chart.tooltip()).not.toBeNull()
  })

  it.skipIf(!canTouch)('leaves a held range alone on a tap', async () => {
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={() => {}} />
    )
    await afterResize()
    chart.svg().focus()
    await expect.poll(() => chart.live().textContent).not.toBe('')
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}')
    await expect
      .poll(() => chart.host().getAttribute('data-range'))
      .toBe('held')
    const overlay = chart.brush()!.querySelector('.overlay')!
    const box = overlay.getBoundingClientRect()
    const at = {
      clientX: box.left + box.width * 0.8,
      clientY: box.top + box.height / 2
    }
    const touch = new Touch({ identifier: 1, target: overlay, ...at })
    overlay.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: [touch],
        targetTouches: [touch],
        changedTouches: [touch]
      })
    )
    overlay.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, changedTouches: [touch] })
    )
    // The mouse events a browser emulates after a tap.
    const mouse = { bubbles: true, cancelable: true, view: window, ...at }
    overlay.dispatchEvent(new MouseEvent('mousedown', mouse))
    window.dispatchEvent(new MouseEvent('mouseup', mouse))
    await afterResize()
    expect(chart.host().getAttribute('data-range')).toBe('held')
  })

  it.skipIf(!canTouch)('leaves a swipe to scroll the page', async () => {
    const onRangeSelect = vi.fn()
    const chart = renderChart(
      <LineChart data={days} x='day' y='sold' onRangeSelect={onRangeSelect} />
    )
    await afterResize()
    await expect.poll(() => chart.brush()).not.toBeNull()
    const overlay = chart.brush()!.querySelector('.overlay')!
    const box = overlay.getBoundingClientRect()
    const touchAt = (x: number, y: number) =>
      new Touch({ identifier: 1, target: overlay, clientX: x, clientY: y })
    const send = (type: string, x: number, y: number) => {
      const touch = touchAt(x, y)
      const event = new TouchEvent(type, {
        bubbles: true,
        cancelable: true,
        touches: type === 'touchend' ? [] : [touch],
        targetTouches: type === 'touchend' ? [] : [touch],
        changedTouches: [touch]
      })
      overlay.dispatchEvent(event)
      return event
    }
    const y = box.top + box.height / 2
    send('touchstart', box.left + 40, y)
    const move = send('touchmove', box.left + 200, y - 40)
    send('touchend', box.left + 200, y - 40)
    await afterResize()
    expect(move.defaultPrevented).toBe(false)
    expect(chart.host().getAttribute('data-range')).toBe('empty')
    expect(onRangeSelect).not.toHaveBeenCalled()
  })
})
