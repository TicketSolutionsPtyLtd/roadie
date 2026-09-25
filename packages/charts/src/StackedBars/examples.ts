import type { StackedBarsProps } from './types'

export const ticketMixExample: StackedBarsProps = {
  data: (
    [
      ['Friday', 'GA', 1210],
      ['Friday', 'VIP', 232],
      ['Friday', 'Early bird', 300],
      ['Saturday', 'GA', 1480],
      ['Saturday', 'VIP', 310],
      ['Saturday', 'Early bird', 300],
      ['Sunday', 'GA', 640],
      ['Sunday', 'VIP', 96],
      ['Sunday', 'Early bird', 300]
    ] satisfies [string, string, number][]
  ).map(([show, type, sold]) => ({ show, type, sold })),
  x: 'show',
  y: 'sold',
  series: 'type',
  takeaway: 'Sunday is the show to push'
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
