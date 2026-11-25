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
import {
  type TestShow,
  groupedShowFields,
  showFields,
  testShows
} from '../Records/testUtils'
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

const grouped = { layout: { type: 'list', groupBy: ['status'] } } as const

const groupsShown = () =>
  [...document.querySelectorAll('[data-slot="list-group"]')].map((group) => [
    group.querySelector('[data-slot="list-group-title"]')?.textContent,
    within(group as HTMLElement)
      .getAllByRole('listitem')
      .map((item) => item.querySelector('a')?.textContent)
  ])

// Each group is an Accordion item: its summary holds the title.
const disclosure = (name: string) =>
  screen.getByRole('heading', { name }).closest('summary')!
const isOpen = (name: string) => disclosure(name).closest('details')!.open
// A closed item keeps its rows in the DOM, out of sight.
const shown = (element: Element) => element.checkVisibility()

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

  it('nests groups by each level, as headings h2 to h4, leaving out empty ones', () => {
    render(
      <ShowList
        caption='Upcoming shows'
        data={testShows(6)}
        fields={groupedShowFields}
        getRowHref={(show) => `/shows/${show.id}`}
        defaultView={{
          layout: { type: 'list', groupBy: ['status', 'city', 'show'] }
        }}
      />
    )
    const headings = screen
      .getAllByRole('heading')
      .map((heading) => [heading.tagName, heading.textContent])
    expect(headings.slice(0, 5)).toEqual([
      ['H2', 'On sale 2'],
      ['H3', 'Brisbane 1'],
      ['H4', 'Ocean Alley 1 1'],
      ['H3', 'Perth 1'],
      ['H4', 'angie McMahon 1 1']
    ])
    // Each level reads as its own tier: an outer title stands out from the ones inside it.
    const look = (level: number) => {
      const style = getComputedStyle(
        screen.getAllByRole('heading', { level })[0]!
      )
      return [parseFloat(style.fontSize), style.color]
    }
    expect(look(2)[0]).toBeGreaterThan(look(3)[0] as number)
    expect(look(3)[0]).toBeGreaterThan(look(4)[0] as number)
    expect(look(3)[1]).not.toBe(look(4)[1])
    // Nesting reads from the headings alone, with no inset.
    const onSale = screen.getByRole('list', { name: 'On sale 2' })
    expect(getComputedStyle(onSale).borderLeftWidth).toBe('0px')
    expect(getComputedStyle(onSale).paddingLeft).toBe('0px')
    const brisbane = screen.getAllByRole('list', { name: 'Brisbane 1' })[0]!
    expect(
      [...brisbane.querySelectorAll('a')].map((link) => link.textContent)
    ).toEqual(['Ocean Alley 1'])
  })

  it('draws a level the same however many levels follow it', () => {
    const titleOf = (groupBy: string[]) => {
      const { unmount } = render(
        <ShowList
          data={testShows(6)}
          fields={groupedShowFields}
          defaultView={{ layout: { type: 'list', groupBy } }}
        />
      )
      const style = getComputedStyle(
        screen.getAllByRole('heading', { level: 2 })[0]!
      )
      const look = [style.fontSize, style.fontWeight, style.color]
      unmount()
      return look
    }
    expect(titleOf(['status'])).toEqual(titleOf(['status', 'city']))
  })

  it('makes each title, at every level, the summary that opens its group', () => {
    render(
      <ShowList
        data={testShows(6)}
        fields={groupedShowFields}
        defaultView={{
          layout: { type: 'list', groupBy: ['status', 'city', 'show'] }
        }}
      />
    )
    for (const level of [2, 3, 4]) {
      const heading = screen.getAllByRole('heading', { level })[0]!
      const summary = heading.closest('summary')!
      expect(summary).not.toBeNull()
      // The whole title row is the target, not just its text.
      expect(summary.getBoundingClientRect().width).toBeGreaterThan(
        heading.getBoundingClientRect().width
      )
    }
  })

  it('leaves room above the first title for its focus ring, clear of the toolbar', async () => {
    render(
      <ShowList data={testShows(6)} fields={showFields} defaultView={grouped} />
    )
    const summary = disclosure('On sale 2')
    summary.focus()
    const { left, top } = summary.getBoundingClientRect()
    // Just above the title, where its ring draws, is the list, not the toolbar.
    const above = document.elementFromPoint(left + 16, top - 2)
    expect(above?.closest('[data-slot="records-header"]')).toBeNull()
  })

  it("lines each title row's hover box up with a row's, at every level, and its text with the row's", () => {
    render(
      // Padded, so the rows' bleed is on screen.
      <div style={{ padding: 24 }}>
        <ShowList
          data={testShows(6)}
          fields={groupedShowFields.map((one) =>
            one.key === 'city'
              ? { ...one, groupHeading: () => <span>Suburb</span> }
              : one
          )}
          getRowHref={(show) => `/shows/${show.id}`}
          defaultView={{
            layout: { type: 'list', groupBy: ['status', 'city'] }
          }}
        />
      </div>
    )
    const row = document
      .querySelector('[data-slot="record-table-list-row"] > div')!
      .getBoundingClientRect()
    const rowText = screen
      .getByRole('link', { name: 'Ocean Alley 1' })
      .getBoundingClientRect().left
    for (const name of ['On sale 2', 'Perth 1']) {
      const box = disclosure(name).getBoundingClientRect()
      expect([box.left, box.right]).toEqual([row.left, row.right])
      // Painted to its edges, not clipped by the group around it.
      for (const x of [box.left + 2, box.right - 2]) {
        expect(
          document
            .elementFromPoint(x, box.top + box.height / 2)
            ?.closest('summary')
        ).toBe(disclosure(name))
      }
      expect(
        screen.getByRole('heading', { name }).getBoundingClientRect().left
      ).toBeCloseTo(rowText, 0)
    }
    expect(
      screen.getAllByText('Suburb')[0]!.getBoundingClientRect().left
    ).toBeCloseTo(rowText, 0)
  })

  it('collapses a group from its title, keeping it out of the view', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <ShowList
        data={testShows(6)}
        fields={groupedShowFields}
        getRowHref={(show) => `/shows/${show.id}`}
        defaultView={{ layout: { type: 'list', groupBy: ['status', 'city'] } }}
        onViewChange={onViewChange}
      />
    )
    const calls = onViewChange.mock.calls.length
    const toggle = disclosure('On sale 2')
    expect(isOpen('On sale 2')).toBe(true)
    expect(screen.getByRole('link', { name: 'Ocean Alley 1' })).toBeVisible()
    await user.click(toggle)
    expect(isOpen('On sale 2')).toBe(false)
    const oceanAlley = screen.getByRole('link', {
      name: 'Ocean Alley 1',
      hidden: true
    })
    await expect.poll(() => shown(oceanAlley)).toBe(false)
    expect(
      screen.getByRole('link', { name: 'Ball Park Music 1' })
    ).toBeVisible()
    // An inner group collapses on its own.
    await user.click(disclosure('Melbourne 1'))
    const ballPark = screen.getByRole('link', {
      name: 'Ball Park Music 1',
      hidden: true
    })
    await expect.poll(() => shown(ballPark)).toBe(false)
    await user.click(toggle)
    // It opens with the Accordion's animation.
    await expect.poll(() => shown(oceanAlley)).toBe(true)
    expect(onViewChange.mock.calls.length).toBe(calls)
  })

  it('keeps a group collapsed as its records change', async () => {
    const user = userEvent.setup()
    const list = (count: number) => (
      <ShowList
        data={testShows(count)}
        fields={showFields}
        defaultView={grouped}
      />
    )
    const { rerender } = render(list(6))
    await user.click(disclosure('On sale 2'))
    rerender(list(9))
    expect(isOpen('On sale 3')).toBe(false)
    expect(isOpen('Sold out 3')).toBe(true)
  })

  it("shows the field's heading content under each of its groups, at any level", () => {
    const fields = groupedShowFields.map((one) =>
      one.key === 'city'
        ? {
            ...one,
            groupHeading: ({
              value,
              count
            }: {
              value: string | null
              count: number
            }) => <span>{`${value ?? 'Nowhere'} venues, ${count} shows`}</span>
          }
        : one
    )
    render(
      <ShowList
        data={testShows(6)}
        fields={fields}
        defaultView={{ layout: { type: 'list', groupBy: ['status', 'city'] } }}
      />
    )
    expect(screen.getAllByText('Brisbane venues, 1 shows')).toHaveLength(2)
    render(
      <ShowList
        data={testShows(6)}
        fields={fields}
        defaultView={{ layout: { type: 'list', groupBy: ['city'] } }}
      />
    )
    expect(screen.getByText('Brisbane venues, 2 shows')).toBeVisible()
  })

  it('lines heading content up with the title, and leaves no space for none', () => {
    // With nothing under it, a title sits one gap above its rows.
    const offGap = (name: string) => {
      const summary = disclosure(name)
      const list = screen.getByRole('list', { name })
      const gap = parseFloat(getComputedStyle(summary.parentElement!).rowGap)
      return (
        list.getBoundingClientRect().top -
        summary.getBoundingClientRect().bottom -
        gap
      )
    }
    const fields = showFields.map((one) =>
      one.key === 'status'
        ? {
            ...one,
            groupHeading: ({
              value,
              label
            }: {
              value: string | null
              label: string
            }) =>
              value === 'on_sale' ? (
                <span>{`${label} (${value})`}</span>
              ) : value === 'sold_out' ? (
                false
              ) : null
          }
        : one
    )
    render(
      <ShowList data={testShows(6)} fields={fields} defaultView={grouped} />
    )
    const extra = screen.getByText('On sale (on_sale)')
    const trigger = disclosure('On sale 2')
    expect(extra.getBoundingClientRect().left).toBeCloseTo(
      trigger.getBoundingClientRect().left +
        parseFloat(getComputedStyle(trigger).borderLeftWidth) +
        parseFloat(getComputedStyle(trigger).paddingLeft),
      0
    )
    expect(offGap('Sold out 2')).toBeCloseTo(0, 0)
    expect(offGap('Cancelled 2')).toBeCloseTo(0, 0)
  })

  it('picks deeper levels from Then by, offering only fields not already used', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <ShowList
        data={testShows(4)}
        fields={groupedShowFields}
        defaultView={grouped}
        onViewChange={onViewChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    expect(
      within(panel).queryByRole('combobox', { name: 'And then by' })
    ).toBeNull()
    await user.click(within(panel).getByRole('combobox', { name: 'Then by' }))
    expect(
      (await screen.findAllByRole('option')).map((option) => option.textContent)
    ).toEqual(['None', 'Show', 'City'])
    await user.click(screen.getByRole('option', { name: 'City' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'list',
      groupBy: ['status', 'city']
    })
    await expect
      .poll(() => screen.getAllByRole('heading', { level: 3 }).length)
      .toBeGreaterThan(0)
    await user.click(within(panel).getByRole('combobox', { name: 'Then by' }))
    await user.click(await screen.findByRole('option', { name: 'None' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'list',
      groupBy: ['status']
    })
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

  it('leaves a collapsed group out of a Shift range', async () => {
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
    const soldOut = disclosure('Sold out 2')
    await user.click(soldOut)
    const hiddenBox = screen.getByRole('checkbox', {
      name: 'Select Ball Park Music 1',
      hidden: true
    })
    await expect.poll(() => shown(hiddenBox)).toBe(false)
    const box = (name: string) => screen.getByRole('checkbox', { name })
    await user.click(box('Select Ocean Alley 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Julia Jacklin 1'))
    await user.keyboard('{/Shift}')
    const checked = (name: string) =>
      box(`Select ${name}`).getAttribute('aria-checked')
    await expect.poll(() => checked('Julia Jacklin 1')).toBe('true')
    expect(checked('angie McMahon 1')).toBe('true')
    await user.click(soldOut)
    expect(checked('Ball Park Music 1')).toBe('false')
    expect(checked('Alex Lahey 1')).toBe('false')
  })

  it('drops the deeper levels when a level is set to None, and writes each change once', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <ShowList
        data={testShows(4)}
        fields={groupedShowFields}
        defaultView={{
          layout: { type: 'list', groupBy: ['status', 'city', 'show'] }
        }}
        onViewChange={onViewChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await user.click(within(panel).getByRole('combobox', { name: 'Then by' }))
    await user.click(await screen.findByRole('option', { name: 'None' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'list',
      groupBy: ['status']
    })
    await user.click(within(panel).getByRole('combobox', { name: 'Then by' }))
    await user.click(await screen.findByRole('option', { name: 'City' }))
    expect(onViewChange.mock.lastCall![0].layout).toEqual({
      type: 'list',
      groupBy: ['status', 'city']
    })
    await user.click(within(panel).getByRole('combobox', { name: 'Group by' }))
    await user.click(await screen.findByRole('option', { name: 'City' }))
    // Once each, though Then by loses its field too.
    expect(
      onViewChange.mock.calls.map(([view]) => view.layout.groupBy)
    ).toEqual([['status'], ['status', 'city'], ['city']])
  })

  it('keeps the deeper levels when a field moves up from below', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(
      <ShowList
        data={testShows(4)}
        fields={groupedShowFields}
        defaultView={{
          layout: { type: 'list', groupBy: ['status', 'city', 'show'] }
        }}
        onViewChange={onViewChange}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    await user.click(within(panel).getByRole('combobox', { name: 'Group by' }))
    await user.click(await screen.findByRole('option', { name: 'City' }))
    await expect
      .poll(() => onViewChange.mock.calls.map(([view]) => view.layout.groupBy))
      .toEqual([['city', 'show']])
  })

  it('offers no Then by when no other field can group', async () => {
    const user = userEvent.setup()
    render(
      <ShowList data={testShows(4)} fields={showFields} defaultView={grouped} />
    )
    await user.click(screen.getByRole('button', { name: 'Configure list' }))
    const panel = await screen.findByRole('dialog', { name: 'Configure list' })
    expect(
      within(panel).getByRole('combobox', { name: 'Group by' })
    ).toBeVisible()
    expect(
      within(panel).queryByRole('combobox', { name: 'Then by' })
    ).toBeNull()
  })

  it('selects a Shift range in the order nested groups show it', async () => {
    const user = userEvent.setup()
    render(
      <ShowList
        data={testShows(6)}
        fields={groupedShowFields}
        selectable
        defaultView={{ layout: { type: 'list', groupBy: ['status', 'city'] } }}
      />
    )
    // Cancelled shows Brisbane (Middle Kids) before Sydney (Julia Jacklin),
    // the reverse of the rows' order.
    await user.click(screen.getByRole('button', { name: 'Select' }))
    const box = (name: string) => screen.getByRole('checkbox', { name })
    await user.click(box('Select Alex Lahey 1'))
    await user.keyboard('{Shift>}')
    await user.click(box('Select Middle Kids 1'))
    await user.keyboard('{/Shift}')
    const checked = (name: string) =>
      box(`Select ${name}`).getAttribute('aria-checked')
    await expect.poll(() => checked('Middle Kids 1')).toBe('true')
    expect(checked('Julia Jacklin 1')).toBe('false')
  })

  it('saves groupBy in the URL and groups by it when read back', () => {
    const { view } = recordViewFromSearchParams(
      recordViewToSearchParams({
        query: { search: '', filters: [], sort: [] },
        layout: { type: 'list', groupBy: ['status'] }
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
      groupBy: ['status']
    })
    await user.click(
      await within(panel).findByRole(
        'button',
        { name: 'Show Sold' },
        { timeout: 5000 }
      )
    )
    expect(onViewChange.mock.lastCall![0].layout).toMatchObject({
      groupBy: ['status']
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
        defaultView={{ layout: { type: 'list', groupBy: ['status'] } }}
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
