import { PACE_EXAMPLE } from '@/app/charts/pace-example'

import { Chart } from '@oztix/roadie-charts/chart'
import { LineChart } from '@oztix/roadie-charts/line-chart'

const TAKEAWAY = 'Tracking ahead of similar shows'

/** The pace chart at full size, with every reading aid drawn. */
export function ReadingAidsChart() {
  // A block parent keeps the card's `h-full` from stretching to the prose column.
  return (
    <div data-not-prose data-slot='reading-aids-chart'>
      <Chart
        label='Pace against similar shows'
        takeaway={TAKEAWAY}
        source='Oztix sales. 38 similar shows, last 3 years.'
        size='full'
      >
        <LineChart {...PACE_EXAMPLE} takeaway={TAKEAWAY} />
      </Chart>
    </div>
  )
}
