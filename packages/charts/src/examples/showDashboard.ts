import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

import { paceImage } from './paceImage'

const DAILY_SOLD = [
  40, 62, 70, 88, 95, 120, 131, 160, 172, 190, 214, 240, 262, 300, 330, 351,
  380, 420, 470, 520
]
const SELL_THROUGH = [
  0.31, 0.33, 0.36, 0.38, 0.41, 0.44, 0.46, 0.49, 0.52, 0.55, 0.57, 0.6, 0.62,
  0.64, 0.67, 0.69, 0.71, 0.73, 0.75, 0.77
]
const PACE = [
  96, 98, 97, 101, 104, 103, 106, 108, 107, 105, 104, 107, 109, 110, 108, 110,
  111, 113, 112, 112
]
const REVENUE = [
  9, 7, 8, 11, 12, 9, 8, 10, 12, 14, 13, 11, 9, 8, 10, 9, 8, 7, 8, 7
].map((k) => k * 1000)

export function createShowDashboard(assetBase = ''): DashboardSpec {
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
            body: 'GA is carrying the show and VIP is 27 points short of target. Push VIP in the final month.'
          },
          {
            id: 'sold',
            kind: 'stat',
            size: 'stat',
            label: 'Tickets sold',
            value: 1842,
            delta: { value: 214 },
            context: 'This week',
            trend: DAILY_SOLD
          },
          {
            id: 'sell-through',
            kind: 'stat',
            size: 'stat',
            label: 'Sell-through',
            value: 0.77,
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
            delta: { value: -0.04, format: 'percent' },
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
            plot: {
              kind: 'static',
              ...paceImage(assetBase, 'pace-ahead'),
              narrow: paceImage(assetBase, 'pace-ahead-narrow'),
              wide: paceImage(assetBase, 'pace-ahead-wide'),
              alt: 'This show tracks above the band of 38 similar shows and is forecast to reach 96% by show day'
            },
            table: {
              columns: [
                { key: 'days', header: 'Days to show', kind: 'number' },
                {
                  key: 'show',
                  header: 'This show',
                  kind: 'number',
                  format: 'percent'
                },
                {
                  key: 'similar',
                  header: 'Similar shows',
                  kind: 'number',
                  format: 'percent'
                }
              ],
              rows: [
                { days: 90, show: 0.14, similar: 0.14 },
                { days: 60, show: 0.38, similar: 0.35 },
                { days: 30, show: 0.61, similar: 0.52 }
              ]
            },
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
              { type: 'GA early bird', sold: '400 sold', sellThrough: 1 },
              { type: 'GA', sold: '1,210 sold', sellThrough: 0.76 },
              { type: 'VIP', sold: '232 sold', sellThrough: 0.58 }
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
      }
    ]
  }
}
