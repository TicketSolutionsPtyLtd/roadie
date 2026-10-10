import { Chart } from '@oztix/roadie-charts/chart'
import { RankedBars } from '@oztix/roadie-charts/ranked-bars'
import { DataCard } from '@oztix/roadie-components/data-card'
import { Meter } from '@oztix/roadie-components/meter'
import { Sparkline } from '@oztix/roadie-components/sparkline'
import { StatTile } from '@oztix/roadie-components/stat-tile'

const TICKETS_THIS_WEEK = [1200, 1340, 1480, 1600, 1720, 1780, 1842]

/** A number, a meter, a sparkline, and ranked bars, the forms a client meets most. */
export function FormExamples() {
  return (
    <div data-not-prose data-slot='form-examples' className='grid gap-6'>
      <div className='grid gap-4 sm:grid-cols-3'>
        <StatTile
          label='Tickets sold'
          value={1842}
          trend={TICKETS_THIS_WEEK}
          context='This week'
        />
        <DataCard size='sm' label='VIP sell-through' context='Target 85%'>
          <Meter label='VIP sell-through' value={68} max={100} target={85} />
        </DataCard>
        <div className='w-48'>
          <Sparkline
            values={TICKETS_THIS_WEEK}
            label='Tickets sold, this week'
          />
        </div>
      </div>
      <div className='max-w-xl'>
        <Chart
          label='Where buyers came from'
          takeaway='Email brings in nearly half of orders'
          source='Oztix sales.'
          size='md'
        >
          <RankedBars
            data={[
              { channel: 'Email', orders: 612 },
              { channel: 'Instagram', orders: 388 },
              { channel: 'Direct', orders: 301 }
            ]}
            x='channel'
            y='orders'
            highlight='Email'
          />
        </Chart>
      </div>
    </div>
  )
}
