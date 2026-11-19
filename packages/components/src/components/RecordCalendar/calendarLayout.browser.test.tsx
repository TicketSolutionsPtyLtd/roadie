import { useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { type RecordView, recordFields } from '@oztix/roadie-core/records'

import { calendarLayout } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { withFrames } from '../../css/testUtils'
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
  width = 1100
}: {
  weekStart?: number
  dir?: 'rtl'
  width?: number
}) {
  const records = useRecords({
    data: gigs,
    fields,
    now: NOW,
    getRowHref: (gig) => `/gigs/${gig.id}`
  })
  const [layouts] = useState(() => [
    calendarLayout<Gig>({ ...calendar, weekStart })
  ])
  return (
    <div dir={dir} style={{ width }}>
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

  it('keeps "+N more" inside its day on a phone', () => {
    render(<Gigs width={358} />)
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
})
