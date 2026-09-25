import type { BarChartProps } from './types'

const hour = (h: number, m = 0) =>
  `2026-11-14T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

const onSaleOrders: [string, number][] = [
  ['09:00', 1840],
  ['10:00', 920],
  ['11:00', 410],
  ['12:00', 260],
  ['13:00', 210],
  ['14:00', 190],
  ['15:00', 170],
  ['16:00', 160],
  ['17:00', 220],
  ['18:00', 240]
]

export const onSaleExample: BarChartProps = {
  data: onSaleOrders.map(([time, orders]) => ({
    time: `2026-08-03T${time}`,
    orders
  })),
  x: 'time',
  y: 'orders',
  interval: 'hour',
  takeaway: 'The first hour took 40% of the day’s orders',
  annotations: [{ at: '2026-08-03T09:00', label: 'General on-sale' }]
}

export const scanRateExample: BarChartProps = {
  data: Array.from({ length: 12 }, (_, i) => {
    const scans = Math.round(60 + 240 * Math.exp(-(((i - 4) / 2.2) ** 2)))
    return { time: hour(17 + Math.floor((i * 15) / 60), (i * 15) % 60), scans }
  }).map((row, i, rows) => ({
    ...row,
    inside:
      Math.round(
        (rows.slice(0, i + 1).reduce((sum, r) => sum + r.scans, 0) / 2400) * 100
      ) / 100
  })),
  x: 'time',
  y: 'scans',
  interval: 'hour',
  takeaway: 'Entry peaked at 6pm, with 69% inside by 8pm',
  line: { y: 'inside', label: 'Inside', format: 'percent' }
}

export const dailyOrdersExample: BarChartProps = {
  data: Array.from({ length: 21 }, (_, i) => ({
    day: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10),
    orders: [42, 38, 51, 60, 94, 120, 88][i % 7]! + i * 3
  })),
  x: 'day',
  y: 'orders',
  takeaway: 'Orders peak on Tuesdays and grow each week'
}
