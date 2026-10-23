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

const middle = (top: number, bottom: number) => (top + bottom) / 2

/** In a boxed layout, how far a state sits from the centre of the space under the header. */
export function stateOffCentre(
  container: HTMLElement,
  layout: 'record-table' | 'record-grid',
  state: 'records-empty' | 'records-error'
) {
  const find = (slot: string) =>
    container.querySelector(`[data-slot="${slot}"]`)!.getBoundingClientRect()
  const shown = find(state)
  return Math.abs(
    middle(shown.top, shown.bottom) -
      middle(find(`${layout}-scroller`).top, find(`${layout}-viewport`).bottom)
  )
}

/** A state each boxed layout centres, and the props that show it. */
export const boxStates = [
  ['empty', 'records-empty', { data: [] }],
  ['error', 'records-error', { data: [], error: true }]
] as const
