import { useMemo } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  type RecordView,
  recordViewFromSearchParams,
  recordViewToSearchParams
} from '@oztix/roadie-core/records'

import { listLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import type { UseRecordsOptions } from '../Records/useRecords'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
  await Promise.all([
    import('../RecordGrid/RecordGridSettings'),
    import('../RecordTable/RecordTableSettings')
  ])
})
afterAll(() => removeStylesheet())
afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

const row = {
  title: 'show',
  description: 'city',
  trailing: 'status',
  details: ['sold']
} as const

const rows = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-slot="record-table-list-row"]'
  )
]
const descriptionOf = (item: HTMLElement) =>
  item.querySelector('[data-slot="list-item-description"]')?.textContent

const column = tableColumns(showFields)

function ShowList({
  caption,
  withTable = false,
  ...options
}: UseRecordsOptions<TestShow> & { caption?: string; withTable?: boolean }) {
  const records = useRecords(options)
  const layouts = useMemo(
    () => [
      ...(withTable
        ? [tableLayout([column.field('show'), column.field('city')])]
        : []),
      listLayout<TestShow>(row)
    ],
    [withTable]
  )
  return (
    <Records records={records} layouts={layouts} caption={caption}>
      <Records.Header />
      <Records.Content />
    </Records>
  )
}

describe('listLayout in a browser', { timeout: 30_000 }, () => {
  it('lists a row per record, named by the caption, with the details after the description', () => {
    render(
      <ShowList
        caption='Upcoming shows'
        data={testShows(3)}
        fields={showFields}
        getRowHref={(show) => `/shows/${show.id}`}
      />
    )
    const list = screen.getByRole('list', { name: 'Upcoming shows' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(
      screen.getByRole('link', { name: 'Ball Park Music 1' })
    ).toHaveAttribute('href', '/shows/show-1')
    expect(descriptionOf(rows()[1]!)).toBe('Melbourne · 37')
  })

  it('is chosen from Configure, saved in the view, and restored from the URL', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    const props = { data: testShows(4), fields: showFields, withTable: true }
    const { unmount } = render(
      <ShowList
        {...props}
        defaultView={{ layout: { type: 'table' } }}
        onViewChange={onViewChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure table' })
    await user.click(within(panel).getByRole('button', { name: 'List' }))
    const listPanel = await screen.findByRole('dialog', {
      name: 'Configure list'
    })
    await user.click(
      await within(listPanel).findByRole(
        'button',
        { name: 'Show Gross' },
        { timeout: 5000 }
      )
    )
    const written: RecordView = onViewChange.mock.lastCall![0]
    expect(written.layout).toEqual({ type: 'list', fields: ['sold', 'gross'] })
    unmount()

    const read = recordViewFromSearchParams(
      recordViewToSearchParams(written),
      showFields
    )
    render(<ShowList {...props} defaultView={read.view} />)
    expect(rows()).toHaveLength(4)
    expect(descriptionOf(rows()[1]!)).toBe('Melbourne · 37 · $7.9k')
  })
})
