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
    const panel = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
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

const grouped = { layout: { type: 'list', groupBy: 'status' } } as const

const groupsShown = () =>
  [...document.querySelectorAll('[data-slot="list-group"]')].map((group) => [
    group.querySelector('[data-slot="list-group-title"]')?.textContent,
    within(group as HTMLElement)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('a')?.textContent)
  ])

describe('listLayout grouped in a browser', { timeout: 30_000 }, () => {
  it('groups rows under a title and count per option, in option order, leaving out empty options, with no-value records last', () => {
    const shows = testShows(6)
    shows[2]!.status = 'sold_out'
    shows[5]!.status = null as unknown as string
    render(
      <ShowList
        caption='Upcoming shows'
        data={shows}
        fields={showFields}
        getRowHref={(show) => `/shows/${show.id}`}
        defaultView={grouped}
      />
    )
    expect(groupsShown()).toEqual([
      ['On sale 2', ['Ocean Alley 1', 'angie McMahon 1']],
      ['Sold out 3', ['Ball Park Music 1', 'Julia Jacklin 1', 'Alex Lahey 1']],
      ['No status 1', ['Middle Kids 1']]
    ])
    const onSale = screen.getByRole('list', { name: 'On sale 2' })
    expect(within(onSale).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('list', { name: 'Upcoming shows' })).toBeVisible()
  })

  it('selects a Shift range in the order the groups show it', async () => {
    const user = userEvent.setup()
    render(
      <ShowList
        data={testShows(6)}
        fields={showFields}
        selectable
        defaultView={grouped}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Select' }))
    const box = (name: string) => screen.getByRole('checkbox', { name })
    await user.click(box('Select Ocean Alley 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Ball Park Music 1'))
    await user.keyboard('{/Shift}')
    const checked = (name: string) =>
      box(`Select ${name}`).getAttribute('aria-checked')
    await expect.poll(() => checked('Ball Park Music 1')).toBe('true')
    expect(checked('angie McMahon 1')).toBe('true')
    expect(checked('Julia Jacklin 1')).toBe('false')
  })

  it('saves groupBy in the URL and groups by it when read back', () => {
    const { view } = recordViewFromSearchParams(
      recordViewToSearchParams({
        query: { search: '', filters: [], sort: [] },
        layout: { type: 'list', groupBy: 'status' }
      }),
      showFields
    )
    render(
      <ShowList data={testShows(4)} fields={showFields} defaultView={view} />
    )
    expect(groupsShown().map(([title]) => title)).toEqual([
      'On sale 2',
      'Sold out 1',
      'Cancelled 1'
    ])
  })

  it('groups from Configure, keeps the row fields, and restores from the URL', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    const props = { data: testShows(4), fields: showFields }
    const { unmount } = render(
      <ShowList
        {...props}
        defaultView={{ layout: { type: 'list', fields: ['gross'] } }}
        onViewChange={onViewChange}
      />
    )
    expect(document.querySelector('[data-slot="list-group"]')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await user.click(within(panel).getByRole('combobox', { name: 'Group by' }))
    await user.click(await screen.findByRole('option', { name: 'Status' }))
    const written: RecordView = onViewChange.mock.lastCall![0]
    expect(written.layout).toEqual({
      type: 'list',
      fields: ['gross'],
      groupBy: 'status'
    })
    await user.click(
      await within(panel).findByRole(
        'button',
        { name: 'Show Sold' },
        { timeout: 5000 }
      )
    )
    expect(onViewChange.mock.lastCall![0].layout).toMatchObject({
      groupBy: 'status'
    })
    unmount()

    const read = recordViewFromSearchParams(
      recordViewToSearchParams(written),
      showFields
    )
    render(<ShowList {...props} defaultView={read.view} />)
    expect(groupsShown().map(([title]) => title)).toEqual([
      'On sale 2',
      'Sold out 1',
      'Cancelled 1'
    ])
  })

  it('ungroups from None', async () => {
    const user = userEvent.setup()
    render(
      <ShowList
        data={testShows(3)}
        fields={showFields}
        defaultView={{ layout: { type: 'list', groupBy: 'status' } }}
      />
    )
    expect(groupsShown()).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await user.click(within(panel).getByRole('combobox', { name: 'Group by' }))
    await user.click(await screen.findByRole('option', { name: 'None' }))
    await expect.poll(() => groupsShown()).toHaveLength(0)
    expect(rows()).toHaveLength(3)
  })

  it('offers no Group by when no field can group', async () => {
    const user = userEvent.setup()
    render(
      <ShowList
        data={testShows(3)}
        fields={showFields.filter(({ key }) => key !== 'status')}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await within(panel).findAllByRole('button', { name: /^Show / })
    expect(
      within(panel).queryByRole('combobox', { name: 'Group by' })
    ).toBeNull()
  })

  it('stays ungrouped when it loads by range, and offers no Group by', async () => {
    const user = userEvent.setup()
    render(
      <ShowList
        fields={showFields}
        defaultView={grouped}
        loadRange={async ({ start, end }) => ({
          rows: testShows(end).slice(start),
          rowCount: 6
        })}
      />
    )
    await expect.poll(() => rows().length).toBeGreaterThan(0)
    expect(groupsShown()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await within(panel).findAllByRole('button', { name: /^Show / })
    expect(
      within(panel).queryByRole('combobox', { name: 'Group by' })
    ).toBeNull()
  })
})
