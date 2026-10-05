import type {
  DashboardPeriodSpec,
  DashboardSpec
} from '@oztix/roadie-core/dashboard'
import {
  type ResolvedDateRange,
  isBuiltInComparison,
  plainDateOf,
  resolveComparison,
  resolveDateRange
} from '@oztix/roadie-core/datetime'

import { portfolioExample } from '../Scatter/examples'
import { DAILY_TICKETS } from './showDashboard'

const DAY = 86_400_000
const JULIA_SHOW_DAY = Date.UTC(2026, 10, 28)
const JULIA_CAPACITY = 800
// Thu 15 Oct, the same day as the show dashboard.
const TODAY = 44
const JULIA_DAILY = [
  6, 6, 6, 5, 5, 5, 5, 4, 5, 4, 4, 4, 4, 3, 4, 3, 3, 4, 3, 3, 3, 3, 2, 3, 2, 3,
  2, 2, 2, 2
]

type Anchors = readonly (readonly [daysOut: number, value: number])[]

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0)
const round = (v: number) => Math.round(v * 1000) / 1000
const isoDaysOut = (daysOut: number) =>
  new Date(JULIA_SHOW_DAY - daysOut * DAY).toISOString().slice(0, 10)

function lerp(anchors: Anchors, daysOut: number) {
  const next = anchors.findIndex(([at]) => at <= daysOut)
  const [d1, v1] = anchors[Math.max(0, next - 1)]!
  const [d2, v2] = anchors[next] ?? anchors.at(-1)!
  return d1 === d2 ? v2 : v1 + ((v2 - v1) * (d1 - daysOut)) / (d1 - d2)
}

const windowStart = TODAY + JULIA_DAILY.length
const soldAtWindowStart = 0.4 - sum(JULIA_DAILY) / JULIA_CAPACITY
const SIMILAR: Anchors = [
  [90, 0.2],
  [60, 0.4],
  [TODAY, 0.52],
  [0, 0.88]
]
const FORECAST: Anchors = [
  [TODAY, 0.4],
  [0, 0.74]
]

function juliaSold(daysOut: number) {
  if (daysOut >= windowStart)
    return lerp(
      [
        [90, 0.11],
        [windowStart, soldAtWindowStart]
      ],
      daysOut
    )
  if (daysOut >= TODAY)
    return (
      soldAtWindowStart +
      sum(JULIA_DAILY.slice(0, windowStart - daysOut)) / JULIA_CAPACITY
    )
  return lerp(FORECAST, daysOut)
}

const juliaPace = Array.from({ length: 46 }, (_, i) => {
  const daysOut = 90 - i * 2
  const sold = juliaSold(daysOut)
  const spread = ((TODAY - daysOut) / TODAY) * 0.07
  const similar = lerp(SIMILAR, daysOut)
  return {
    day: isoDaysOut(daysOut),
    sold: round(sold),
    coneLow: daysOut <= TODAY ? round(sold - spread) : null,
    coneHigh: daysOut <= TODAY ? round(sold + spread) : null,
    low: round(similar - 0.07),
    high: round(similar + 0.08),
    median: round(similar)
  }
})

const shows = [
  {
    show: 'Ball Park Music',
    venue: 'Kazoo Hollow Room, Fortitude Valley\u00a0· Sat\u00a014\u00a0Nov',
    daily: DAILY_TICKETS,
    sellThrough: 0.61,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Ocean Alley',
    venue: 'Barnacle Bowl Amphitheatre, Geelong\u00a0· Sat\u00a012\u00a0Dec',
    daily: [
      27, 29, 26, 29, 31, 30, 28, 30, 32, 29, 28, 30, 31, 33, 30, 29, 31, 32,
      30, 29, 31, 32, 33, 31, 30, 32, 33, 31, 32, 34
    ],
    sellThrough: 0.51,
    pace: 101,
    gross: 183000
  },
  {
    show: 'King Stingray',
    venue: 'Nimbus Thistle Hall, Darwin\u00a0· Sat\u00a05\u00a0Dec',
    daily: [
      4, 5, 6, 5, 7, 8, 7, 9, 10, 9, 11, 12, 11, 13, 14, 14, 15, 17, 16, 17, 19,
      18, 20, 21, 20, 22, 23, 23, 24, 26
    ],
    sellThrough: 0.75,
    pace: 121,
    gross: 61600
  },
  {
    show: 'Middle Kids',
    venue: 'Echidna Gaslight Theatre, Newcastle\u00a0· Sat\u00a021\u00a0Nov',
    daily: [
      9, 8, 9, 8, 8, 9, 8, 7, 8, 7, 8, 7, 7, 6, 7, 6, 7, 7, 6, 6, 7, 6, 5, 6, 6,
      5, 6, 5, 5, 6
    ],
    sellThrough: 0.53,
    pace: 94,
    gross: 38200
  },
  {
    show: 'Julia Jacklin',
    venue: 'Opal Harpoon Room, Hobart\u00a0· Sat\u00a028\u00a0Nov',
    daily: JULIA_DAILY,
    sellThrough: 0.4,
    pace: 78,
    gross: 22900
  },
  {
    show: 'Genesis Owusu',
    venue: 'The Quilted Walrus Room, Surry Hills\u00a0· Sat\u00a019\u00a0Dec',
    daily: [
      3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1,
      1, 1, 1, 1, 1
    ],
    sellThrough: 0.28,
    pace: 66,
    gross: 12400
  },
  {
    show: 'Angie McMahon',
    venue: 'Wobbly Teacup Room, Brunswick\u00a0· Sat\u00a030\u00a0Jan',
    daily: [95, 85],
    sellThrough: 0.18,
    pace: 'On sale 2 days',
    gross: 11200
  }
]

/** The dates the portfolio's sales cover, for the period toolbar too. */
export const portfolioDates = {
  today: '2026-10-15',
  timeZone: 'Australia/Melbourne',
  dataStart: '2026-07-20',
  dataEnd: '2026-10-15'
}

const NOW = new Date('2026-10-15T02:00:00Z')
const WINDOW_DAYS = 30
// From the first on-sale, 20 Jul, to 15 Sept: the 3,846 sold before the
// shows' 30-day sparklines start.
const SOLD_BEFORE_WINDOW = [
  267, 139, 56, 19, 27, 24, 18, 24, 29, 27, 25, 32, 32, 24, 29, 34, 35, 32, 37,
  37, 31, 35, 37, 42, 40, 42, 41, 197, 153, 78, 88, 91, 86, 74, 73, 87, 70, 76,
  88, 87, 66, 121, 88, 70, 67, 84, 90, 63, 59, 88, 73, 62, 78, 93, 65, 54, 85,
  77
]
const SOLD_DAILY = [
  ...SOLD_BEFORE_WINDOW,
  ...Array.from({ length: WINDOW_DAYS }, (_, i) =>
    sum(shows.map((row) => row.daily.at(i - WINDOW_DAYS) ?? 0))
  )
]
const LAST_DAY = SOLD_DAILY.length - 1
// Early birds sell first, so the average ticket price climbs over the run.
const priceOn = (day: number) => 74.6 - (10 * (LAST_DAY - day)) / LAST_DAY
const refundRateOn = (day: number) =>
  0.0105 + (0.0075 * (LAST_DAY - day)) / LAST_DAY + 0.0015 * Math.sin(day / 4)

const DEFAULT_PERIOD: PortfolioPeriod = {
  range: { direction: 'past', amount: 30, unit: 'day' },
  compare: 'previous-period'
}

export type PortfolioPeriod = Pick<DashboardPeriodSpec, 'range' | 'compare'>

const dayOf = (iso: string) =>
  Math.round((Date.parse(iso) - Date.parse(portfolioDates.dataStart)) / DAY)
const dayAt = (edge: string | number | null, open: number) =>
  edge === null
    ? open
    : dayOf(
        typeof edge === 'string'
          ? edge
          : plainDateOf(new Date(edge), portfolioDates.timeZone)
      )

function daysIn(range: ResolvedDateRange | null): number[] {
  if (!range) return []
  const first = Math.max(0, dayAt(range.start, 0))
  const last = Math.min(LAST_DAY, dayAt(range.end, LAST_DAY))
  return Array.from(
    { length: Math.max(0, last - first + 1) },
    (_, i) => first + i
  )
}

function totals(days: readonly number[]) {
  const sold = sum(days.map((day) => SOLD_DAILY[day]!))
  const gross = sum(days.map((day) => SOLD_DAILY[day]! * priceOn(day)))
  const refunds = sum(days.map((day) => SOLD_DAILY[day]! * refundRateOn(day)))
  return { sold, gross, refundRate: sold ? refunds / sold : 0 }
}

/** Daily up to a month, then whole weeks back from the period's end. */
function buckets(days: readonly number[]): number[][] {
  const size = days.length <= 31 ? 1 : 7
  const out: number[][] = []
  for (let end = days.length; end >= size; end -= size)
    out.unshift(days.slice(end - size, end))
  return out
}

// Per day, so a comparison of another length, such as custom dates or a
// month cut short by the data, still compares fairly.
const change = (
  now: number,
  nowDays: number,
  before: number,
  beforeDays: number
) =>
  before && nowDays
    ? Math.round((((now / nowDays) * beforeDays) / before - 1) * 100) / 100
    : 0

function periodStats({ range, compare }: PortfolioPeriod) {
  const options = { now: NOW, ...portfolioDates }
  const days = daysIn(resolveDateRange(range, options))
  const compared =
    compare && isBuiltInComparison(compare)
      ? resolveComparison(range, compare, options)
      : undefined
  const beforeDays = daysIn(compared?.range ?? null)
  const now = totals(days)
  const before = totals(beforeDays)
  const nothingBefore = compared?.status === 'available' && !before.sold
  const trend = buckets(days).map(totals)
  return {
    history: nothingBefore
      ? ('unavailable' as const)
      : compared && compared.status !== 'available'
        ? compared.status
        : undefined,
    state: now.sold ? undefined : ('empty' as const),
    sold: {
      value: now.sold,
      delta: change(now.sold, days.length, before.sold, beforeDays.length),
      trend: trend.map((t) => t.sold)
    },
    gross: {
      value: Math.round(now.gross),
      delta: change(now.gross, days.length, before.gross, beforeDays.length),
      trend: trend.map((t) => Math.round(t.gross))
    },
    refunds: {
      value: Math.round(now.refundRate * 1000) / 1000,
      delta: before.sold
        ? Math.round((now.refundRate - before.refundRate) * 1000) / 10 || 0
        : 0,
      trend: trend.map((t) => Math.round(t.refundRate * 10000) / 10000)
    }
  }
}

/**
 * Pass a period to get its numbers, as an app would fetch them. The cards
 * after the first section describe the shows now, whatever the period.
 */
export function createPortfolioDashboard(
  period: PortfolioPeriod = DEFAULT_PERIOD
): DashboardSpec {
  const { history, state, sold, gross, refunds } = periodStats(period)
  const empty = state && { state, emptyMessage: 'No sales in this period' }
  return {
    version: 1,
    title: 'Ostrich Bonnet Touring',
    period: history ? { ...period, history } : period,
    sections: [
      {
        title: 'At a glance',
        cards: [
          {
            id: 'next',
            kind: 'note',
            size: 'full',
            label: 'What to do next',
            body: 'Julia Jacklin and Genesis Owusu are furthest behind similar shows. Julia Jacklin plays first, so start there.'
          },
          {
            id: 'tickets',
            ...empty,
            kind: 'stat',
            size: 'stat',
            label: 'Tickets sold',
            value: sold.value,
            delta: { value: sold.delta, format: 'percent', comparison: true },
            trend: sold.trend
          },
          {
            id: 'gross',
            ...empty,
            kind: 'stat',
            size: 'stat',
            label: 'Gross revenue',
            value: gross.value,
            format: 'compactCurrency',
            delta: { value: gross.delta, format: 'percent', comparison: true },
            trend: gross.trend
          },
          {
            id: 'behind',
            kind: 'stat',
            size: 'stat',
            label: 'Shows behind',
            value: 3,
            delta: { value: 1, goodWhen: 'down' },
            context: 'Of 7 on sale',
            trend: [1, 1, 2, 2, 2, 3, 2, 3]
          },
          {
            id: 'refunds',
            ...empty,
            kind: 'stat',
            size: 'stat',
            label: 'Refund rate',
            value: refunds.value,
            format: 'percent',
            delta: {
              value: refunds.delta,
              format: 'points',
              goodWhen: 'down',
              comparison: true
            },
            trend: refunds.trend
          }
        ]
      },
      {
        title: 'On sale',
        cards: [
          {
            id: 'shows',
            kind: 'table',
            size: 'full',
            label: 'Upcoming shows',
            takeaway: 'Three shows are behind similar shows',
            columns: [
              {
                key: 'show',
                header: 'Show',
                kind: 'text',
                pin: true,
                secondaryKey: 'venue'
              },
              {
                key: 'daily',
                header: 'Daily sales, 30 days',
                kind: 'sparkline',
                priority: 3
              },
              {
                key: 'sellThrough',
                header: 'Sell-through',
                kind: 'meter',
                target: 0.85,
                priority: 2
              },
              {
                key: 'pace',
                header: 'Pace index',
                kind: 'delta',
                format: 'index',
                baseline: 100
              },
              {
                key: 'gross',
                header: 'Gross',
                kind: 'number',
                format: 'compactCurrency',
                priority: 1
              }
            ],
            rows: shows,
            source: 'Oztix sales. Pace against 38 similar shows.'
          }
        ]
      },
      {
        title: 'Pace',
        cards: [
          {
            id: 'behind-pace',
            kind: 'chart',
            size: 'full',
            label: 'Julia Jacklin pace',
            value: 0.4,
            format: 'percent',
            delta: { value: -12, format: 'points' },
            context: 'Behind similar shows. Forecast 74%',
            plot: {
              kind: 'line',
              data: juliaPace,
              x: 'day',
              y: 'sold',
              format: 'percent',
              takeaway:
                'Julia Jacklin tracks below similar shows and is forecast to reach 74%',
              band: {
                low: 'low',
                high: 'high',
                median: 'median',
                label: 'Similar shows'
              },
              forecast: {
                from: isoDaysOut(TODAY),
                low: 'coneLow',
                high: 'coneHigh'
              },
              target: 0.85,
              today: isoDaysOut(TODAY)
            },
            source: 'Oztix sales. 38 similar shows, last 3 years.'
          },
          {
            id: 'portfolio-pace',
            kind: 'chart',
            size: 'full',
            label: 'Pace against sell-through',
            takeaway: portfolioExample.takeaway,
            plot: { kind: 'scatter', ...portfolioExample },
            source: 'Oztix sales. Pace against 38 similar shows.'
          }
        ]
      }
    ]
  }
}
