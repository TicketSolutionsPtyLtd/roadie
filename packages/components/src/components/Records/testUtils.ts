import { recordFields } from '@oztix/roadie-core/records'

export type TestShow = {
  id: string
  show: string
  city: string
  sold: number | null
  gross: number | string | null
  status: string
  starts: string
}

const SHOWS = [
  'Ocean Alley',
  'Ball Park Music',
  'Julia Jacklin',
  'angie McMahon',
  'Alex Lahey',
  'Middle Kids'
]
const CITIES = ['Brisbane', 'Melbourne', 'Sydney', 'Perth', 'Hobart']
const STATUSES = ['on_sale', 'sold_out', 'cancelled']

export function testShows(count: number): TestShow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `show-${index}`,
    show: `${SHOWS[index % SHOWS.length]} ${Math.floor(index / SHOWS.length) + 1}`,
    city: CITIES[index % CITIES.length]!,
    sold: index % 7 === 0 ? null : (index * 37) % 2400,
    gross: index % 11 === 0 ? 'On sale soon' : (index * 7919) % 250000,
    status: STATUSES[index % STATUSES.length]!,
    starts: `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`
  }))
}

const field = recordFields<TestShow>()

export const showFields = [
  field.text('show', { label: 'Show' }),
  field.text('city', { label: 'City' }),
  field.number('sold', { label: 'Sold' }),
  field.money('gross', { label: 'Gross', format: 'compactCurrency' }),
  field.option('status', {
    label: 'Status',
    status: {
      on_sale: { intent: 'success' },
      sold_out: { intent: 'danger' },
      cancelled: { intent: 'neutral' }
    }
  }),
  field.date('starts', { label: 'Starts', moment: 'date' })
]
