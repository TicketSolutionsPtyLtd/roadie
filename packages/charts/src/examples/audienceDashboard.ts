import type { DashboardSpec } from '@oztix/roadie-core/dashboard'

import { checkoutExample } from '../Funnel/examples'
import { leadTimeExample } from '../Histogram/examples'
import { suburbExample } from '../RankedBars/examples'

const AGES: [age: string, gender: string, buyers: number][] = [
  ['18 to 24', 'Women', 88],
  ['18 to 24', 'Men', 61],
  ['18 to 24', 'Another gender', 6],
  ['25 to 34', 'Women', 174],
  ['25 to 34', 'Men', 112],
  ['25 to 34', 'Another gender', 9],
  ['35 to 44', 'Women', 71],
  ['35 to 44', 'Men', 58],
  ['35 to 44', 'Another gender', 3],
  ['45 and over', 'Women', 18],
  ['45 and over', 'Men', 12],
  ['45 and over', 'Another gender', 0]
]

// Read on show day, so the final week is leadTimeExample's first bin.
export function createAudienceDashboard(): DashboardSpec {
  return {
    version: 1,
    title: 'Who is buying for Middle Kids at Wattle Street Social',
    sections: [
      {
        title: 'Buyers',
        description: 'Sat 5 Dec, 1,300 capacity',
        cards: [
          {
            id: 'buyers',
            kind: 'stat',
            size: 'stat',
            label: 'Buyers',
            value: 612,
            delta: { value: 177 },
            context: 'In the final week'
          },
          {
            id: 'new-buyers',
            kind: 'stat',
            size: 'stat',
            label: 'New to the venue',
            value: 0.58,
            format: 'percent',
            delta: { value: 6, format: 'points' },
            context: 'Of buyers'
          },
          {
            id: 'tickets-per-order',
            kind: 'stat',
            size: 'stat',
            label: 'Tickets per order',
            value: 2.1,
            context: '2.3 at similar shows'
          },
          {
            id: 'lead-time',
            kind: 'stat',
            size: 'stat',
            label: 'Median lead time',
            value: '12 days',
            context: '19 at similar shows'
          },
          {
            id: 'age',
            kind: 'chart',
            size: 'md',
            label: 'Age and gender',
            takeaway: 'Women aged 25 to 34 are the biggest group',
            plot: {
              kind: 'stacked-bars',
              data: AGES.map(([age, gender, buyers]) => ({
                age,
                gender,
                buyers
              })),
              x: 'age',
              y: 'buyers',
              series: 'gender'
            },
            source: 'Oztix accounts, where buyers shared it.'
          },
          {
            id: 'checkout',
            kind: 'chart',
            size: 'md',
            label: 'Checkout',
            takeaway: checkoutExample.takeaway,
            plot: { kind: 'funnel', ...checkoutExample },
            source: 'Oztix checkout events.'
          },
          {
            id: 'lead-time-spread',
            kind: 'chart',
            size: 'md',
            label: 'Booking lead time',
            takeaway: leadTimeExample.takeaway,
            plot: { kind: 'histogram', ...leadTimeExample },
            source: 'Oztix sales.'
          },
          {
            id: 'suburbs',
            kind: 'chart',
            size: 'md',
            label: 'Where buyers live',
            takeaway: suburbExample.takeaway,
            plot: { kind: 'ranked-bars', ...suburbExample },
            source: 'Oztix sales, billing postcodes.'
          }
        ]
      }
    ]
  }
}
