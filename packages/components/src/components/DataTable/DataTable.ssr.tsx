import { DataTable } from '.'

export const SparklineAndMeter = () => (
  <DataTable
    caption='Upcoming shows'
    columns={[
      { key: 'show', header: 'Show', kind: 'text', pin: true },
      { key: 'daily', header: 'Daily sales', kind: 'sparkline' },
      { key: 'sold', header: 'Sell-through', kind: 'meter' }
    ]}
    rows={[
      { show: 'Ember Galah', daily: [22, 30, 41, 52], sold: 0.8 },
      { show: 'Harbour Moth', daily: [90, 95, 102, 94], sold: 0.5 }
    ]}
  />
)
