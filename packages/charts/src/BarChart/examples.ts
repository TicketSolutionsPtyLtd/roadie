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

// The show dashboard's last three weeks; Fridays lead, as in whenFansBuyExample.
const dailyOrders = [
  15, 12, 9, 7, 7, 8, 10, 19, 16, 11, 9, 10, 10, 13, 21, 18, 12, 9, 10, 11, 15
]

export const dailyOrdersExample: BarChartProps = {
  data: dailyOrders.map((orders, i) => ({
    day: new Date(Date.UTC(2026, 8, 25 + i)).toISOString().slice(0, 10),
    orders
  })),
  x: 'day',
  y: 'orders',
  takeaway: 'Orders peak on Fridays and grow each week'
}
