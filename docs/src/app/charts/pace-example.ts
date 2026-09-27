import type { LineChartProps } from '@oztix/roadie-charts/line-chart'

export const PACE_EXAMPLE: LineChartProps = {
  data: [
    { day: '2026-09-01', sold: 0.14, low: 0.07, high: 0.22, median: 0.14 },
    { day: '2026-09-15', sold: 0.3, low: 0.18, high: 0.33, median: 0.25 },
    { day: '2026-10-01', sold: 0.45, low: 0.28, high: 0.43, median: 0.35 },
    {
      day: '2026-10-15',
      sold: 0.61,
      low: 0.38,
      high: 0.53,
      median: 0.45,
      coneLow: 0.61,
      coneHigh: 0.61
    },
    {
      day: '2026-11-01',
      sold: 0.8,
      low: 0.55,
      high: 0.7,
      median: 0.62,
      coneLow: 0.75,
      coneHigh: 0.85
    },
    {
      day: '2026-11-14',
      sold: 0.96,
      low: 0.78,
      high: 0.93,
      median: 0.85,
      coneLow: 0.89,
      coneHigh: 1
    }
  ],
  x: 'day',
  y: 'sold',
  format: 'percent',
  band: { low: 'low', high: 'high', median: 'median', label: 'Similar shows' },
  forecast: { from: '2026-10-15', low: 'coneLow', high: 'coneHigh' },
  target: 0.85,
  today: '2026-10-15'
}
