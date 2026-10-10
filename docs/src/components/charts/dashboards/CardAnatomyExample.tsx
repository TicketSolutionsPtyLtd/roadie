import { PACE_EXAMPLE } from '@/app/charts/pace-example'

import { Chart } from '@oztix/roadie-charts/chart'
import { ChartLegend } from '@oztix/roadie-charts/chart-legend'
import { LineChart } from '@oztix/roadie-charts/line-chart'

/** A pace chart card with every part of the anatomy filled in. */
export function CardAnatomyExample() {
  return (
    <div data-not-prose className='grid'>
      <Chart
        label='Pace to date'
        value={0.61}
        format='percent'
        delta={{ value: 16, format: 'points' }}
        context='Forecast 96% by show day'
        source='Oztix sales. 38 similar shows.'
        size='md'
        legend={
          <ChartLegend
            items={[
              { label: 'This show', shape: 'line' },
              { label: 'Forecast', shape: 'dot' },
              {
                label: 'Similar shows',
                shape: 'band',
                color: 'var(--chart-band)'
              }
            ]}
          />
        }
      >
        <LineChart
          {...PACE_EXAMPLE}
          takeaway='Tracking ahead of similar shows, forecast to reach 96%'
        />
      </Chart>
    </div>
  )
}
