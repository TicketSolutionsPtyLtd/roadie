import { useState } from 'react'

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

import { withFrames } from '@oztix/roadie-browser-testing'
import {
  type RecordView,
  type RecordsRequest,
  recordFields
} from '@oztix/roadie-core/records'

import { calendarLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { tableColumns, tableLayout } from '../RecordTable'
import { Records, useRecords } from '../Records'

type Gig = { id: string; name: string; starts: string; ends?: string }

const field = recordFields<Gig>()
const fields = [
  field.text('name', { label: 'Name' }),
  field.date('starts', { label: 'Starts', moment: 'date', end: 'ends' }),
  field.date('ends', { label: 'Ends', moment: 'date' })
]
const NOW = new Date('2026-11-20T02:00:00Z')
const gigs: Gig[] = [
  { id: 'a', name: 'Marzipan Thunderclap', starts: '2026-11-03' },
  {
    id: 'b',
    name: 'Festival of Kazoos',
    starts: '2026-11-13',
    ends: '2026-11-15'
  },
  { id: 'c', name: 'Lampshade Disco', starts: '2026-12-05' },
  {
    id: 'd',
    name: 'The Extraordinarily Long Marzipan Thunderclap Farewell Tour',
    starts: '2026-11-10'
  },
  ...['One', 'Two', 'Three'].map((name) => ({
    id: `trio-${name}`,
    name: `Trio ${name}`,
    starts: '2026-11-24'
  })),
  ...['One', 'Two', 'Three', 'Four', 'Five'].map((name) => ({
    id: name,
    name: `Busy night ${name}`,
    starts: '2026-11-27'
  }))
]
const calendar = { dateField: 'starts', title: 'name' } as const

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(cleanup)

const day = (date: string) =>
  document.querySelector<HTMLElement>(`td[data-date="${date}"]`)!
const chips = (date: string) =>
  [...day(date).querySelectorAll('[data-slot="record-calendar-chip"]')].map(
    (chip) => chip.textContent
  )

function Gigs({
  weekStart,
  dir,
  width = 1100,
  now = NOW,
  className
}: {
  weekStart?: number
  dir?: 'rtl'
  width?: number
  now?: Date
  className?: string
}) {
  const records = useRecords({
    data: gigs,
    fields,
    now,
    getRowHref: (gig) => `/gigs/${gig.id}`
  })
  const [layouts] = useState(() => [
    calendarLayout<Gig>({ ...calendar, weekStart })
  ])
  return (
    <div dir={dir} className={className} style={{ width }}>
      <Records records={records} layouts={layouts} caption='Gigs'>
        <Records.Content />
      </Records>
    </div>
  )
}

describe('calendarLayout in a browser', { timeout: 30_000 }, () => {
  it('opens on this month, marks today, and places each record on its days', () => {
    render(<Gigs />)
    expect(screen.getByText('November 2026')).toBeInTheDocument()
    expect(day('2026-11-20')).toHaveAttribute('aria-current', 'date')
    expect(day('2026-11-20').textContent).toMatch(
      /^Today, Friday, 20 November 2026/
    )
    expect(chips('2026-11-03')).toEqual(['Marzipan Thunderclap'])
    for (const date of ['2026-11-13', '2026-11-14', '2026-11-15'])
      expect(chips(date)).toEqual(['Festival of Kazoos'])
    expect(chips('2026-11-16')).toEqual([])
    expect(
      screen.getAllByRole('link', { name: 'Marzipan Thunderclap' })[0]
    ).toHaveAttribute('href', '/gigs/a')
  })

  it('keeps a long chip inside its day, days even, and no sideways scroll', () => {
    render(<Gigs />)
    const cell = day('2026-11-10').getBoundingClientRect()
    const chip = day('2026-11-10')
      .querySelector('[data-slot="record-calendar-chip"]')!
      .getBoundingClientRect()
    expect(chip.right).toBeLessThanOrEqual(cell.right)
    expect(cell.width).toBeCloseTo(
      day('2026-11-11').getBoundingClientRect().width
    )
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    )
  })

  it('shows "+N more" past three, which opens every record on the day', async () => {
    const user = userEvent.setup()
    render(<Gigs />)
    expect(chips('2026-11-24')).toEqual(['Trio One', 'Trio Two', 'Trio Three'])
    expect(within(day('2026-11-24')).queryByRole('button')).toBeNull()
    expect(chips('2026-11-27')).toEqual(['Busy night One', 'Busy night Two'])
    const more = screen.getByRole('button', {
      name: '+3 more on Friday, 27 November 2026'
    })
    await user.click(more)
    const popup = await screen.findByRole('dialog')
    expect(
      within(popup)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(
      gigs
        .filter(({ starts }) => starts === '2026-11-27')
        .map(({ name }) => name)
    )
    await user.keyboard('{Escape}')
    // The popup stays mounted through its exit transition.
    await withFrames(() =>
      expect.poll(() => screen.queryByRole('dialog')).toBeNull()
    )
    expect(more).toHaveFocus()
  })

  it('keeps "+N more" inside its day on the narrowest grid', () => {
    render(<Gigs width={660} />)
    const cell = day('2026-11-27').getBoundingClientRect()
    const more = screen
      .getByRole('button', { name: /more on Friday, 27 November/ })
      .getBoundingClientRect()
    expect(more.left).toBeGreaterThanOrEqual(cell.left)
    expect(more.right).toBeLessThanOrEqual(cell.right)
  })

  it('moves between months, and back with Today', async () => {
    const user = userEvent.setup()
    render(<Gigs />)
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText('December 2026')).toBeInTheDocument()
    expect(chips('2026-12-05')).toEqual(['Lampshade Disco'])
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('October 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })

  it('moves focus between days with the arrows', async () => {
    const user = userEvent.setup()
    render(<Gigs />)
    screen.getAllByRole('link', { name: 'Marzipan Thunderclap' })[0]!.focus()
    await user.keyboard('{ArrowRight}')
    expect(day('2026-11-04')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(day('2026-11-11')).toHaveFocus()
    await user.keyboard('{ArrowLeft}{ArrowUp}')
    expect(day('2026-11-03')).toHaveFocus()
  })

  it('flips Left and Right in a right-to-left page', async () => {
    const user = userEvent.setup()
    render(<Gigs dir='rtl' />)
    screen.getAllByRole('link', { name: 'Marzipan Thunderclap' })[0]!.focus()
    await user.keyboard('{ArrowLeft}')
    expect(day('2026-11-04')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(day('2026-11-03')).toHaveFocus()
  })

  it('starts the week on weekStart', () => {
    render(<Gigs weekStart={7} />)
    expect(
      screen.getAllByRole('columnheader').map((header) => header.textContent)
    ).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('places records by the saved view’s date field', () => {
    const saved: RecordView = {
      query: { search: '', filters: [], sort: [] },
      layout: { type: 'calendar', dateField: 'ends' }
    }
    function Saved() {
      const records = useRecords({ data: gigs, fields, now: NOW, view: saved })
      const [layouts] = useState(() => [calendarLayout<Gig>(calendar)])
      return (
        <Records records={records} layouts={layouts}>
          <Records.Content />
        </Records>
      )
    }
    render(<Saved />)
    expect(chips('2026-11-15')).toEqual(['Festival of Kazoos'])
    expect(chips('2026-11-13')).toEqual([])
  })

  it('switches from the table to the calendar on its own date field', async () => {
    const user = userEvent.setup()
    function Switching() {
      const records = useRecords({ data: gigs, fields, now: NOW })
      const [layouts] = useState(() => [
        tableLayout([tableColumns<Gig>(fields).field('name')]),
        calendarLayout<Gig>(calendar)
      ])
      return (
        <Records records={records} layouts={layouts} caption='Gigs'>
          <Records.Header />
          <Records.Content />
        </Records>
      )
    }
    render(<Switching />)
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const panel = await screen.findByRole('dialog', {
      name: 'Configure table'
    })
    await user.click(within(panel).getByRole('button', { name: 'Calendar' }))
    expect(chips('2026-11-13')).toEqual(['Festival of Kazoos'])
  })

  it('shows an agenda on a phone: the month’s records under their days', async () => {
    const user = userEvent.setup()
    render(<Gigs width={375} />)
    expect(screen.queryByRole('table')).toBeNull()
    const days = screen.getAllByRole('heading', { level: 2 })
    expect(days.map((heading) => heading.textContent)).toEqual([
      'Tuesday, 3 November 2026 1',
      'Tuesday, 10 November 2026 1',
      'Friday, 13 November 2026 1',
      'Saturday, 14 November 2026 1',
      'Sunday, 15 November 2026 1',
      'Tuesday, 24 November 2026 3',
      'Friday, 27 November 2026 5'
    ])
    const busy = screen.getByRole('list', { name: /27 November/ })
    expect(within(busy).getAllByRole('link')).toHaveLength(5)
    expect(screen.queryByText('Lampshade Disco')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('Nothing in October 2026')).toBeInTheDocument()
  })

  it('paints sticky day headings the colour behind them and names today', async () => {
    const { container } = render(
      <Gigs width={375} className='bg-sunken' now={new Date('2026-11-27')} />
    )
    const card = getComputedStyle(container.firstElementChild!).backgroundColor
    const today = screen.getByRole('heading', { name: /^Today, Friday/ })
    await expect.poll(() => getComputedStyle(today).backgroundColor).toBe(card)
  })

  it('sticks day headings under the search, and slides them under it as their day goes', () => {
    function WithHeader() {
      const records = useRecords({ data: gigs, fields, now: NOW })
      const [layouts] = useState(() => [calendarLayout<Gig>(calendar)])
      return (
        <div
          style={{ height: 320, width: 375, overflowY: 'auto' }}
          data-testid='scroller'
        >
          <Records records={records} layouts={layouts} caption='Gigs'>
            <Records.Header />
            <Records.Content />
          </Records>
        </div>
      )
    }
    render(<WithHeader />)
    const header = document.querySelector<HTMLElement>(
      '[data-slot="records-header"]'
    )!
    const scroller = screen.getByTestId('scroller')
    const heading = (name: RegExp) => screen.getByRole('heading', { name })
    const busy = heading(/24 November/)
    scroller.scrollTop +=
      busy.getBoundingClientRect().top -
      header.getBoundingClientRect().bottom +
      60
    expect(busy.getBoundingClientRect().top).toBeCloseTo(
      header.getBoundingClientRect().bottom,
      0
    )
    const first = heading(/^Tuesday, 3 November/)
    // The day's bottom edge sits halfway up the header, its heading with it.
    scroller.scrollTop +=
      first.closest('li')!.getBoundingClientRect().bottom -
      header.getBoundingClientRect().bottom +
      header.offsetHeight / 2
    const x = header.getBoundingClientRect().left + 20
    const y = first.getBoundingClientRect().bottom - 2
    expect(header.contains(document.elementFromPoint(x, y))).toBe(true)
  })

  it('asks the server for the weeks of the month it shows, unpaged', async () => {
    const user = userEvent.setup()
    const requests: RecordsRequest[] = []
    const heard = vi.fn((request: RecordsRequest) => requests.push(request))
    const query = { search: '', filters: [], sort: [] }
    function Served({ layout }: { layout: RecordView['layout'] }) {
      const records = useRecords({
        data: gigs,
        fields,
        now: NOW,
        rowCount: gigs.length,
        view: { query, layout },
        onRequestChange: heard
      })
      const [layouts] = useState(() => [
        calendarLayout<Gig>(calendar),
        tableLayout([tableColumns<Gig>(fields).field('name')])
      ])
      return (
        <Records records={records} layouts={layouts} caption='Gigs'>
          <Records.Content />
          <Records.Pagination />
        </Records>
      )
    }
    const { rerender } = render(
      <Served layout={{ type: 'calendar', dateField: 'starts' }} />
    )
    const window = (start: string, end: string) => ({
      version: 1,
      query: expect.objectContaining({
        filters: [
          {
            field: 'starts',
            operator: 'overlaps',
            range: { kind: 'dates', start, end }
          }
        ]
      })
    })
    expect(requests).toEqual([window('2026-10-26', '2026-12-06')])
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(requests.at(-1)).toEqual(window('2026-11-30', '2027-01-03'))
    expect(requests).toHaveLength(2)
    expect(screen.queryByLabelText('Rows per page')).toBeNull()
    rerender(<Served layout={{ type: 'table' }} />)
    expect(requests.at(-1)).toHaveProperty('page', 0)
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })
})
