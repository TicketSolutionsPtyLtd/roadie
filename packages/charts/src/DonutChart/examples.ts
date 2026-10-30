import type { DonutChartProps } from './types'

export const ticketTypeExample: DonutChartProps = {
  data: [
    { type: 'GA', tickets: 1240 },
    { type: 'Early bird', tickets: 520 },
    { type: 'VIP', tickets: 310 },
    { type: 'Concession', tickets: 220 },
    { type: 'Companion', tickets: 95 }
  ],
  x: 'type',
  y: 'tickets',
  total: 'Tickets',
  takeaway: 'GA is half of all tickets sold'
}
