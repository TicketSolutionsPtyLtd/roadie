import type { HistogramProps } from './types'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}

const random = seeded(42)
export const leadTimeExample: HistogramProps = {
  data: Array.from({ length: 600 }, () => ({
    days: Math.round(-Math.log(1 - random()) * 18)
  })),
  x: 'days',
  binWidth: 7,
  median: true,
  takeaway: 'Half of buyers book within two weeks of the show'
}

const sizes = [1, 2, 2, 2, 2, 3, 4, 4, 2, 1, 6, 2]
export const orderSizeExample: HistogramProps = {
  data: Array.from({ length: 480 }, (_, i) => ({
    tickets: sizes[i % sizes.length]!
  })),
  x: 'tickets',
  binWidth: 1,
  median: true,
  takeaway: 'Most orders are for two tickets'
}
