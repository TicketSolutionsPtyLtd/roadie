import { DataTable } from '.'

export const ChartCells = () => (
  <DataTable
    caption='Upcoming shows'
    columns={[
      { key: 'show', header: 'Show', kind: 'text', pin: true },
      { key: 'daily', header: 'Daily sales', kind: 'sparkline' },
      { key: 'sellThrough', header: 'Sell-through', kind: 'meter' },
      { key: 'gross', header: 'Gross', kind: 'number' }
    ]}
    rows={[
      { show: 'Custard', daily: [22, 30, 41], sellThrough: 0.8, gross: 120000 }
    ]}
  />
)
