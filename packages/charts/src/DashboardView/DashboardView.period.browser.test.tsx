import { cleanup, render, screen } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import type {
  ChartCard,
  DashboardPeriodSpec,
  DashboardSpec
} from '@oztix/roadie-core/dashboard'

import { DashboardView, type DashboardViewProps } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import { afterResize } from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'

const days = Array.from({ length: 8 }, (_, i) => ({
  day: `2026-10-0${i + 1}`,
  sold: [120, 180, 150, 240, 310, 260, 400, 380][i]!
}))

const lineCard: ChartCard = {
  id: 'daily',
  kind: 'chart',
  size: 'full',
  label: 'Tickets sold each day',
  source: 'Oztix sales.',
  plot: { kind: 'line', data: days, x: 'day', y: 'sold', selectsPeriod: true }
}
const barCard: ChartCard = {
  ...lineCard,
  id: 'daily-bars',
  label: 'Orders each day',
  plot: { kind: 'bar', data: days, x: 'day', y: 'sold', selectsPeriod: true }
}
const areaCard: ChartCard = {
  ...lineCard,
  id: 'daily-channels',
  label: 'Tickets sold by channel',
  plot: {
    kind: 'stacked-area',
    data: days.flatMap((d) => [
      { ...d, channel: 'Email' },
      { ...d, sold: d.sold / 2, channel: 'Social' }
    ]),
    x: 'day',
    y: 'sold',
    series: 'channel',
    selectsPeriod: true
  }
}

const dashboard = (
  card: ChartCard,
  period: DashboardPeriodSpec = {
    range: 'this-month',
    compare: 'previous-year'
  }
): DashboardSpec => ({
  version: 1,
  title: 'Sales',
  period,
  sections: [{ title: 'Sales', cards: [card] }]
})

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

function renderDashboard(props: DashboardViewProps) {
  const result = render(
    <div style={{ width: 640 }}>
      <DashboardView
        {...props}
        periodProps={{ today: '2026-10-08', ...props.periodProps }}
      />
    </div>
  )
  return {
    ...result,
    svg: () => result.container.querySelector<SVGElement>('svg.ts-chart')!,
    live: () =>
      result.container.querySelector('[data-slot=chart-plot-announcement]')!,
    brush: () => result.container.querySelector('[data-chart-brush]')
  }
}

/** Selects the second to fourth x with the keyboard and applies it. */
async function selectRange(
  view: ReturnType<typeof renderDashboard>,
  announcement = 'Selected 2 to 4 October, 3 days. Enter to apply.'
) {
  await afterResize()
  await expect.poll(() => view.brush()).not.toBeNull()
  view.svg().focus()
  await expect.poll(() => view.live().textContent).not.toBe('')
  await userEvent.keyboard(
    '{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{/Shift}'
  )
  await expect.poll(() => view.live().textContent).toBe(announcement)
  await userEvent.keyboard('{Enter}')
}

/** Leaves time for a brush that isn't coming to mount. */
async function settled(view: ReturnType<typeof renderDashboard>) {
  await afterResize()
  await expect.poll(() => view.svg()).not.toBeNull()
  await afterResize()
}

describe('DashboardView setting the period from a chart', () => {
  it.each([
    ['line', lineCard],
    ['bar', barCard],
    ['stacked area', areaCard]
  ])(
    'sets the period from a %s card, keeping the comparison',
    async (_, card) => {
      const onPeriodChange = vi.fn()
      const view = renderDashboard({
        spec: dashboard(card),
        onPeriodChange
      })
      await selectRange(view)
      expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith({
        range: { start: '2026-10-02', end: '2026-10-04' },
        compare: 'previous-year'
      })
    }
  )

  it('sets whole days from an hourly card', async () => {
    const hours = Array.from({ length: 8 }, (_, i) => ({
      hour: new Date(Date.UTC(2026, 9, 2, 22 + i)).toISOString().slice(0, 16),
      scans: 40 + i * 10
    }))
    const onPeriodChange = vi.fn()
    const view = renderDashboard({
      spec: dashboard({
        ...barCard,
        plot: {
          kind: 'bar',
          data: hours,
          x: 'hour',
          y: 'scans',
          interval: 'hour',
          selectsPeriod: true
        }
      }),
      onPeriodChange
    })
    await selectRange(
      view,
      'Selected Friday, 2 October 2026, 11:00pm to Saturday, 3 October 2026, 1:00am. Enter to apply.'
    )
    expect(onPeriodChange).toHaveBeenCalledExactlyOnceWith({
      range: { start: '2026-10-02', end: '2026-10-03' },
      compare: 'previous-year'
    })
  })

  it('leaves out compare when the period has none', async () => {
    const onPeriodChange = vi.fn()
    const view = renderDashboard({
      spec: dashboard(lineCard, { range: 'this-month' }),
      onPeriodChange
    })
    await selectRange(view)
    expect(onPeriodChange.mock.calls).toStrictEqual([
      [{ range: { start: '2026-10-02', end: '2026-10-04' } }]
    ])
  })

  it('skips a range that is already the period', async () => {
    const onPeriodChange = vi.fn()
    const view = renderDashboard({
      spec: dashboard(lineCard, {
        range: { start: '2026-10-02', end: '2026-10-04' }
      }),
      onPeriodChange
    })
    await selectRange(view)
    expect(onPeriodChange).not.toHaveBeenCalled()
  })

  it('draws a range select only on cards that set the period', async () => {
    const unselected: ChartCard = {
      ...barCard,
      plot: { kind: 'bar', data: days, x: 'day', y: 'sold' }
    }
    render(
      <DashboardView
        spec={{
          version: 1,
          title: 'Sales',
          period: { range: 'this-month' },
          sections: [{ title: 'Sales', cards: [lineCard, unselected] }]
        }}
        onPeriodChange={() => {}}
      />
    )
    await afterResize()
    const brushIn = (name: string) =>
      screen.getByRole('article', { name }).querySelector('[data-chart-brush]')
    await expect.poll(() => brushIn('Tickets sold each day')).not.toBeNull()
    expect(brushIn('Orders each day')).toBeNull()
  })

  it.each<[string, Partial<DashboardViewProps>]>([
    [
      'without selectsPeriod',
      {
        spec: dashboard({
          ...lineCard,
          plot: { kind: 'line', data: days, x: 'day', y: 'sold' }
        }),
        onPeriodChange: () => {}
      }
    ],
    ['without onPeriodChange', {}],
    [
      'while the period is disabled',
      { onPeriodChange: () => {}, periodProps: { disabled: true } }
    ]
  ])('draws no range select %s', async (_, props) => {
    const view = renderDashboard({ spec: dashboard(lineCard), ...props })
    await settled(view)
    expect(view.brush()).toBeNull()
  })

  it('draws no range select without a period', async () => {
    const view = renderDashboard({
      spec: { ...dashboard(lineCard), period: undefined },
      onPeriodChange: () => {}
    })
    await settled(view)
    expect(view.brush()).toBeNull()
  })
})
