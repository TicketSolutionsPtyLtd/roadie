import type { RankedBarsProps } from './types'

export const channelExample: RankedBarsProps = {
  data: [
    { channel: 'Email', orders: 612 },
    { channel: 'Instagram', orders: 388 },
    { channel: 'Direct', orders: 301 },
    { channel: 'Venue site', orders: 164 },
    { channel: 'TikTok', orders: 142 },
    { channel: 'Google', orders: 97 },
    { channel: 'Facebook', orders: 61 },
    { channel: 'Partner', orders: 33 },
    { channel: 'Podcast', orders: 18 },
    { channel: 'Other referrers', orders: 12 }
  ],
  x: 'channel',
  y: 'orders',
  highlight: 'Email',
  takeaway: 'Email brings in a third of orders'
}

export const suburbExample: RankedBarsProps = {
  data: [
    { suburb: 'Fortitude Valley', buyers: 205 },
    { suburb: 'West End', buyers: 161 },
    { suburb: 'Paddington', buyers: 132 },
    { suburb: 'Newstead', buyers: 102 },
    { suburb: 'New Farm', buyers: 96 },
    { suburb: 'Woolloongabba', buyers: 71 }
  ],
  x: 'suburb',
  y: 'buyers',
  share: true,
  limit: 5,
  takeaway: 'Most buyers live within 5km of the venue'
}

export const attendanceExample: RankedBarsProps = {
  data: [
    { show: 'Friday', attended: 0.94, similar: 0.9 },
    { show: 'Saturday', attended: 0.91, similar: 0.92 },
    { show: 'Sunday matinee', attended: 0.83, similar: 0.86 }
  ],
  x: 'show',
  y: 'attended',
  format: 'percent',
  reference: { field: 'similar', label: 'Similar shows' },
  takeaway: 'Friday beat similar shows on turn-up'
}
