import { describe, it } from 'vitest'

import {
  expectFrameBudget,
  measureFrames,
  mount,
  setupFrameTests
} from '@oztix/roadie-frames'

import { DataTable, type DataTableColumn } from '.'
import roadieCss from '../../../vitest.browser.css?inline'

setupFrameTests({ css: roadieCss })

const columns: DataTableColumn[] = [
  { key: 'event', header: 'Event', kind: 'text' },
  { key: 'venue', header: 'Venue', kind: 'text' },
  { key: 'type', header: 'Ticket type', kind: 'text' },
  { key: 'sold', header: 'Sold', kind: 'number' },
  { key: 'gross', header: 'Gross', kind: 'number', format: 'currency' }
]
const VENUES = ['Kazoo Hollow Room', 'The Tin Lantern', 'Gumleaf Hall']
const TYPES = ['General admission', 'Early bird', 'VIP', 'Concession']

const rows = Array.from({ length: 200 }, (_, index) => ({
  event: `The Rolling Kazoos, night ${Math.floor(index / 4) + 1}`,
  venue: VENUES[index % VENUES.length]!,
  type: TYPES[index % TYPES.length]!,
  sold: (index * 37) % 500,
  gross: ((index * 37) % 500) * 59
}))

describe('DataTable sorts and expands at 60fps on a slowed CPU', () => {
  it('sorts 200 rows by a column', async () => {
    const root = await mount(
      <DataTable caption='Sales' columns={columns} rows={rows} sortable />,
      { frames: 5 }
    )
    const sold = [
      ...root.querySelectorAll<HTMLButtonElement>('th button')
    ].find((button) => button.textContent?.includes('Sold'))!
    await expectFrameBudget(
      'DataTable, sort 200 rows',
      await measureFrames((index) => index === 0 && sold.click(), {
        frames: 60
      })
    )
  })

  it('expands and collapses a venue of 200 rows', async () => {
    const root = await mount(
      <DataTable
        caption='Sales by venue'
        columns={columns}
        rows={rows}
        groupBy={['venue', 'event']}
      />,
      { frames: 5 }
    )
    const toggle = root.querySelector<HTMLButtonElement>(
      'tr[data-slot="data-table-group"] button[aria-expanded]'
    )!
    for (const scenario of ['expand', 'collapse'])
      await expectFrameBudget(
        `DataTable, ${scenario} a group`,
        await measureFrames((index) => index === 0 && toggle.click(), {
          frames: 60
        })
      )
  })
})
