import type { ReactNode } from 'react'

import { DatavizSwatches } from '@/components/dataviz/DatavizSwatches'

import { Chart } from '@oztix/roadie-charts/chart'
import { Heatmap } from '@oztix/roadie-charts/heatmap'
import { StackedBars } from '@oztix/roadie-charts/stacked-bars'
import { StatTile } from '@oztix/roadie-components/stat-tile'

const MIX = [
  { show: 'Friday', type: 'GA', sold: 1210 },
  { show: 'Friday', type: 'VIP', sold: 232 },
  { show: 'Friday', type: 'Early bird', sold: 300 },
  { show: 'Saturday', type: 'GA', sold: 1480 },
  { show: 'Saturday', type: 'VIP', sold: 310 },
  { show: 'Saturday', type: 'Early bird', sold: 300 }
]

const ORDERS_BY_WEEKDAY = [
  [4, 8, 10, 18, 12],
  [5, 9, 11, 20, 13],
  [5, 9, 12, 22, 14],
  [6, 10, 14, 30, 22],
  [8, 12, 18, 42, 36],
  [14, 22, 20, 24, 18],
  [12, 18, 16, 14, 8]
]

const WHEN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap(
  (weekday, r) =>
    ['9am', '12pm', '3pm', '6pm', '9pm'].map((hour, c) => ({
      weekday,
      hour,
      orders: ORDERS_BY_WEEKDAY[r]![c]!
    }))
)

const VERSUS = [
  'Kazoo Hollow Room',
  'Antler Kettle Hall',
  'Saltbush Trumpet Ballroom'
].flatMap((venue, r) =>
  ['Floor', 'Balcony'].map((section, c) => ({
    venue,
    section,
    versus: [0.12, -0.06, 0.04, -0.1, 0.08, -0.03][r * 2 + c]!
  }))
)

const EXAMPLES = {
  categorical: (
    <div className='max-w-xl'>
      <Chart
        label='Ticket type mix'
        takeaway='GA carries both nights'
        source='Oztix sales.'
        size='md'
      >
        <StackedBars data={MIX} x='show' y='sold' series='type' />
      </Chart>
    </div>
  ),
  heat: (
    <Chart
      label='When fans buy'
      takeaway='Fans buy most on Friday evenings'
      source='Oztix sales, venue time.'
      size='lg'
    >
      <Heatmap data={WHEN} rows='weekday' columns='hour' value='orders' />
    </Chart>
  ),
  diverging: (
    <div className='max-w-xl'>
      <Chart
        label='Pace by section'
        takeaway='The balconies are behind'
        source='Oztix sales.'
        size='md'
      >
        <Heatmap
          data={VERSUS}
          rows='venue'
          columns='section'
          value='versus'
          scale='diverging'
          format='percent'
        />
      </Chart>
    </div>
  ),
  status: (
    <div className='grid gap-3 sm:grid-cols-3'>
      <StatTile
        label='Sell-through'
        value={0.61}
        format='percent'
        delta={{ value: 9, format: 'points' }}
        context='Target 85%'
      />
      <StatTile
        label='Gross revenue'
        value={118400}
        format='compactCurrency'
        delta={{ value: -0.04, format: 'percent' }}
        context='This week'
      />
      <StatTile
        label='Orders'
        value={1310}
        delta={{ value: 0.18, format: 'percent' }}
        context='This week'
      />
    </div>
  )
} satisfies Record<string, ReactNode>

/** A palette's swatches with a ticketing chart that uses it for its job. */
export function PaletteExample({ kind }: { kind: keyof typeof EXAMPLES }) {
  return (
    <div
      data-not-prose
      data-slot='palette-example'
      data-kind={kind}
      className='grid gap-8 rounded-xl border border-subtler p-4 sm:p-6'
    >
      <DatavizSwatches kind={kind} />
      {EXAMPLES[kind]}
    </div>
  )
}
