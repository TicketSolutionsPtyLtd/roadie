import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

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
    venue: 'The Lantern Room, Fortitude Valley\u00a0· Sat\u00a014\u00a0Nov',
    daily: DAILY_TICKETS,
    sellThrough: 0.61,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Ocean Alley',
    venue: 'Parkside Amphitheatre, Geelong\u00a0· Sat\u00a012\u00a0Dec',
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
    venue: 'Saltwater Hall, Darwin\u00a0· Sat\u00a05\u00a0Dec',
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
    venue: 'Harbourline Theatre, Newcastle\u00a0· Sat\u00a021\u00a0Nov',
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
    venue: 'The Gasworks Room, Hobart\u00a0· Sat\u00a028\u00a0Nov',
    daily: JULIA_DAILY,
    sellThrough: 0.4,
    pace: 78,
    gross: 22900
  },
  {
    show: 'Genesis Owusu',
    venue: 'The Velvet Room, Surry Hills\u00a0· Sat\u00a019\u00a0Dec',
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
    venue: 'The Paper Moth, Brunswick\u00a0· Sat\u00a030\u00a0Jan',
    daily: [95, 85],
    sellThrough: 0.18,
    pace: 'On sale 2 days',
    gross: 11200
  }
]

export function createPortfolioDashboard(): DashboardSpec {
  return {
    version: 1,
    title: 'Riverbend Touring',
    sections: [
      {
        title: 'This month',
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
            kind: 'stat',
            size: 'stat',
            label: 'Tickets sold',
            value: 6377,
            delta: { value: 0.08, format: 'percent' },
            context: 'On last month',
            trend: [4450, 4790, 5040, 5210, 5470, 5690, 5905, 6377]
          },
          {
            id: 'gross',
            kind: 'stat',
            size: 'stat',
            label: 'Gross revenue',
            value: 447700,
            format: 'compactCurrency',
            delta: { value: 0.05, format: 'percent' },
            context: 'On last month',
            trend: [
              310000, 330000, 350000, 372000, 391000, 410000, 426000, 447700
            ]
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
            kind: 'stat',
            size: 'stat',
            label: 'Refund rate',
            value: 0.012,
            format: 'percent',
            delta: { value: -0.3, format: 'points', goodWhen: 'down' },
            context: 'On last month',
            trend: [0.02, 0.018, 0.017, 0.016, 0.015, 0.014, 0.013, 0.012]
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
