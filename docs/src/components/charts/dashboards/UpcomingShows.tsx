import { DataCard } from '@oztix/roadie-components/data-card'
import {
  DataTable,
  type DataTableColumn
} from '@oztix/roadie-components/data-table'

const COLUMNS: DataTableColumn[] = [
  {
    key: 'show',
    header: 'Show',
    kind: 'text',
    pin: true,
    secondaryKey: 'venue'
  },
  {
    key: 'daily',
    header: 'Daily sales, 30 days',
    kind: 'sparkline',
    priority: 3
  },
  {
    key: 'sellThrough',
    header: 'Sell-through',
    kind: 'meter',
    target: 0.85,
    priority: 2
  },
  {
    key: 'pace',
    header: 'Pace index',
    kind: 'delta',
    format: 'index',
    baseline: 100
  },
  {
    key: 'gross',
    header: 'Gross',
    kind: 'number',
    format: 'compactCurrency',
    priority: 1
  }
]

const ROWS = [
  {
    show: 'Ball Park Music',
    venue: 'Kazoo Hollow Room, Fortitude Valley',
    daily: [22, 30, 41, 52, 61, 72, 81, 96, 112, 131, 152, 160],
    sellThrough: 0.61,
    pace: 112,
    gross: 118400
  },
  {
    show: 'Ocean Alley',
    venue: 'Barnacle Bowl Amphitheatre, Geelong',
    daily: [90, 95, 102, 94, 108, 97, 104, 110, 101, 106, 110, 112],
    sellThrough: 0.51,
    pace: 101,
    gross: 183000
  },
  {
    show: 'Julia Jacklin',
    venue: 'Opal Harpoon Room, Hobart',
    daily: [18, 16, 15, 14, 12, 11, 10, 9, 8, 7, 6, 6],
    sellThrough: 0.4,
    pace: 78,
    gross: 22900
  }
]

/** A table card of three shows with sparkline, meter, delta, and number columns. */
export function UpcomingShows() {
  return (
    <div data-not-prose className='grid'>
      <DataCard
        label='Upcoming shows'
        takeaway='One show is behind similar shows'
        source='Oztix sales. Pace against 38 similar shows.'
      >
        <DataTable columns={COLUMNS} rows={ROWS} caption='Upcoming shows' />
      </DataCard>
    </div>
  )
}
