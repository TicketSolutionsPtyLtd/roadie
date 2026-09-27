import type { FunnelProps } from './types'

// The audience dashboard's show: 612 paid orders.
export const checkoutExample: FunnelProps = {
  steps: [
    { label: 'Viewed event', value: 5180 },
    { label: 'Chose tickets', value: 1760 },
    { label: 'Started checkout', value: 995 },
    { label: 'Paid', value: 612 }
  ],
  takeaway: 'Most visitors leave before choosing tickets'
}

export const waitlistExample: FunnelProps = {
  steps: [
    { label: 'Joined waitlist', value: 3100 },
    { label: 'Got an offer', value: 900 },
    { label: 'Bought', value: 610 }
  ],
  takeaway: 'Two in three waitlist offers turn into sales'
}
