import type { StackedBarsProps } from './types'

// The show dashboard's sales by month: 1,464 sold, matching its ticket types.
export const ticketMixExample: StackedBarsProps = {
  data: (
    [
      ['Aug', 'GA', 414],
      ['Aug', 'VIP', 60],
      ['Aug', 'Early bird', 300],
      ['Sep', 'GA', 213],
      ['Sep', 'VIP', 40],
      ['Sep', 'Early bird', 0],
      ['Oct', 'GA', 377],
      ['Oct', 'VIP', 60],
      ['Oct', 'Early bird', 0]
    ] satisfies [string, string, number][]
  ).map(([month, type, sold]) => ({ month, type, sold })),
  x: 'month',
  y: 'sold',
  series: 'type',
  takeaway: 'GA is carrying the show'
}

export const presaleExample: StackedBarsProps = {
  data: [
    { show: 'The Lantern Room', phase: 'Presale', sold: 820 },
    { show: 'The Lantern Room', phase: 'General', sold: 644 },
    { show: 'Harbourside Hall', phase: 'Presale', sold: 310 },
    { show: 'Harbourside Hall', phase: 'General', sold: 1190 }
  ],
  x: 'show',
  y: 'sold',
  series: 'phase',
  mode: 'share',
  highlight: 'Presale',
  takeaway: 'Presale did most of the work at The Lantern Room'
}

export const resaleExample: StackedBarsProps = {
  data: ['Sep', 'Oct', 'Nov'].flatMap((month, i) => [
    { month, kind: 'Resold', tickets: 40 + i * 25 },
    { month, kind: 'Kept', tickets: 1400 - i * 25 }
  ]),
  x: 'month',
  y: 'tickets',
  series: 'kind',
  mode: 'share',
  orientation: 'vertical',
  takeaway: 'Resale is climbing as the show nears'
}
