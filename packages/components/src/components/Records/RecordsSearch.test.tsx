import { type ReactElement, useState } from 'react'

import {
  CalendarBlankIcon,
  CircleHalfIcon,
  HashIcon,
  MapPinIcon,
  TextAaIcon
} from '@phosphor-icons/react/ssr'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import {
  type RecordFilter,
  type RecordView,
  recordFields
} from '@oztix/roadie-core/records'

import { Records } from '.'
import { tableColumns, tableLayout } from '../RecordTable'
import { RecordsDateCalendarLazy } from './RecordsDateCalendarLazy'
import { type TestShow, testShows } from './testUtils'
import { type UseRecordsOptions, useRecords } from './useRecords'

const field = recordFields<TestShow>()
const fields = [
  field.text('show', { label: 'Show' }),
  field.option('city', { label: 'City' }),
  field.number('sold', { label: 'Sold' }),
  field.money('gross', { label: 'Gross' }),
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
const column = tableColumns<TestShow>(fields)
const layouts = [
  tableLayout([column.field('show', { pin: true }), column.field('city')])
]
const shows = testShows(30)
// Midday Saturday 3 October 2026 in Sydney.
const NOW = new Date('2026-10-03T02:00:00Z')

function Shows(options: Partial<UseRecordsOptions<TestShow>>) {
  const records = useRecords({
    data: shows,
    fields,
    getRowId: (row) => row.id,
    timeZone: 'Australia/Sydney',
    now: NOW,
    ...options
  })
  return (
    <Records.Root records={records} layouts={layouts}>
      <Records.Header />
      <Records.Content />
    </Records.Root>
  )
}

function setup(options: Partial<UseRecordsOptions<TestShow>> = {}) {
  const onViewChange = vi.fn()
  const user = userEvent.setup()
  render(<Shows onViewChange={onViewChange} {...options} />)
  const lastView = () => onViewChange.mock.lastCall?.[0] as RecordView
  return { user, onViewChange, lastView }
}

const input = () =>
  screen.getByRole<HTMLInputElement>('combobox', { name: 'Search and filter' })
const chipLabels = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map(
    (chip) => chip.querySelector('[data-slot=combobox-chip-label]')?.textContent
  )
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')].find(
    (element) => element.textContent?.includes(label)
  )!
const option = (name: string | RegExp) => screen.findByRole('option', { name })
const ticked = () =>
  screen
    .queryAllByRole('option', { selected: true })
    .map(
      (each) =>
        each.querySelector('[data-slot=query-field-option-label]')?.textContent
    )
const selectChip = (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(within(chip(label)).getByRole('button', { name: label }))
/** Picks Starts, then a condition, ready for a date. */
const datesUnder = async (
  user: ReturnType<typeof userEvent.setup>,
  condition: string
) => {
  await user.click(input())
  await user.click(await option('Starts'))
  await user.click(screen.getByRole('button', { name: condition }))
}
const AFTER_1_DEC: RecordFilter = {
  field: 'starts',
  operator: 'after',
  value: '2026-12-01'
}
const rows = () =>
  screen
    .queryAllByRole('row')
    .filter((row) => within(row).queryAllByRole('cell').length)

// The page loads the calendar while idle; a test's first import takes longer.
beforeAll(() => RecordsDateCalendarLazy.preload(), 20_000)

describe('Records.Search', () => {
  it('searches as people type, and keeps the text on Enter', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('ocean{Enter}')
    expect(input()).toHaveValue('ocean')
    expect(lastView().query.search).toBe('ocean')
    expect(rows()).toHaveLength(5)
  })

  it('lists the search Enter takes first, ahead of the fields the text names', async () => {
    const { user } = setup()
    await user.click(input())
    await user.keyboard('Star')
    await screen.findByRole('option', { name: /^Starts/ })
    const names = screen.getAllByRole('option').map((each) => each.textContent)
    expect(names[0]).toMatch(/^Search for “Star”/)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Starts')
  })

  it('suggests a filter from the values the records hold', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('melb')
    await user.click(await option(/City is Melbourne/))
    expect(chipLabels()).toEqual(['City is Melbourne'])
    expect(input()).toHaveValue('')
    expect(lastView().query).toMatchObject({
      search: '',
      filters: [{ field: 'city', operator: 'is', values: ['Melbourne'] }]
    })
    expect(rows()).toHaveLength(6)
  })

  it('reads a negation as the opposite filter, joining chips with the same condition', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('city is not melb')
    await user.click(await option(/City is not Melbourne/))
    expect(chipLabels()).toEqual(['City is not Melbourne'])
    expect(input()).toHaveValue('')
    expect(lastView().query).toMatchObject({
      search: '',
      filters: [{ field: 'city', operator: 'is-not', values: ['Melbourne'] }]
    })
    await user.keyboard('not syd')
    await user.click(await option(/City is not Sydney/))
    await user.keyboard('perth')
    await user.click(await option(/City is Perth/))
    expect(chipLabels()).toEqual([
      'City is not Melbourne or Sydney',
      'City is Perth'
    ])
  })

  it('keeps searching the words a filter did not read', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('melb ocean')
    await user.click(await option(/City is Melbourne/))
    expect(input()).toHaveValue('ocean')
    expect(lastView().query).toMatchObject({
      search: 'ocean',
      filters: [{ field: 'city', operator: 'is', values: ['Melbourne'] }]
    })
  })

  it('picks a field, then its values, adding to the field’s chip', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.click(await option('City'))
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('City is')
    // Typing in the value step narrows the values, not the records.
    await user.keyboard('syd')
    expect(lastView()?.query.search ?? '').toBe('')
    await user.click(await option('Sydney'))
    expect(chipLabels()).toEqual(['City is Sydney'])
    await user.click(input())
    await user.click(await option('City'))
    await user.click(await option('Perth'))
    expect(chipLabels()).toEqual(['City is Sydney or Perth'])
  })

  it('offers dates for a date field, each with what it stands for', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.click(await option('Starts'))
    const weekend = await option(/This weekend/)
    expect(weekend).toHaveTextContent('3 to 4 Oct 2026')
    await user.click(weekend)
    expect(chipLabels()).toEqual(['Starts is this weekend'])
    expect(chip('Starts')).toHaveTextContent('3 to 4 Oct 2026')
    expect(lastView().query.filters).toEqual([
      { field: 'starts', operator: 'within', value: 'this-weekend' }
    ])
  })

  it('edits a chip’s values and condition in the list, as they change', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }
      }
    })
    await user.click(
      within(chip('City is Perth')).getByRole('button', {
        name: 'City is Perth'
      })
    )
    expect(input()).toHaveFocus()
    expect(chip('City is Perth')).toHaveAttribute('data-selected')
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(ticked()).toEqual(['Perth']))
    await user.click(await option('Hobart'))
    expect(chipLabels()).toEqual(['City is Perth or Hobart'])
    await waitFor(() => expect(ticked()).toEqual(['Hobart', 'Perth']))
    expect(chip('City is Perth or Hobart')).toHaveAttribute('data-selected')
    await user.click(screen.getByRole('button', { name: 'is not' }))
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is-not', values: ['Perth', 'Hobart'] }
    ])
    await waitFor(() => expect(ticked()).toEqual(['Hobart', 'Perth']))
    await user.keyboard('{Escape}')
    expect(chip('City is not')).not.toHaveAttribute('data-selected')
    expect(chipLabels()).toEqual(['City is not Perth or Hobart'])
    await user.keyboard('{Escape}')
    expect(rows()).toHaveLength(18)
    await selectChip(user, 'City is not Perth or Hobart')
    expect(
      screen.getByRole('button', { name: 'is not', pressed: true })
    ).toBeInTheDocument()
    await waitFor(() => expect(ticked()).toEqual(['Hobart', 'Perth']))
  })

  it('keeps an option chip’s values in its dashed chip while editing', async () => {
    const { user } = setup({
      defaultView: {
        query: {
          filters: [
            { field: 'city', operator: 'is', values: ['Perth', 'Hobart'] }
          ]
        }
      }
    })
    await selectChip(user, 'City is Perth or Hobart')
    expect(input()).toHaveValue('')
    expect(input()).toHaveAccessibleDescription('City is Perth or Hobart')
    await user.click(await option('Hobart'))
    await waitFor(() =>
      expect(input()).toHaveAccessibleDescription('City is Perth')
    )
    await user.click(screen.getByRole('button', { name: 'is empty' }))
    expect(input()).toHaveAccessibleDescription('City is empty')
  })

  it('says a typed value is already in the chip when it’s the only match', async () => {
    const { user } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }
      }
    })
    const hint = () =>
      document.querySelector('[data-slot=query-field-hint]')?.textContent
    await selectChip(user, 'City is Perth')
    await user.keyboard('per')
    await waitFor(() => expect(hint()).toBe('Perth is already in this filter.'))
    expect(ticked()).toEqual(['Perth'])
    await user.keyboard('{Enter}')
    expect(chipLabels()).toEqual(['City is Perth'])
    await user.keyboard('{Backspace}{Backspace}{Backspace}h')
    await waitFor(() => expect(hint()).toBe(''))
  })

  it('lists suggestions for the words a taken filter leaves', async () => {
    const { user } = setup()
    await user.click(input())
    await user.keyboard('melb this weekend')
    await user.click(await option(/City is Melbourne/))
    expect(chipLabels()).toEqual(['City is Melbourne'])
    expect(input()).toHaveValue('this weekend')
    expect(await option(/^Starts is this weekend/)).toBeInTheDocument()
  })

  it('puts a new date on a field in place of its earlier one', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.click(await option('Starts'))
    await user.click(await option(/^This weekend/))
    await user.click(input())
    await user.click(await option('Starts'))
    await user.click(await option(/^Past/))
    expect(lastView().query.filters).toEqual([
      { field: 'starts', operator: 'within', value: 'past' }
    ])
    expect(chipLabels()).toEqual(['Starts is in the past'])
  })

  it('adds a date typed under is after', async () => {
    const { user, lastView } = setup()
    await datesUnder(user, 'is after')
    await user.keyboard('1 dec')
    await option(/1 Dec 2026/)
    await user.keyboard('{Enter}')
    expect(lastView().query.filters).toEqual([AFTER_1_DEC])
    expect(chipLabels()).toEqual(['Starts is after 1 Dec'])
  })

  it('puts a typed date in place of the field’s is empty chip', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: { filters: [{ field: 'starts', operator: 'is-not-set' }] }
      }
    })
    await datesUnder(user, 'is after')
    await user.keyboard('1 dec')
    await option(/1 Dec 2026/)
    await user.keyboard('{Enter}')
    expect(lastView().query.filters).toEqual([AFTER_1_DEC])
  })

  // A saved view can hold both.
  it('drops the field’s is empty chip as a date chip is rewritten', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [AFTER_1_DEC, { field: 'starts', operator: 'is-not-set' }]
        }
      }
    })
    await selectChip(user, chipLabels()[0]!)
    await user.keyboard('2 dec')
    await option(/2 Dec 2026/)
    await user.keyboard('{Enter}')
    expect(lastView().query.filters).toEqual([
      { ...AFTER_1_DEC, value: '2026-12-02' }
    ])
  })

  it('offers the days typed text names under is, and Enter adds the first', async () => {
    const { user, lastView } = setup()
    await datesUnder(user, 'is')
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toHaveTextContent('Starts is')
    await user.keyboard('fri')
    const friday = await option(/^Fri/)
    expect(friday).toHaveTextContent('Fri 9 Oct 2026')
    await user.keyboard('{Enter}')
    expect(lastView().query.filters).toEqual([
      { field: 'starts', operator: 'on', value: '2026-10-09' }
    ])
    expect(chipLabels()).toEqual(['Starts is on Fri 9 Oct'])
  })

  it.each(['22 oct to 30 oct', '22 oct and 30 oct'])(
    'reads “%s” as a range under is between',
    async (typed) => {
      const { user, lastView } = setup()
      await datesUnder(user, 'is between')
      await user.keyboard(typed)
      await option(/22 to 30 Oct/)
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        {
          field: 'starts',
          operator: 'between',
          value: ['2026-10-22', '2026-10-30']
        }
      ])
      expect(chipLabels()).toEqual(['Starts is 22 to 30 Oct'])
    }
  )

  it('says a date can be typed as well as picked', async () => {
    const { user } = setup()
    const hint = () =>
      document.querySelector('[data-slot=query-field-hint]')?.textContent
    await datesUnder(user, 'is before')
    await waitFor(() =>
      expect(hint()).toBe('Pick a day, or type one like 22 Oct.')
    )
    await user.click(screen.getByRole('button', { name: 'is between' }))
    await waitFor(() =>
      expect(hint()).toBe('Pick two days, or type them like 22 Oct to 30 Oct.')
    )
    await user.click(screen.getByRole('button', { name: 'is relative' }))
    await waitFor(() => expect(hint()).toBeFalsy())
  })

  it('says what to type for text that names no date', async () => {
    const { user } = setup()
    const hint = () =>
      document.querySelector('[data-slot=query-field-hint]')?.textContent
    await datesUnder(user, 'is before')
    await user.keyboard('zzz')
    await waitFor(() =>
      expect(hint()).toBe('Type a date like 22 Oct or next Fri.')
    )
    await user.click(screen.getByRole('button', { name: 'is between' }))
    await waitFor(() =>
      expect(hint()).toBe('Type two dates like 22 Oct to 30 Oct.')
    )
  })

  it('shows a calendar under a day’s condition, not under is relative', async () => {
    const { user } = setup()
    await user.click(input())
    await user.click(await option('Starts'))
    expect(
      screen.getByRole('button', { name: 'is relative', pressed: true })
    ).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()
    expect(screen.queryByText('No suggestions')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'is' }))
    expect(await screen.findByRole('grid')).toBeInTheDocument()
    expect(screen.queryByText('No suggestions')).toBeNull()
  })

  it('shows the page’s scope first, locked, and never clears it', async () => {
    const scope: RecordFilter[] = [
      { field: 'city', operator: 'is', values: ['Perth'] }
    ]
    const { user, lastView } = setup({
      scope,
      defaultView: {
        query: {
          search: 'ocean',
          filters: [{ field: 'status', operator: 'is', values: ['on_sale'] }]
        }
      }
    })
    expect(chipLabels()).toEqual(['City is Perth', 'Status is On sale'])
    expect(chip('City is Perth')).toHaveAttribute('data-locked')
    expect(within(chip('City is Perth')).queryByRole('button')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(chipLabels()).toEqual(['City is Perth'])
    expect(lastView().query).toMatchObject({ search: '', filters: [] })
    expect(rows()).toHaveLength(6)
  })

  it('marks a filter its records can’t apply', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setup({
      defaultView: {
        query: { filters: [{ field: 'venue', operator: 'is', values: ['x'] }] }
      }
    })
    expect(chip('venue is x')).toHaveClass('intent-warning')
    expect(chip('venue is x')).toHaveTextContent('Not applied')
  })

  it('takes the shortcut from the toolbar', () => {
    function Toolbar() {
      const records = useRecords({ data: shows, fields })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Header searchFocusShortcut={false} />
        </Records.Root>
      )
    }
    render(<Toolbar />)
    expect(input()).not.toHaveAttribute('aria-keyshortcuts')
  })

  it('focuses on /', async () => {
    const { user } = setup()
    await user.keyboard('/')
    expect(input()).toHaveFocus()
    expect(input()).toHaveValue('')
  })

  it('takes no shortcut when asked', async () => {
    function NoShortcut() {
      const records = useRecords({ data: shows, fields })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search focusShortcut={false} />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<NoShortcut />)
    await user.keyboard('/')
    expect(input()).not.toHaveFocus()
  })

  it('takes a filter already applied for its words, adding nothing', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Melbourne'] }]
        }
      }
    })
    await user.click(input())
    await user.keyboard('melb')
    await user.click(await option(/City is Melbourne.*Already applied/))
    expect(chipLabels()).toEqual(['City is Melbourne'])
    expect(input()).toHaveValue('')
    expect(lastView()?.query.search ?? '').toBe('')
  })

  it('adds nothing for a filter the scope applies', async () => {
    const { user } = setup({
      scope: [{ field: 'city', operator: 'is', values: ['Melbourne'] }]
    })
    await user.click(input())
    await user.keyboard('melb')
    await user.click(await option(/City is Melbourne.*Already applied/))
    expect(chipLabels()).toEqual(['City is Melbourne'])
    expect(input()).toHaveValue('')
  })

  it('removes a chip once its last value is unticked', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }
      }
    })
    await user.click(
      within(chip('City is Perth')).getByRole('button', {
        name: 'City is Perth'
      })
    )
    await user.click(await option('Perth'))
    expect(chipLabels()).toEqual([])
    expect(lastView().query.filters).toEqual([])
    expect(input()).toHaveFocus()
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toBeNull()
  })

  it('ends the step when the chip being edited is removed', async () => {
    const { user } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
        }
      }
    })
    await selectChip(user, 'City is Perth')
    await user.click(
      // The open list hides the rest of the page from assistive technology.
      screen.getByRole('button', { name: 'Remove City is Perth', hidden: true })
    )
    expect(chipLabels()).toEqual([])
    expect(
      document.querySelector('[data-slot=query-field-pending-chip]')
    ).toBeNull()
    expect(await option('City')).toBeInTheDocument()
  })

  it('removes the chip being edited with Backspace, and keeps it on Escape', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [
            { field: 'city', operator: 'is', values: ['Perth'] },
            { field: 'status', operator: 'is', values: ['on_sale'] }
          ]
        }
      }
    })
    await user.click(
      within(chip('City is Perth')).getByRole('button', {
        name: 'City is Perth'
      })
    )
    await user.keyboard('{Escape}')
    expect(chipLabels()).toEqual(['City is Perth', 'Status is On sale'])
    await user.click(
      within(chip('City is Perth')).getByRole('button', {
        name: 'City is Perth'
      })
    )
    await user.keyboard('{Backspace}')
    expect(chipLabels()).toEqual(['Status is On sale'])
    expect(lastView().query.filters).toEqual([
      { field: 'status', operator: 'is', values: ['on_sale'] }
    ])
  })

  it('lists a chosen value the records don’t hold, so it can be unticked', async () => {
    const { user, lastView } = setup({
      defaultView: {
        query: {
          filters: [
            { field: 'city', operator: 'is', values: ['Perth', 'Darwin'] }
          ]
        }
      }
    })
    await user.click(
      within(chip('City is')).getByRole('button', { name: /^City is/ })
    )
    await waitFor(() => expect(ticked()).toEqual(['Perth', 'Darwin']))
    await user.keyboard('dar')
    await user.click(await option('Darwin'))
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is', values: ['Perth'] }
    ])
  })

  it('edits the same date filter after a parent reorders them', async () => {
    const onViewChange = vi.fn()
    function Sorted() {
      const [view, setView] = useState<RecordView>({
        query: {
          search: '',
          filters: [
            AFTER_1_DEC,
            { field: 'city', operator: 'is', values: ['Perth'] }
          ],
          sort: []
        },
        layout: { type: 'table' }
      })
      const records = useRecords({
        data: shows,
        fields,
        view,
        onViewChange: (next) => {
          onViewChange(next)
          // The parent keeps filters in field order.
          setView({
            ...next,
            query: {
              ...next.query,
              filters: [...next.query.filters].sort((a, b) =>
                a.field.localeCompare(b.field)
              )
            }
          })
        }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<Sorted />)
    await selectChip(user, chipLabels()[0]!)
    await user.keyboard('2 dec')
    await option(/2 Dec 2026/)
    await user.keyboard('{Enter}')
    await selectChip(user, 'Starts is after 2 Dec')
    await user.keyboard('3 dec')
    await option(/3 Dec 2026/)
    await user.keyboard('{Enter}')
    const filters = onViewChange.mock.lastCall![0].query.filters
    expect(filters).toEqual([
      { field: 'city', operator: 'is', values: ['Perth'] },
      { ...AFTER_1_DEC, value: '2026-12-03' }
    ])
  })

  it('keeps searching the words a picked field didn’t read', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('ocean cit')
    await user.click(await option('City'))
    expect(lastView().query.search).toBe('ocean')
  })

  it('keeps editing a chip, and every value taken, when the parent commits late', async () => {
    function Late() {
      const [view, setView] = useState<RecordView>({
        query: {
          search: '',
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }],
          sort: []
        },
        layout: { type: 'table' }
      })
      const records = useRecords({
        data: shows,
        fields,
        view,
        onViewChange: (next) => setTimeout(() => setView(next), 20)
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<Late />)
    await user.click(
      within(chip('City is Perth')).getByRole('button', {
        name: 'City is Perth'
      })
    )
    await user.click(await option('Hobart'))
    await user.click(await option('Sydney'))
    await waitFor(() =>
      expect(chipLabels()).toEqual(['City is Perth, Hobart or 1 more'])
    )
    expect(chip('City is Perth, Hobart')).toHaveAttribute('data-selected')
    await waitFor(() => expect(ticked()).toEqual(['Hobart', 'Perth', 'Sydney']))
  })

  it('adds chips and keeps the scope in server mode', async () => {
    const onViewChange = vi.fn()
    function Server() {
      const records = useRecords({
        data: shows.slice(0, 10),
        rowCount: 30,
        fields,
        getRowId: (row) => row.id,
        scope: [{ field: 'status', operator: 'is', values: ['on_sale'] }],
        onViewChange
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search />
          <output data-testid='fetch'>
            {JSON.stringify(records.scopedQuery)}
          </output>
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<Server />)
    expect(chipLabels()).toEqual(['Status is On sale'])
    await user.click(input())
    await user.click(await option('Sold'))
    await user.keyboard('100')
    await option('Sold is 100')
    await user.keyboard('{Enter}')
    expect(chipLabels()).toEqual(['Status is On sale', 'Sold is 100'])
    expect(
      JSON.parse(screen.getByTestId('fetch').textContent!).filters
    ).toEqual([
      { field: 'status', operator: 'is', values: ['on_sale'] },
      { field: 'sold', operator: 'eq', value: 100 }
    ])
    expect(onViewChange.mock.lastCall![0].query.filters).toEqual([
      { field: 'sold', operator: 'eq', value: 100 }
    ])
  })

  it('renders on a server, which has no DOMRect', () => {
    const original = globalThis.DOMRect
    // @ts-expect-error the server's global scope
    delete globalThis.DOMRect
    try {
      expect(() => renderToString(<Shows />)).not.toThrow()
    } finally {
      globalThis.DOMRect = original
    }
  })

  it('marks field and filter suggestions with the field’s icon, or its type’s', async () => {
    const withIcon = fields.map((each) =>
      each.key === 'city'
        ? { ...each, icon: <svg data-testid='city-icon' /> }
        : each
    )
    const { user } = setup({ fields: withIcon })
    const iconOf = (option: HTMLElement) =>
      option.querySelector('[aria-hidden=true]')?.innerHTML
    const markup = (icon: ReactElement) => renderToStaticMarkup(icon)
    await user.click(input())
    expect(within(await option('City')).getByTestId('city-icon')).toBeTruthy()
    expect(iconOf(await option('Show'))).toBe(
      markup(<TextAaIcon weight='bold' />)
    )
    expect(iconOf(await option('Sold'))).toBe(
      markup(<HashIcon weight='bold' />)
    )
    expect(iconOf(await option('Status'))).toBe(
      markup(<CircleHalfIcon weight='bold' />)
    )
    expect(iconOf(await option('Starts'))).toBe(
      markup(<CalendarBlankIcon weight='bold' />)
    )
    await user.keyboard('melb')
    expect(
      within(await option(/City is Melbourne/)).getByTestId('city-icon')
    ).toBeTruthy()
  })

  it('steps through a location’s values as an option’s, under a map pin', async () => {
    const located = fields.map((each) =>
      each.key === 'city' ? field.location('city', { label: 'Location' }) : each
    )
    const { user, lastView } = setup({ fields: located })
    const operators = () =>
      within(screen.getByRole('group', { name: 'Operator' }))
        .getAllByRole('button')
        .map((item) => item.textContent)
    await user.click(input())
    expect(
      (await option('Location')).querySelector('[aria-hidden=true]')?.innerHTML
    ).toBe(renderToStaticMarkup(<MapPinIcon weight='bold' />))
    await user.click(await option('Location'))
    expect(operators()).toEqual([
      'is in',
      'is not in',
      'is empty',
      'is not empty'
    ])
    await user.click(await option('Perth'))
    await user.click(input())
    await user.click(await option('Location'))
    await user.click(await option('Hobart'))
    expect(chipLabels()).toEqual(['Location is in Perth or Hobart'])
    await user.keyboard('{Escape}')
    await selectChip(user, 'Location is in Perth or Hobart')
    expect(input()).toHaveValue('')
    expect(input()).toHaveAccessibleDescription(
      'Location is in Perth or Hobart'
    )
    await waitFor(() => expect(ticked()).toEqual(['Hobart', 'Perth']))
    await user.click(await option('Perth'))
    expect(chipLabels()).toEqual(['Location is in Hobart'])
    await user.click(screen.getByRole('button', { name: 'is not in' }))
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is-not', values: ['Hobart'] }
    ])
    await waitFor(() => expect(ticked()).toEqual(['Hobart']))
  })

  it('reads a place listed from the records from its start, never a word inside it', async () => {
    const located = fields.map((each) =>
      each.key === 'city' ? field.location('city', { label: 'Location' }) : each
    )
    const places = ['au-vic-fitzroy', 'Brisbane']
    const data = shows.map((show, index) => ({
      ...show,
      city: places[index % places.length]!
    }))
    const { user } = setup({ fields: located, data })
    await user.click(input())
    await user.keyboard('bris')
    expect(await option(/Location is in Brisbane/)).toBeTruthy()
    await user.clear(input())
    await user.keyboard('au-vic')
    expect(await option(/Location is in au-vic-fitzroy/)).toBeTruthy()
    await user.clear(input())
    await user.keyboard('vic')
    await waitFor(() =>
      expect(
        screen.queryByRole('option', { name: /Location is in/ })
      ).toBeNull()
    )
  })

  it('filters to the places inside a location, and says where each is', async () => {
    const placed = fields.map((each) =>
      each.key === 'city'
        ? field.location('city', {
            label: 'Location',
            options: [
              { value: 'Queensland', label: 'Queensland', kind: 'state' },
              {
                value: 'Brisbane',
                label: 'Brisbane',
                kind: 'city',
                parent: 'Queensland'
              },
              { value: 'Victoria', label: 'Victoria', kind: 'state' },
              {
                value: 'Melbourne',
                label: 'Melbourne',
                kind: 'city',
                parent: 'Victoria'
              }
            ]
          })
        : each
    )
    const { user, lastView } = setup({ fields: placed })
    await user.click(input())
    await user.keyboard('queens')
    const queensland = await option(/Location is in Queensland/)
    expect(within(queensland).getByText('State')).toBeTruthy()
    await user.click(queensland)
    expect(chipLabels()).toEqual(['Location is in Queensland'])
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is', values: ['Queensland'] }
    ])
    await waitFor(() =>
      expect(
        new Set(
          rows().map((row) => within(row).getAllByRole('cell')[1]?.textContent)
        )
      ).toEqual(new Set(['Brisbane']))
    )
    await user.click(input())
    await user.click(await option('Location'))
    await user.click(screen.getByRole('button', { name: 'is not in' }))
    expect(input()).toHaveAccessibleDescription('Location is not in')
    expect(
      within(await option(/Melbourne/)).getByText('City in Victoria')
    ).toBeTruthy()
  })

  it('leaves icons off value suggestions and chips', async () => {
    const withIcon = fields.map((each) =>
      each.key === 'city'
        ? { ...each, icon: <svg data-testid='city-icon' /> }
        : each
    )
    const { user } = setup({ fields: withIcon })
    await user.click(input())
    await user.click(await option('City'))
    const sydney = await option('Sydney')
    expect(sydney.querySelector('svg')).toBeNull()
    await user.click(sydney)
    expect(screen.queryByTestId('city-icon')).toBeNull()
    // Only the remove button's.
    expect(chip('City is Sydney').querySelectorAll('svg')).toHaveLength(1)
  })

  describe('operators', () => {
    const pendingChip = () =>
      document.querySelector('[data-slot=query-field-pending-chip]')
    const operatorNames = () =>
      within(screen.getByRole('group', { name: 'Operator' }))
        .getAllByRole('button')
        .map((item) => item.textContent)

    it('picks a field, then is not, then a value, adding that chip', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('City'))
      expect(operatorNames()).toEqual([
        'is',
        'is not',
        'is empty',
        'is not empty'
      ])
      await user.click(screen.getByRole('button', { name: 'is not' }))
      expect(pendingChip()).toHaveTextContent('City is not')
      await user.click(await option('Sydney'))
      expect(chipLabels()).toEqual(['City is not Sydney'])
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not', values: ['Sydney'] }
      ])
    })

    it('takes the first value typed for with Enter', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('City'))
      await user.keyboard('syd')
      await option('Sydney')
      await user.keyboard('{Enter}')
      expect(chipLabels()).toEqual(['City is Sydney'])
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Sydney'] }
      ])
    })

    it('moves to the next operator with Tab, and starts each field on is', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('City'))
      await user.tab()
      expect(pendingChip()).toHaveTextContent('City is not')
      await user.keyboard('perth')
      await user.click(await option('Perth'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not', values: ['Perth'] }
      ])
      await user.click(input())
      await user.click(await option('Status'))
      expect(pendingChip()).toHaveTextContent('Status is')
      expect(pendingChip()).not.toHaveTextContent('is not')
    })

    const listed = () =>
      screen
        .queryAllByRole('option')
        .map(
          (each) =>
            each.querySelector('[data-slot=query-field-option-label]')
              ?.textContent
        )
    const enterTarget = () =>
      screen
        .queryAllByRole('option')
        .filter((each) => within(each).queryByText('Enter'))
        .map(
          (each) =>
            each.querySelector('[data-slot=query-field-option-label]')
              ?.textContent
        )

    it.each(['City', 'Show', 'Sold', 'Gross', 'Starts'])(
      'tabs %s to is empty, which lists only its chip’s row, for Enter to add',
      async (name) => {
        const { user, lastView } = setup()
        await user.click(input())
        await user.click(await option(name))
        const names = operatorNames()
        expect(names.slice(-2)).toEqual(['is empty', 'is not empty'])
        await user.keyboard('{Tab}'.repeat(names.indexOf('is empty')))
        expect(
          screen.getByRole('button', { name: 'is empty', pressed: true })
        ).toBeInTheDocument()
        expect(pendingChip()).toHaveTextContent(`${name} is empty`)
        await waitFor(() => expect(listed()).toEqual([`${name} is empty`]))
        expect(enterTarget()).toEqual([`${name} is empty`])
        await user.keyboard('{Enter}')
        expect(chipLabels()).toEqual([`${name} is empty`])
        expect(lastView().query.filters).toEqual([
          {
            field: fields.find((each) => each.label === name)!.key,
            operator: 'is-not-set'
          }
        ])
      }
    )

    it.each([
      ['City', 'mel', 'is', 'Melbourne', 'City is Melbourne'],
      [
        'Show',
        'disco',
        'contains',
        'Show contains “disco”',
        'Show contains “disco”'
      ],
      ['Sold', '20', 'is', 'Sold is 20', 'Sold is 20']
    ])(
      'switches %s from is not empty to its first operator as you type, so the text applies',
      async (name, typed, first, row, chipLabel) => {
        const { user } = setup()
        await user.click(input())
        await user.click(await option(name))
        await user.click(screen.getByRole('button', { name: 'is not empty' }))
        await user.keyboard(typed)
        expect(
          screen.getByRole('button', { name: first, pressed: true })
        ).toBeInTheDocument()
        await waitFor(() => expect(enterTarget()).toEqual([row]))
        await user.keyboard('{Enter}')
        expect(chipLabels()).toEqual([chipLabel])
      }
    )

    it('replaces a field’s values with is empty, and is empty with a value', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is', values: ['Perth'] },
              { field: 'status', operator: 'is', values: ['on_sale'] },
              { field: 'city', operator: 'is-not', values: ['Hobart'] }
            ]
          }
        }
      })
      await user.click(input())
      await user.click(await option('City'))
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      await user.click(await option('City is empty'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not-set' },
        { field: 'status', operator: 'is', values: ['on_sale'] }
      ])
      await user.click(input())
      await user.click(await option('City'))
      await user.keyboard('mel{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Melbourne'] },
        { field: 'status', operator: 'is', values: ['on_sale'] }
      ])
    })

    // A saved view can hold both.
    it('drops a field’s is empty chip as a value joins its is chip', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is', values: ['Perth'] },
              { field: 'city', operator: 'is-not-set' }
            ]
          }
        }
      })
      await user.click(input())
      await user.click(await option('City'))
      await user.keyboard('mel{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth', 'Melbourne'] }
      ])
    })

    it('replaces a field’s other chips when a chip is edited to is empty', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is', values: ['Perth'] },
              { field: 'city', operator: 'is-not', values: ['Hobart'] }
            ]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not-set' }
      ])
    })

    it('keeps a field’s values beside is not empty', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: { filters: [{ field: 'city', operator: 'is-set' }] }
        }
      })
      await user.click(input())
      await user.click(await option('City'))
      await user.keyboard('mel{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-set' },
        { field: 'city', operator: 'is', values: ['Melbourne'] }
      ])
    })

    it('adds is not empty with a tap on the operator, then its row', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('City'))
      await user.click(screen.getByRole('button', { name: 'is not empty' }))
      await user.click(await option('City is not empty'))
      expect(chipLabels()).toEqual(['City is not empty'])
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-set' }
      ])
    })

    it('ticks is empty’s row when its chip is applied, and Enter adds no second chip', async () => {
      const { user } = setup({
        defaultView: {
          query: { filters: [{ field: 'city', operator: 'is-not-set' }] }
        }
      })
      await user.click(input())
      await user.click(await option('City'))
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      await waitFor(() => expect(ticked()).toEqual(['City is empty']))
      expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
      await user.keyboard('{Enter}')
      expect(chipLabels()).toEqual(['City is empty'])
      expect(pendingChip()).toBeNull()
    })

    it('adds no chip that repeats a scope chip', async () => {
      const { user } = setup({
        scope: [{ field: 'city', operator: 'is-not-set' }]
      })
      await user.click(input())
      await user.click(await option('City'))
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      await user.click(await option('City is empty'))
      expect(chipLabels()).toEqual(['City is empty'])
    })

    it('merges a chip edited to match another into it', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is-not-set' },
              { field: 'city', operator: 'is', values: ['Perth'] }
            ]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      await user.click(await option('City is empty'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not-set' }
      ])
      expect(chipLabels()).toEqual(['City is empty'])
    })

    it('sets typed text aside under is empty, and brings it back after Shift+Tab', async () => {
      const { user } = setup()
      await user.click(input())
      await user.click(await option('City'))
      await user.keyboard('syd')
      await option('Sydney')
      await user.tab()
      await user.tab()
      await waitFor(() => expect(listed()).toEqual(['City is empty']))
      // Set aside, as is empty takes no value.
      expect(input()).toHaveValue('')
      await user.tab({ shift: true })
      await user.tab({ shift: true })
      expect(input()).toHaveValue('syd')
      await waitFor(() => expect(listed()).toEqual(['Sydney']))
    })

    it('leaves the field with Tab past is not empty', async () => {
      const { user } = setup()
      await user.click(input())
      await user.click(await option('City'))
      for (let tab = 0; tab < 3; tab++) await user.tab()
      expect(
        screen.getByRole('button', { name: 'is not empty', pressed: true })
      ).toBeInTheDocument()
      expect(input()).toHaveFocus()
      await user.tab()
      expect(input()).not.toHaveFocus()
    })

    it('offers has all only for a field holding several values, and a date its own conditions', async () => {
      const several = fields.map((each) =>
        each.key === 'city' ? { ...each, multiple: true } : each
      )
      const { user } = setup({ fields: several })
      await user.click(input())
      await user.click(await option('City'))
      expect(operatorNames()).toEqual([
        'is',
        'is not',
        'has all of',
        'is empty',
        'is not empty'
      ])
      await user.keyboard('{Escape}')
      await user.click(input())
      await user.click(await option('Starts'))
      await option(/This weekend/)
      expect(operatorNames()).toEqual([
        'is relative',
        'is',
        'is before',
        'is after',
        'is between',
        'is empty',
        'is not empty'
      ])
    })
  })

  describe('text and number steps', () => {
    const hint = () =>
      document
        .querySelector('[data-slot=query-field-hint]')
        ?.textContent?.replace('\u2060', '')
    const operatorNames = () =>
      within(screen.getByRole('group', { name: 'Operator' }))
        .getAllByRole('button')
        .map((item) => [item.textContent, item.getAttribute('aria-label')])
    const optionLabels = () =>
      screen
        .queryAllByRole('option')
        .map(
          (each) =>
            each.querySelector('[data-slot=query-field-option-label]')
              ?.textContent
        )

    it('picks a text field, then doesn’t contain, then takes the typed text with Enter', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('Show'))
      expect(operatorNames()).toEqual([
        ['contains', null],
        ['doesn’t contain', null],
        ['is', null],
        ['is not', null],
        ['is empty', null],
        ['is not empty', null]
      ])
      await waitFor(() => expect(hint()).toBe('Type the text to match.'))
      expect(optionLabels()).toEqual([])
      await user.click(screen.getByRole('button', { name: 'doesn’t contain' }))
      await user.keyboard('ocean')
      await option('Show doesn’t contain “ocean”')
      await user.keyboard('{Enter}')
      expect(chipLabels()).toEqual(['Show doesn’t contain “ocean”'])
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'not-contains', value: 'ocean' }
      ])
      expect(rows()).toHaveLength(25)
    })

    it.each<[string, string, RecordFilter]>([
      ['is', '1,500', { field: 'gross', operator: 'eq', value: 1500 }],
      ['is not', '$1500', { field: 'gross', operator: 'neq', value: 1500 }],
      ['is less than', '50', { field: 'gross', operator: 'lt', value: 50 }],
      ['is more than', '50', { field: 'gross', operator: 'gt', value: 50 }],
      [
        'is between',
        '$20 to $50',
        { field: 'gross', operator: 'between', value: [20, 50] }
      ]
    ])('makes a money filter with %s', async (operator, typed, filter) => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('Gross'))
      await user.click(screen.getByRole('button', { name: operator }))
      await user.keyboard(typed)
      await waitFor(() => expect(optionLabels()).toHaveLength(1))
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([filter])
    })

    it('names a number’s operator symbols, and offers nothing for text that isn’t one', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('Sold'))
      expect(operatorNames()).toEqual([
        ['=', 'is'],
        ['≠', 'is not'],
        ['<', 'is less than'],
        ['>', 'is more than'],
        ['between', 'is between'],
        ['is empty', null],
        ['is not empty', null]
      ])
      await user.keyboard('lots')
      await waitFor(() => expect(optionLabels()).toEqual([]))
      await user.keyboard('{Enter}')
      expect(chipLabels()).toEqual([])
      await user.clear(input())
      await user.keyboard('20-50')
      await waitFor(() => expect(optionLabels()).toEqual([]))
      await user.click(screen.getByRole('button', { name: 'is between' }))
      await option('Sold is 20 to 50')
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'sold', operator: 'between', value: [20, 50] }
      ])
    })

    const between = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(input())
      await user.click(await option('Sold'))
      await user.click(screen.getByRole('button', { name: 'is between' }))
    }

    it('adds and after a range’s first number, and reads the second', async () => {
      const { user, lastView } = setup()
      await between(user)
      await waitFor(() =>
        expect(hint()).toBe('Type two numbers like 20 and 50.')
      )
      await user.keyboard('2')
      await waitFor(() =>
        expect(hint()).toBe('Between 2 and what? Type the second number.')
      )
      expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
      await user.keyboard(' ')
      expect(input()).toHaveValue('2 and ')
      await waitFor(() =>
        expect(hint()).toBe('Between 2 and what? Type the second number.')
      )
      await user.keyboard('7')
      await option('Sold is 2 to 7')
      expect(hint()).toBe('')
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'sold', operator: 'between', value: [2, 7] }
      ])
    })

    it.each([
      ['2 and 7', [2, 7]],
      ['7 to 2', [2, 7]]
    ])('reads “%s” typed in full under between', async (typed, value) => {
      const { user, lastView } = setup()
      await between(user)
      await user.keyboard(typed)
      expect(input()).toHaveValue(typed)
      await option(`Sold is ${value[0]} to ${value[1]}`)
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'sold', operator: 'between', value }
      ])
    })

    it('takes the and a space added away with one Backspace', async () => {
      const { user } = setup()
      await between(user)
      await user.keyboard('2 ')
      expect(input()).toHaveValue('2 and ')
      await user.keyboard('{Backspace}')
      expect(input()).toHaveValue('2')
      await user.keyboard(' ')
      expect(input()).toHaveValue('2 and ')
    })

    it.each<[string, string, string, string]>([
      ['Gross', 'is', '', 'Type an amount.'],
      ['Gross', 'is', 'lots', 'Type an amount like $50.'],
      ['Sold', 'is less than', '>50', 'Type a number like 50.'],
      [
        'Gross',
        'is between',
        '$1,000',
        'Between $1,000 and what? Type the second amount.'
      ],
      ['Show', 'contains', '', 'Type the text to match.']
    ])(
      'hints what to type for %s %s after “%s”',
      async (name, operator, typed, text) => {
        const { user } = setup()
        await user.click(input())
        await user.click(await option(name))
        await user.click(screen.getByRole('button', { name: operator }))
        if (typed) await user.keyboard(typed)
        await waitFor(() => expect(hint()).toBe(text))
        expect(screen.queryByText('No suggestions')).not.toBeInTheDocument()
      }
    )

    it('keeps No suggestions for an option step', async () => {
      const { user } = setup()
      await user.click(input())
      await user.click(await option('Status'))
      await user.keyboard('zzz')
      expect(await screen.findByText('No suggestions')).toBeInTheDocument()
      expect(hint()).toBe('')
    })

    it('prefills a text chip’s value and condition, and Enter updates it and ends the edit', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'show', operator: 'not-contains', value: 'ocean' }
            ]
          }
        }
      })
      await selectChip(user, 'Show doesn’t contain “ocean”')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(input()).toHaveValue('ocean')
      expect(
        screen.getByRole('button', { name: 'doesn’t contain', pressed: true })
      ).toBeInTheDocument()
      await waitFor(() =>
        expect(ticked()).toEqual(['Show doesn’t contain “ocean”'])
      )
      // Enter with nothing new to take writes nothing and ends the edit.
      await user.keyboard('{Enter}')
      expect(lastView()).toBeUndefined()
      expect(chip('Show doesn’t contain “ocean”')).not.toHaveAttribute(
        'data-selected'
      )
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      await selectChip(user, 'Show doesn’t contain “ocean”')
      // The condition changes the row, not the chip, until it is taken.
      await user.click(screen.getByRole('button', { name: 'contains' }))
      expect(lastView()).toBeUndefined()
      await user.clear(input())
      await user.keyboard('alley{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'contains', value: 'alley' }
      ])
      // A text chip holds one value, so taking it ends the edit.
      expect(chip('Show contains “alley”')).not.toHaveAttribute('data-selected')
      expect(input()).toHaveValue('')
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chipLabels()).toEqual(['Show contains “alley”'])
    })

    it('replaces an is chip’s text, under the condition chosen', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'show', operator: 'is', values: ['Ocean Alley 1'] }
            ]
          }
        }
      })
      await selectChip(user, 'Show is Ocean Alley 1')
      expect(input()).toHaveValue('Ocean Alley 1')
      await user.clear(input())
      await user.keyboard('Ocean Alley 2{Enter}')
      const replaced = [
        { field: 'show', operator: 'is', values: ['Ocean Alley 2'] }
      ]
      expect(lastView().query.filters).toEqual(replaced)
      await selectChip(user, 'Show is Ocean Alley 2')
      await user.click(screen.getByRole('button', { name: 'is not' }))
      expect(lastView().query.filters).toEqual(replaced)
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'is-not', values: ['Ocean Alley 2'] }
      ])
    })

    it('brings text set aside under is empty back with Backspace, keeping the chip', async () => {
      const sold: RecordFilter = {
        field: 'sold',
        operator: 'between',
        value: [20, 50]
      }
      const { user, onViewChange } = setup({
        defaultView: { query: { filters: [sold] } }
      })
      await selectChip(user, 'Sold is 20 to 50')
      expect(input()).toHaveValue('20 and 50')
      await user.tab()
      expect(
        screen.getByRole('button', { name: 'is empty', pressed: true })
      ).toBeInTheDocument()
      expect(input()).toHaveValue('')
      const views = onViewChange.mock.calls.length
      await user.keyboard('{Backspace}')
      expect(input()).toHaveValue('20 and 50')
      expect(
        screen.getByRole('button', { name: 'is between', pressed: true })
      ).toBeInTheDocument()
      expect(onViewChange).toHaveBeenCalledTimes(views)
      expect(chip('Sold is 20 to 50')).toHaveAttribute('data-selected')
    })

    it('prefills a number chip’s range, and Enter updates it', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is', values: ['Perth'] },
              { field: 'sold', operator: 'between', value: [20, 50] }
            ]
          }
        }
      })
      await selectChip(user, 'Sold is 20 to 50')
      expect(input()).toHaveValue('20 and 50')
      expect(
        screen.getByRole('button', { name: 'is between', pressed: true })
      ).toBeInTheDocument()
      // Selected, so typing replaces it.
      await user.keyboard('20..600{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth'] },
        { field: 'sold', operator: 'between', value: [20, 600] }
      ])
      expect(chip('Sold is 20 to 600')).not.toHaveAttribute('data-selected')
      await selectChip(user, 'Sold is 20 to 600')
      await user.click(screen.getByRole('button', { name: 'is more than' }))
      await user.clear(input())
      await user.keyboard('100{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth'] },
        { field: 'sold', operator: 'gt', value: 100 }
      ])
      expect(chipLabels()).toEqual(['City is Perth', 'Sold is more than 100'])
    })

    it('writes nothing for a click on a text chip’s ticked row, ending the edit', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'show', operator: 'contains', value: 'ocean' }]
          }
        }
      })
      await selectChip(user, 'Show contains “ocean”')
      await user.click(await option('Show contains “ocean”'))
      expect(lastView()).toBeUndefined()
      expect(chip('Show contains “ocean”')).not.toHaveAttribute('data-selected')
      expect(input()).toHaveValue('')
    })

    it('ticks a text is chip’s row only when it holds just that text', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'show', operator: 'is', values: ['Ocean', 'Alley'] }
            ]
          }
        }
      })
      await selectChip(user, 'Show is Ocean or Alley')
      await option('Show is Ocean')
      expect(ticked()).toEqual([])
      await user.click(await option('Show is Ocean'))
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'is', values: ['Ocean'] }
      ])
    })
  })

  describe('editing a chip in the list', () => {
    it('opens an empty chip on is empty, its row ticked, and is lists the values again', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: { filters: [{ field: 'city', operator: 'is-not-set' }] }
        }
      })
      await selectChip(user, 'City is empty')
      expect(
        screen.getByRole('button', { name: 'is empty', pressed: true })
      ).toBeInTheDocument()
      await waitFor(() => expect(ticked()).toEqual(['City is empty']))
      expect(screen.getAllByRole('option')).toHaveLength(1)
      await user.click(screen.getByRole('button', { name: 'is' }))
      await option('Sydney')
      expect(lastView()).toBeUndefined()
      await user.click(await option('Sydney'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Sydney'] }
      ])
      await waitFor(() => expect(ticked()).toEqual(['Sydney']))
    })

    it('waits for Enter to rewrite an option chip to is empty', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      await user.tab()
      await user.tab()
      expect(
        screen.getByRole('button', { name: 'is empty', pressed: true })
      ).toBeInTheDocument()
      await option('City is empty')
      // is not, passed on the way, rewrote it as option chips do.
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not', values: ['Perth'] }
      ])
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not-set' }
      ])
      expect(chip('City is empty')).toHaveAttribute('data-selected')
    })

    it('ends editing a chip as focus leaves, so typing searches', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      await user.click(document.body)
      await waitFor(() =>
        expect(chip('City is Perth')).not.toHaveAttribute('data-selected')
      )
      await user.click(input())
      await user.keyboard('hob')
      expect(lastView().query.search).toBe('hob')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth'] }
      ])
    })

    it('keeps a value the chip holds on Enter after typing it, ending the edit', async () => {
      const { user, onViewChange } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      await user.keyboard('perth')
      await option('Perth')
      await user.keyboard('{Enter}')
      expect(onViewChange).not.toHaveBeenCalled()
      expect(chip('City is Perth')).not.toHaveAttribute('data-selected')
    })

    it('merges a chip rewritten to is into the field’s is chip, as is chips AND', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is-not', values: ['Perth'] },
              { field: 'city', operator: 'is', values: ['Sydney'] }
            ]
          }
        }
      })
      await selectChip(user, 'City is not Perth')
      await user.click(screen.getByRole('button', { name: 'is' }))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Sydney', 'Perth'] }
      ])
      expect(chip('City is Sydney or Perth')).toHaveAttribute('data-selected')
      await waitFor(() => expect(ticked()).toEqual(['Perth', 'Sydney']))
    })

    it('merges an Empty chip given a value into the field’s is chip', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'city', operator: 'is', values: ['Perth'] },
              { field: 'city', operator: 'is-not-set' }
            ]
          }
        }
      })
      await selectChip(user, 'City is empty')
      await user.click(screen.getByRole('button', { name: 'is' }))
      await user.click(await option('Sydney'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth', 'Sydney'] }
      ])
      await waitFor(() => expect(ticked()).toEqual(['Perth', 'Sydney']))
    })

    it('ticks a date chip’s preset, and taking another replaces it and ends the edit', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }
      })
      await selectChip(user, 'Starts is this weekend')
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(input()).toHaveValue('This weekend')
      await waitFor(() => expect(ticked()).toEqual(['This weekend']))
      // The chip's text is selected, so Backspace clears it to list the rest.
      await user.keyboard('{Backspace}')
      await user.click(await option(/^Tomorrow/))
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'within', value: 'tomorrow' }
      ])
      // A date chip holds one value, so taking it ends the edit.
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chip('Starts')).not.toHaveAttribute('data-selected')
    })

    it('ends a date chip’s edit on Enter, keeping its preset', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }
      })
      await selectChip(user, 'Starts is this weekend')
      await waitFor(() => expect(ticked()).toEqual(['This weekend']))
      await user.keyboard('{Enter}')
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chip('Starts')).not.toHaveAttribute('data-selected')
      expect(lastView()).toBeUndefined()
    })

    it('opens a before chip on is before, its day picked in the calendar', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'before', value: '2026-12-01' }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      expect(
        screen.getByRole('button', { name: 'is before', pressed: true })
      ).toBeInTheDocument()
      const calendar = await screen.findByRole('grid')
      expect(
        within(calendar).getByRole('gridcell', { selected: true })
      ).toHaveTextContent('1')
      expect(screen.queryByRole('dialog')).toBeNull()
      await user.click(
        calendar.querySelector<HTMLElement>(
          'button[data-date="2026-12-03"]:not([data-outside])'
        )!
      )
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'before', value: '2026-12-03' }
      ])
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chip('Starts')).not.toHaveAttribute('data-selected')
      expect(input()).toHaveFocus()
    })

    it('moves a date chip to another condition as its marked day is picked again', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'before', value: '2026-12-01' }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      await user.click(screen.getByRole('button', { name: 'is after' }))
      const calendar = await screen.findByRole('grid')
      await user.click(
        calendar.querySelector<HTMLElement>(
          'button[data-date="2026-12-01"]:not([data-outside])'
        )!
      )
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'after', value: '2026-12-01' }
      ])
    })

    it('marks the day a chip’s time falls on where the records are', async () => {
      const { user } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'on', value: '2026-11-30T14:00:00Z' }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      const calendar = await screen.findByRole('grid')
      expect(
        within(calendar).getByRole('gridcell', { selected: true })
      ).toHaveTextContent('1')
    })

    it('drops a between chip’s range from the calendar under is, and picks one day', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              {
                field: 'starts',
                operator: 'between',
                value: ['2026-12-01', '2026-12-04']
              }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      await screen.findByRole('grid')
      await user.click(screen.getByRole('button', { name: 'is' }))
      const calendar = screen.getByRole('grid')
      expect(
        within(calendar).queryAllByRole('gridcell', { selected: true })
      ).toEqual([])
      await user.click(
        calendar.querySelector<HTMLElement>(
          'button[data-date="2026-12-10"]:not([data-outside])'
        )!
      )
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'on', value: '2026-12-10' }
      ])
    })

    it('prefills a between chip’s days, and typing over them rewrites it', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              {
                field: 'starts',
                operator: 'between',
                value: ['2026-11-12', '2026-12-15']
              }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      expect(input()).toHaveValue('12 Nov to 15 Dec')
      expect(input()).toHaveAccessibleDescription('Starts is between')
      expect([input().selectionStart, input().selectionEnd]).toEqual([0, 16])
      // Its own days are ticked, so saying they're held would only be noise.
      expect(
        document.querySelector('[data-slot=query-field-hint]')?.textContent
      ).toBeFalsy()
      expect(
        screen.getByRole('button', { name: 'is between', pressed: true })
      ).toBeInTheDocument()
      await user.keyboard('1 dec to 5 dec')
      await option(/^1.+5 Dec/)
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        {
          field: 'starts',
          operator: 'between',
          value: ['2026-12-01', '2026-12-05']
        }
      ])
    })

    it('hides a chip’s days under is empty, and brings them back after', async () => {
      const { user } = setup({
        defaultView: {
          query: {
            filters: [
              {
                field: 'starts',
                operator: 'between',
                value: ['2026-11-12', '2026-12-15']
              }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      expect(input()).toHaveValue('12 Nov to 15 Dec')
      await user.click(screen.getByRole('button', { name: 'is empty' }))
      expect(input()).toHaveValue('')
      await user.click(screen.getByRole('button', { name: 'is between' }))
      expect(input()).toHaveValue('12 Nov to 15 Dec')
    })

    it('keeps a quick date chip on Enter with its text unchanged', async () => {
      const { user, onViewChange } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-week' }
            ]
          }
        }
      })
      const [label] = chipLabels()
      await selectChip(user, label!)
      expect(input()).toHaveValue('This week')
      // This weekend matches the text too, but Enter keeps the chip.
      await option(/^This weekend/)
      await user.keyboard('{Enter}')
      expect(onViewChange).not.toHaveBeenCalled()
      expect(chipLabels()).toEqual([label])
      expect(
        document.querySelector('[data-slot=query-field-pending-chip]')
      ).toBeNull()
    })

    it('opens an option chip with an empty field, its values ticked', async () => {
      const { user } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
          }
        }
      })
      await selectChip(user, 'City is Perth')
      expect(
        document.querySelector('[data-slot=query-field-pending-chip]')
      ).toContainElement(input())
      expect(input()).toHaveValue('')
      await waitFor(() => expect(ticked()).toEqual(['Perth']))
    })

    it('selects the last chip on Backspace without editing it', async () => {
      const { user } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Perth'] }]
          }
        }
      })
      await user.click(input())
      await user.keyboard('{Escape}{Backspace}')
      expect(chip('City is Perth')).toHaveFocus()
      expect(
        document.querySelector('[data-slot=query-field-pending-chip]')
      ).toBeNull()
      // The list closes with Escape, after its exit animation.
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
    })

    it('opens a between chip on is between, its range marked', async () => {
      const { user } = setup({
        defaultView: {
          query: {
            filters: [
              {
                field: 'starts',
                operator: 'between',
                value: ['2026-12-01', '2026-12-04']
              }
            ]
          }
        }
      })
      await selectChip(user, chipLabels()[0]!)
      expect(
        screen.getByRole('button', { name: 'is between', pressed: true })
      ).toBeInTheDocument()
      const calendar = await screen.findByRole('grid')
      expect(
        within(calendar)
          .getAllByRole('gridcell', { selected: true })
          .map((cell) => cell.textContent)
      ).toEqual(['1', '2', '3', '4'])
    })

    it('ticks a boolean chip’s answer, and taking the other replaces it and ends the edit', async () => {
      type Featured = TestShow & { featured: boolean }
      const featuredField = recordFields<Featured>().boolean('featured', {
        label: 'Featured'
      })
      const onViewChange = vi.fn()
      function FeaturedShows() {
        const records = useRecords<Featured>({
          data: shows.map((show, index) => ({
            ...show,
            featured: index % 2 === 0
          })),
          fields: [featuredField],
          getRowId: (row) => row.id,
          defaultView: {
            query: { filters: [{ field: 'featured', operator: 'is-true' }] }
          },
          onViewChange
        })
        return (
          <Records.Root records={records} layouts={layouts}>
            <Records.Search />
          </Records.Root>
        )
      }
      const user = userEvent.setup()
      render(<FeaturedShows />)
      const label = chipLabels()[0]!
      await selectChip(user, label)
      expect(screen.queryByRole('dialog')).toBeNull()
      await waitFor(() => expect(ticked()).toEqual(['Yes']))
      expect(
        within(screen.getByRole('group', { name: 'Operator' }))
          .getAllByRole('button')
          .map((item) => item.textContent)
      ).toEqual(['is', 'is empty', 'is not empty'])
      await user.click(await option('No'))
      expect(onViewChange.mock.lastCall![0].query.filters).toEqual([
        { field: 'featured', operator: 'is-false' }
      ])
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chip('Featured')).not.toHaveAttribute('data-selected')
    })
  })
})
