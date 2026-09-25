import type { FunnelProps } from './types'

export const checkoutExample: FunnelProps = {
  steps: [
    { label: 'Viewed event', value: 12400 },
    { label: 'Chose tickets', value: 4210 },
    { label: 'Started checkout', value: 2380 },
    { label: 'Paid', value: 1464 }
  ],
  takeaway: 'Most buyers drop out before choosing tickets'
}

export const waitlistExample: FunnelProps = {
  steps: [
    { label: 'Joined waitlist', value: 3100 },
    { label: 'Got an offer', value: 900 },
    { label: 'Bought', value: 610 }
  ],
  takeaway: 'Two in three waitlist offers turn into sales'
}
