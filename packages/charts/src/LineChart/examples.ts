import type { LineChartProps } from './types'

const DAY = 86_400_000
const START = Date.UTC(2026, 7, 16)
const TODAY = 30
const POINTS = 46
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const round = (v: number) => Math.round(v * 1000) / 1000
const bench = (t: number) =>
  0.14 + 0.36 * (1 - Math.exp(-3 * t)) + 0.38 * t ** 4
const actual = (t: number) =>
  bench(t) + 0.05 * Math.sin(2 * Math.PI * t * 1.8) + 0.06 * t
const tToday = TODAY / (POINTS - 1)
const projected = (t: number) =>
  actual(tToday) + (bench(t) - bench(tToday)) * 1.02
const spread = (i: number) => ((i - TODAY) / (POINTS - 1 - TODAY)) * 0.07

export const paceExample: LineChartProps = {
  data: Array.from({ length: POINTS }, (_, i) => {
    const t = i / (POINTS - 1)
    const future = i >= TODAY
    return {
      day: iso(START + i * 2 * DAY),
      sold: round(future ? projected(t) : actual(t)),
      coneLow: future ? round(projected(t) - spread(i)) : null,
      coneHigh: future ? round(projected(t) + spread(i)) : null,
      low: round(bench(t) - 0.07),
      high: round(bench(t) + 0.08),
      median: round(bench(t))
    }
  }),
  x: 'day',
  y: 'sold',
  format: 'percent',
  takeaway: 'Tracking ahead of similar shows, forecast to reach 96%',
  band: { low: 'low', high: 'high', median: 'median', label: 'Similar shows' },
  forecast: {
    from: iso(START + TODAY * 2 * DAY),
    low: 'coneLow',
    high: 'coneHigh'
  },
  target: 0.85,
  today: iso(START + TODAY * 2 * DAY),
  annotations: [{ at: iso(START + 20 * DAY), label: 'Line-up drop' }]
}

export const salesByTypeExample: LineChartProps = {
  data: ['GA', 'VIP', 'Early bird'].flatMap((type, s) =>
    Array.from({ length: 14 }, (_, i) => ({
      day: iso(START + i * DAY),
      type,
      orders: Math.round((s === 0 ? 40 : s === 1 ? 12 : 25) * (1 + i / 10))
    }))
  ),
  x: 'day',
  y: 'orders',
  series: 'type',
  takeaway: 'GA orders are climbing fastest'
}
