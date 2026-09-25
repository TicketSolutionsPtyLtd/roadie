import { areaY, barX, cell, defineChart, lineY } from '@tanstack/charts'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { cleanup, render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Chart } from '../Chart'
import { useStylesheet } from '../testUtils'
import { ChartPlot } from './ChartPlot'
import { afterResize } from './browserTesting'
import { seriesMarkId } from './series'
import { type TestProps, testChart, testPoints } from './testChart'
import type { ChartDefinition } from './types'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const sizes = [
  ['sm', 160],
  ['md', 220],
  ['lg', 260]
] as const

async function focusPlot(container: HTMLElement) {
  container.querySelector<SVGElement>('svg.ts-chart')!.focus()
  const live = container.querySelector('[data-slot=chart-plot-announcement]')!
  await expect.poll(() => live.textContent).not.toBe('')
  return live
}

function renderInCard(
  size: 'sm' | 'md' | 'lg' | 'full' = 'md',
  width = 560,
  chart: ChartDefinition<TestProps> = testChart
) {
  return render(
    <div style={{ width }}>
      <Chart label='Test' source='Oztix sales.' size={size}>
        <ChartPlot chart={chart} props={{ points: testPoints }} />
      </Chart>
    </div>
  )
}

const heatmapLikeChart: ChartDefinition<TestProps> = {
  ...testChart,
  build: ({ points }, paint) =>
    defineChart({
      marks: [
        cell(
          [
            { x: 0, y: 0, bucket: 'low' },
            { x: 1, y: 0, bucket: 'high' }
          ],
          { id: 'cells', x: 'x', y: 'y', color: 'bucket' }
        ),
        areaY(
          points.filter((p) => p.series === 'A'),
          { id: seriesMarkId(1), x: 'x', y: 'y', fill: paint.categorical[0]! }
        )
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) }
      },
      color: { domain: ['low', 'high'], range: ['#111111', '#eeeeee'] }
    })
}

const areaChart: ChartDefinition<TestProps> = {
  ...testChart,
  build: ({ points }, paint) =>
    defineChart({
      marks: [
        areaY(
          points.filter((p) => p.series === 'A'),
          { id: seriesMarkId(1), x: 'x', y: 'y', fill: paint.categorical[0]! }
        ),
        lineY(
          points.filter((p) => p.series === 'B'),
          { id: seriesMarkId(2), x: 'x', y: 'y', stroke: paint.categorical[1]! }
        )
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 3]) },
        y: { scale: scaleLinear().domain([0, 10]) }
      }
    })
}

describe('ChartPlot in a card', () => {
  it.each(sizes)('fills the %s plot area', (size, height) => {
    const { container } = renderInCard(size)
    const plot = container.querySelector('[data-slot=chart-plot]')!
    const svg = container.querySelector('svg.ts-chart')!
    expect(Math.round(svg.getBoundingClientRect().height)).toBe(height)
    expect(Math.round(svg.getBoundingClientRect().width)).toBe(
      Math.round(plot.getBoundingClientRect().width)
    )
  })

  it.each([
    ['full', 1800, 400, 420],
    ['lg', 1200, 270, 340],
    ['full', 700, 260, 260]
  ] as const)(
    'grows a %s plot at %ipx wide to between %i and %ipx',
    async (size, width, min, max) => {
      const { container } = renderInCard(size, width)
      const plot = container.querySelector('[data-slot=chart-plot]')!
      const height = plot.getBoundingClientRect().height
      expect(height).toBeGreaterThanOrEqual(min)
      expect(height).toBeLessThanOrEqual(max)
      await expect
        .poll(
          () =>
            container.querySelector('svg.ts-chart')!.getBoundingClientRect()
              .height
        )
        .toBeCloseTo(height, 0)
    }
  )

  it.each([
    ['full', 1800],
    ['md', 560]
  ] as const)(
    'server renders the %s card at %ipx at its hydrated size',
    async (size, width) => {
      const card = (
        <div style={{ width }}>
          <Chart label='Test' source='Oztix sales.' size={size}>
            <ChartPlot chart={testChart} props={{ points: testPoints }} />
          </Chart>
        </div>
      )
      const server = document.createElement('div')
      server.innerHTML = renderToString(card)
      document.body.append(server)
      const box = (root: Element, selector: string) =>
        root.querySelector(selector)!.getBoundingClientRect().height
      const serverCard = box(server, '[data-slot=data-card]')
      const serverPlot = box(server, '[data-slot=chart-plot]')
      expect(box(server, 'svg.ts-chart')).toBeLessThanOrEqual(serverPlot + 0.5)
      server.remove()

      const { container } = render(card)
      await afterResize()
      expect(box(container, '[data-slot=data-card]')).toBeCloseTo(serverCard, 0)
      expect(box(container, 'svg.ts-chart')).toBeCloseTo(serverPlot, 0)
    }
  )

  describe('before the plot is measured', () => {
    const summary = testChart.summary({ points: testPoints })
    const card = (
      <div style={{ width: 1200 }}>
        <Chart
          label='Test'
          source='Oztix sales.'
          size='full'
          table={testChart.table({ points: testPoints })}
        >
          <ChartPlot chart={testChart} props={{ points: testPoints }} />
        </Chart>
      </div>
    )
    const opacityOf = (root: Element) =>
      getComputedStyle(root.querySelector('.ts-chart-host')!).opacity

    it('hides the server drawing but keeps its summary and table', () => {
      const server = document.createElement('div')
      server.innerHTML = renderToString(card)
      document.body.append(server)
      try {
        expect(opacityOf(server)).toBe('0')
        expect(
          server.querySelector('svg.ts-chart')!.getAttribute('aria-label')
        ).toBe(summary)
        expect(server.querySelectorAll('tbody tr').length).toBe(
          testChart.table({ points: testPoints }).rows.length
        )
      } finally {
        server.remove()
      }
    })

    it('shows the plot at full width once measured', async () => {
      const { container } = render(card)
      await expect.poll(() => opacityOf(container)).toBe('1')
      const plot = container.querySelector('[data-slot=chart-plot]')!
      const svg = container.querySelector('svg.ts-chart')!
      expect(svg.getBoundingClientRect().width).toBeCloseTo(
        plot.getBoundingClientRect().width,
        0
      )
    })

    it('shows it without a fade when motion is reduced', async () => {
      await commands.reducedMotion(true)
      try {
        const { container } = render(card)
        const host = container.querySelector('.ts-chart-host')!
        expect(
          parseFloat(getComputedStyle(host).transitionDuration)
        ).toBeLessThan(0.001)
        await expect.poll(() => opacityOf(container)).toBe('1')
      } finally {
        await commands.reducedMotion(false)
      }
    })
  })

  it('reaches every x value with the arrow keys and speaks each one', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    const spoken = new Set<string>()
    for (let i = 0; i < 4; i++) {
      spoken.add(live.textContent ?? '')
      await userEvent.keyboard('{ArrowRight}')
    }
    expect(spoken.size).toBe(4)
    expect(
      container.querySelectorAll('[data-slot=chart-plot-tooltip] dt')
    ).toHaveLength(2)
  })

  it('moves between series with up and down', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    const heard = [live.textContent]
    await userEvent.keyboard('{ArrowUp}')
    heard.push(live.textContent)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    heard.push(live.textContent)
    expect(new Set(heard).size).toBeGreaterThan(1)
    expect(heard.every((text) => text?.startsWith('0,'))).toBe(true)
  })

  it('goes from the top series to the one below it', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    expect(live.textContent).toBe('0, 5 orders')
    await userEvent.keyboard('{ArrowUp}')
    expect(live.textContent).toBe('0, 5 orders')
    await userEvent.keyboard('{ArrowDown}')
    expect(live.textContent).toBe('0, 1 orders')
  })

  it('stays on the chosen series when moving along x', async () => {
    const { container } = renderInCard()
    const live = await focusPlot(container)
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('1, 2 orders')
    await userEvent.keyboard('{ArrowRight}')
    expect(live.textContent).toBe('2, 3 orders')
    await userEvent.keyboard('{ArrowLeft}')
    expect(live.textContent).toBe('1, 2 orders')
  })

  it('places the tooltip on the focused point in CSS pixels', async () => {
    const { container } = renderInCard('md', 420)
    await focusPlot(container)
    await userEvent.keyboard('{End}')
    const host = container
      .querySelector('[data-slot=chart-plot-host]')!
      .getBoundingClientRect()
    const dot = container
      .querySelector(
        `circle[data-ts-key^='${seriesMarkId(2)}:'][data-ts-key$=':number:3']`
      )!
      .getBoundingClientRect()
    const tooltip = container.querySelector<HTMLElement>(
      '[data-slot=chart-plot-tooltip]'
    )!
    expect(parseFloat(tooltip.style.left)).toBeCloseTo(
      (dot.left + dot.right) / 2 - host.left,
      0
    )
    expect(parseFloat(tooltip.style.top)).toBeCloseTo(
      (dot.top + dot.bottom) / 2 - host.top,
      0
    )
  })

  it('keeps every label at 11px or more on a phone', () => {
    const { container } = renderInCard('sm', 320)
    for (const text of container.querySelectorAll('svg.ts-chart text'))
      expect(
        parseFloat(getComputedStyle(text).fontSize)
      ).toBeGreaterThanOrEqual(11)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard()
    const card = container.querySelector('[data-slot=data-card]')!
    const before = card.getBoundingClientRect().height
    await userEvent.click(getByRole('tab', { name: 'Table' }))
    expect(
      Math.abs(card.getBoundingClientRect().height - before)
    ).toBeLessThanOrEqual(0.5)
  })
})

// Fri and Sat tie on segment A, so their A segments end at the same pixel x.
const stackRows = [
  { x: 'Fri', series: 'A', y: 4, start: 0, end: 4, index: 0 },
  { x: 'Fri', series: 'B', y: 3, start: 4, end: 7, index: 1 },
  { x: 'Sat', series: 'A', y: 4, start: 0, end: 4, index: 2 },
  { x: 'Sat', series: 'B', y: 2, start: 4, end: 6, index: 3 }
]

const horizontalStack: ChartDefinition<TestProps> = {
  ...testChart,
  categoryAxis: () => 'y',
  build: (_, paint) =>
    defineChart({
      marks: ['A', 'B'].map((series, i) =>
        barX(
          stackRows.filter((r) => r.series === series),
          {
            id: seriesMarkId(i + 1),
            y: 'x',
            x1: 'start',
            x2: 'end',
            z: 'series',
            fill: paint.categorical[i]!
          }
        )
      ),
      scales: {
        x: { scale: scaleLinear().domain([0, 8]) },
        y: { scale: scaleBand<string>().domain(['Fri', 'Sat']).padding(0.3) }
      },
      focus: 'group-y'
    }),
  describe: (datum) => `${datum.x} ${datum.series}`
}

describe('ChartPlot with categories down y', () => {
  async function pressAndHear(live: Element, key: string) {
    await userEvent.keyboard(`{${key}}`)
    return live.textContent
  }

  it('moves up and down between categories and across segments', async () => {
    const { container } = renderInCard('md', 560, horizontalStack)
    const live = await focusPlot(container)
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}{ArrowLeft}')
    expect(live.textContent).toBe('Fri A')
    expect(await pressAndHear(live, 'ArrowUp')).toBe('Fri A')
    expect(await pressAndHear(live, 'ArrowLeft')).toBe('Fri A')
    expect(await pressAndHear(live, 'ArrowRight')).toBe('Fri B')
    expect(await pressAndHear(live, 'ArrowRight')).toBe('Fri B')
    expect(await pressAndHear(live, 'ArrowDown')).toBe('Sat B')
    expect(await pressAndHear(live, 'ArrowDown')).toBe('Sat B')
    expect(await pressAndHear(live, 'ArrowLeft')).toBe('Sat A')
    expect(await pressAndHear(live, 'ArrowUp')).toBe('Fri A')
    expect(await pressAndHear(live, 'ArrowDown')).toBe('Sat A')
  })
})

// Values are out of rank order, so the engine's nearest-y first stop, the
// shortest bar, is not the top one.
const rankRows = [
  { x: 'Carlton', series: 'A', y: 6, index: 0 },
  { x: 'Fitzroy', series: 'A', y: 2, index: 1 },
  { x: 'Brunswick', series: 'A', y: 9, index: 2 }
]

const horizontalRanks: ChartDefinition<TestProps> = {
  ...testChart,
  categoryAxis: () => 'y',
  build: (_, paint) =>
    defineChart({
      marks: [
        barX(rankRows, {
          id: seriesMarkId(1),
          y: 'x',
          x: 'y',
          fill: paint.categorical[0]!
        })
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 10]) },
        y: {
          scale: scaleBand<string>()
            .domain(rankRows.map((r) => r.x))
            .padding(0.3)
        }
      },
      focus: 'nearest-y'
    }),
  describe: (datum) => `${datum.x} ${datum.y}`
}

describe('ChartPlot entering focus', () => {
  function renderAfterButton(chart: ChartDefinition<TestProps>) {
    const view = render(
      <div style={{ width: 560 }}>
        <button type='button'>Before</button>
        <ChartPlot chart={chart} props={{ points: testPoints }} />
        <button type='button'>After</button>
      </div>
    )
    const live = view.container.querySelector(
      '[data-slot=chart-plot-announcement]'
    )!
    return { ...view, live }
  }

  it('starts on the top category when tabbing into a horizontal chart', async () => {
    const { getByRole, live } = renderAfterButton(horizontalRanks)
    getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    await expect.poll(() => live.textContent).toBe('Carlton 6')
    await userEvent.keyboard('{End}')
    expect(live.textContent).toBe('Brunswick 9')
    await userEvent.keyboard('{Home}')
    expect(live.textContent).toBe('Carlton 6')
    await userEvent.keyboard('{ArrowDown}')
    expect(live.textContent).toBe('Fitzroy 2')
  })

  it('reaches the first and last segments of a stack with Home and End', async () => {
    const { container, live } = renderAfterButton(horizontalStack)
    container.querySelector<SVGElement>('svg.ts-chart')!.focus()
    await expect.poll(() => live.textContent).toBe('Fri A')
    await userEvent.keyboard('{End}')
    expect(live.textContent).toBe('Sat B')
    await userEvent.keyboard('{Home}')
    expect(live.textContent).toBe('Fri A')
  })

  it('clears the spoken point when tabbing out', async () => {
    const { getByRole, live } = renderAfterButton(horizontalRanks)
    getByRole('button', { name: 'Before' }).focus()
    await userEvent.tab()
    await expect.poll(() => live.textContent).toBe('Carlton 6')
    await userEvent.tab()
    expect(document.activeElement).toBe(getByRole('button', { name: 'After' }))
    await expect.poll(() => live.textContent).toBe('')
  })

  // Another window or frame taking focus blurs the chart but leaves it the
  // document's active element, which is what parallel test frames do.
  it('keeps the spoken point when the window loses focus', async () => {
    const { container, live } = renderAfterButton(horizontalRanks)
    const svg = container.querySelector<SVGElement>('svg.ts-chart')!
    svg.focus()
    await expect.poll(() => live.textContent).toBe('Carlton 6')
    svg.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null })
    )
    expect(document.activeElement).toBe(svg)
    await afterResize()
    expect(live.textContent).toBe('Carlton 6')
    await userEvent.keyboard('{End}{ArrowUp}')
    expect(live.textContent).toBe('Fitzroy 2')
  })
})

const otherBarChart: ChartDefinition<TestProps> = {
  ...horizontalRanks,
  build: (_, paint) =>
    defineChart({
      marks: [
        barX(rankRows.slice(0, 2), {
          id: seriesMarkId(1),
          y: 'x',
          x: 'y',
          fill: paint.categorical[0]!
        }),
        barX(rankRows.slice(2), {
          id: 'series-other',
          y: 'x',
          x: 'y',
          fill: paint.other
        })
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, 10]) },
        y: { scale: scaleBand<string>().domain(rankRows.map((r) => r.x)) }
      }
    })
}

describe('ChartPlot under forced colours', () => {
  it('textures the Other bar', async (context) => {
    const { container } = renderInCard('md', 560, otherBarChart)
    const other = container.querySelector(
      "[data-ts-key^='series-other:'] rect, rect[data-ts-key^='series-other:']"
    )!
    expect(getComputedStyle(other).fill).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      expect(getComputedStyle(other).fill).toMatch(/texture-8/)
    } finally {
      await commands.forcedColors(false)
    }
  })

  it('swaps series fills for textures and dashes the lines after the first', async (context) => {
    const { container } = renderInCard('md', 560, areaChart)
    const area = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(1)}:']`
    )!
    const line = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(2)}:']`
    )!
    expect(getComputedStyle(area).fill).not.toContain('texture')

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      // The scoped id from useChartPatterns, not the unscoped roadie-texture-1
      // fallback — proves var(--chart-texture-1) resolving to url(#…) works.
      expect(getComputedStyle(area).fill).toMatch(/texture-1/)
      expect(getComputedStyle(line).fill).toBe('none')
      expect(getComputedStyle(line).strokeDasharray).toMatch(
        /^6(px)?,? 3(px)?$/
      )
    } finally {
      await commands.forcedColors(false)
    }
  })

  it('keeps cell colours untextured while other marks still texture', async (context) => {
    const { container } = renderInCard('md', 560, heatmapLikeChart)
    const cells = container.querySelectorAll<SVGRectElement>(
      "rect[data-ts-key^='cells:']"
    )
    const series = container.querySelector(
      `path[data-ts-key^='${seriesMarkId(1)}:']`
    )!
    expect(cells.length).toBe(2)

    await commands.forcedColors(true)
    try {
      if (!matchMedia('(forced-colors: active)').matches) {
        context.skip()
        return
      }
      const fills = Array.from(cells, (cell) => getComputedStyle(cell).fill)
      expect(fills.every((fill) => !fill.includes('url('))).toBe(true)
      expect(new Set(fills).size).toBe(2)
      expect(getComputedStyle(series).fill).toMatch(/texture-1/)
    } finally {
      await commands.forcedColors(false)
    }
  })
})
