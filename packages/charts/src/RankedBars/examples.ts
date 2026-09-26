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

// The audience dashboard's 612 buyers. Wattle Street Social is in West End.
export const suburbExample: RankedBarsProps = {
  data: [
    { suburb: 'West End', buyers: 161 },
    { suburb: 'South Brisbane', buyers: 96 },
    { suburb: 'Highgate Hill', buyers: 71 },
    { suburb: 'Woolloongabba', buyers: 58 },
    { suburb: 'Paddington', buyers: 44 },
    { suburb: 'New Farm', buyers: 38 },
    { suburb: 'Fortitude Valley', buyers: 33 },
    { suburb: 'Toowong', buyers: 29 },
    { suburb: 'Chermside', buyers: 22 },
    { suburb: 'Logan Central', buyers: 19 },
    { suburb: 'Redcliffe', buyers: 16 },
    { suburb: 'Ipswich', buyers: 13 },
    { suburb: 'Springfield', buyers: 12 }
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
