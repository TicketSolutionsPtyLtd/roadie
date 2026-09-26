import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

import { dailyOrdersExample } from '../BarChart/examples'
import { whenFansBuyExample } from '../Heatmap/examples'
import { paceExample } from '../LineChart/examples'
import { ticketMixExample } from '../StackedBars/examples'

// Tickets a day for the 30 days to Thu 15 Oct, following paceExample.
export const DAILY_TICKETS = [
  6, 9, 15, 10, 9, 8, 6, 7, 12, 33, 27, 21, 15, 16, 19, 22, 43, 37, 24, 20, 24,
  22, 29, 48, 40, 27, 21, 22, 25, 33
]
const DAILY_SOLD = DAILY_TICKETS.slice(-20)
const SELL_THROUGH = [
  0.4, 0.41, 0.41, 0.42, 0.43, 0.44, 0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52,
  0.54, 0.56, 0.57, 0.58, 0.59, 0.6, 0.61
]
const PACE = [
  96, 98, 97, 101, 104, 103, 106, 108, 107, 105, 104, 107, 109, 110, 108, 110,
  111, 113, 112, 112
]
const REVENUE = DAILY_SOLD.map((tickets) => Math.round(tickets * 0.81) * 100)

export function createShowDashboard(): DashboardSpec {
  return {
    version: 1,
    title: 'Ball Park Music at The Lantern Room',
    sections: [
      {
        title: 'At a glance',
        description: 'Sat 14 Nov, 30 days to go',
        cards: [
          {
            id: 'note',
            kind: 'note',
            size: 'full',
            label: 'What to do next',
            body: 'GA is carrying the show and VIP is 45 points short of target. Push VIP in the final month.'
          },
          {
            id: 'sold',
            kind: 'stat',
            size: 'stat',
            label: 'Tickets sold',
            value: 1464,
            delta: { value: 216 },
            context: 'This week, of 2,400',
            trend: DAILY_SOLD
          },
          {
            id: 'sell-through',
            kind: 'stat',
            size: 'stat',
            label: 'Sell-through',
            value: 0.61,
            format: 'percent',
            delta: { value: 9, format: 'points' },
            context: 'Target 85%',
            trend: SELL_THROUGH,
            reference: { value: 0.85, label: 'Target' }
          },
          {
            id: 'pace',
            kind: 'stat',
            size: 'stat',
            label: 'Pace index',
            value: 112,
            format: 'index',
            delta: { value: 0.12, format: 'percent' },
            context: 'Similar shows = 100',
            trend: PACE,
            reference: { value: 100, label: 'Similar shows' }
          },
          {
            id: 'revenue',
            kind: 'stat',
            size: 'stat',
            label: 'Gross revenue',
            value: 118400,
            format: 'compactCurrency',
            delta: { value: 0.09, format: 'percent' },
            context: 'On last week',
            trend: REVENUE
          }
        ]
      },
      {
        title: 'Sales',
        cards: [
          {
            id: 'sales-pace',
            kind: 'chart',
            size: 'full',
            label: 'Sales pace',
            value: 0.61,
            format: 'percent',
            delta: { value: 9, format: 'points' },
            context: 'Ahead of similar shows. Forecast 96%',
            plot: { kind: 'line', ...paceExample },
            source: 'Oztix sales. 38 similar shows, last 3 years.'
          },
          {
            id: 'ticket-types',
            kind: 'table',
            size: 'md',
            label: 'Ticket types',
            takeaway: 'VIP is the one to push this month',
            columns: [
              {
                key: 'type',
                header: 'Ticket type',
                kind: 'text',
                secondaryKey: 'sold'
              },
              {
                key: 'sellThrough',
                header: 'Sell-through',
                kind: 'meter',
                target: 0.85
              }
            ],
            rows: [
              { type: 'GA early bird', sold: '300 of 300', sellThrough: 1 },
              { type: 'GA', sold: '1,004 of 1,700', sellThrough: 0.59 },
              { type: 'VIP', sold: '160 of 400', sellThrough: 0.4 }
            ],
            source: 'Oztix sales.'
          },
          {
            id: 'buyers',
            kind: 'table',
            size: 'md',
            label: 'Where buyers are from',
            takeaway: 'Most buyers are within 20km',
            columns: [
              { key: 'suburb', header: 'Suburb', kind: 'text' },
              {
                key: 'share',
                header: 'Share',
                kind: 'number',
                format: 'percent'
              }
            ],
            rows: [
              { suburb: 'Fortitude Valley', share: 0.14 },
              { suburb: 'West End', share: 0.11 },
              { suburb: 'Paddington', share: 0.09 },
              { suburb: 'Newstead', share: 0.07 }
            ],
            source: 'Oztix sales, billing postcodes.'
          }
        ]
      },
      {
        title: 'Buyers',
        cards: [
          {
            id: 'daily-orders',
            kind: 'chart',
            size: 'md',
            label: 'Daily orders',
            takeaway: dailyOrdersExample.takeaway,
            plot: { kind: 'bar', ...dailyOrdersExample },
            source: 'Oztix sales.'
          },
          {
            id: 'ticket-mix',
            kind: 'chart',
            size: 'md',
            label: 'Ticket type mix',
            takeaway: ticketMixExample.takeaway,
            plot: { kind: 'stacked-bars', ...ticketMixExample },
            source: 'Oztix sales.'
          },
          {
            id: 'when-fans-buy',
            kind: 'chart',
            size: 'full',
            label: 'When fans buy',
            takeaway: whenFansBuyExample.takeaway,
            plot: { kind: 'heatmap', ...whenFansBuyExample },
            source: 'Oztix sales, venue time.'
          }
        ]
      }
    ]
  }
}
