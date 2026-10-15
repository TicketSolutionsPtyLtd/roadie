import { type ReactElement, useEffect, useState } from 'react'

import {
  CalendarBlankIcon,
  CircleHalfIcon,
  HashIcon,
  TextAaIcon
} from '@phosphor-icons/react/ssr'
import { act, render, screen, waitFor, within } from '@testing-library/react'
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
import { RecordsFilterEditorLazy } from './RecordsFilterEditorLazy'
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
      <Records.Toolbar />
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

const input = () => screen.getByRole('combobox', { name: 'Search and filter' })
const chipLabels = () =>
  [...document.querySelectorAll('[data-slot=combobox-chip]')].map(
    (chip) => chip.querySelector('[data-slot=combobox-chip-label]')?.textContent
  )
const chip = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot=combobox-chip]')].find(
    (element) => element.textContent?.includes(label)
  )!
const option = (name: string | RegExp) => screen.findByRole('option', { name })
const editor = () => screen.findByRole('dialog', { name: /./ })
const ticked = () =>
  screen
    .queryAllByRole('option', { selected: true })
    .map(
      (each) =>
        each.querySelector('[data-slot=query-field-option-label]')?.textContent
    )
const selectChip = (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(within(chip(label)).getByRole('button', { name: label }))
const customDates = async (
  user: ReturnType<typeof userEvent.setup>,
  label?: string
) => {
  if (label) await selectChip(user, label)
  await user.click(await option('Custom dates'))
  return editor()
}
const condition = async (
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  name: string
) => {
  await user.click(
    within(dialog).getByRole('combobox', { name: 'Starts condition' })
  )
  await user.click(await screen.findByRole('option', { name }))
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

// The page loads editors while idle; a test's first import takes longer.
beforeAll(() => RecordsFilterEditorLazy.preload(), 20_000)

describe('Records.Search', () => {
  it('searches as people type, and keeps the text on Enter', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('ocean{Enter}')
    expect(input()).toHaveValue('ocean')
    expect(lastView().query.search).toBe('ocean')
    expect(rows()).toHaveLength(5)
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
    expect(chipLabels()).toEqual(['Starts: This weekend'])
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

  it('returns focus to the chip when Custom dates closes', async () => {
    const { user } = setup({
      defaultView: { query: { filters: [AFTER_1_DEC] } }
    })
    await customDates(user, chipLabels()[0]!)
    await user.keyboard('{Escape}')
    await waitFor(() => expect(chip('Starts')).toHaveFocus())
  })

  it('opens Custom dates for a new date filter, adding it once it has a date', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.click(await option('Starts'))
    const dialog = await customDates(user)
    expect(chipLabels()).toEqual([])
    await condition(user, dialog, 'Is after')
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Starts date' })
    )
    await user.keyboard('1 dec{Enter}')
    expect(lastView().query.filters).toEqual([AFTER_1_DEC])
    expect(chipLabels()).toHaveLength(1)
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
          <Records.Toolbar searchShortcut={false} />
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
          <Records.Search shortcut={false} />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<NoShortcut />)
    await user.keyboard('/')
    expect(input()).not.toHaveFocus()
  })

  it('never suggests a filter already applied', async () => {
    const { user } = setup({
      defaultView: {
        query: {
          filters: [{ field: 'city', operator: 'is', values: ['Melbourne'] }]
        }
      }
    })
    await user.click(input())
    await user.keyboard('melb')
    await option(/Search for/)
    expect(
      screen.queryByRole('option', { name: /City is Melbourne/ })
    ).toBeNull()
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
    const dialog = await customDates(user, chipLabels()[0]!)
    const date = within(dialog).getByRole('combobox', { name: 'Starts date' })
    await user.clear(date)
    await user.type(date, '2 dec{Enter}')
    await user.clear(date)
    await user.type(date, '3 dec{Enter}')
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

  it('keeps a filter whose condition was only tried, once Custom dates closes', async () => {
    const { user, lastView } = setup({
      defaultView: { query: { filters: [AFTER_1_DEC] } }
    })
    const dialog = await customDates(user, chipLabels()[0]!)
    await condition(user, dialog, 'Is within')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(lastView()).toBeUndefined()
    expect(chipLabels()).toHaveLength(1)
  })

  it('closes an editor whose filter the view no longer holds', async () => {
    const onViewChange = vi.fn()
    const replacer: { current: (view: RecordView) => void } = {
      current: () => {}
    }
    function Replaced() {
      const [view, setView] = useState<RecordView>({
        query: {
          search: '',
          filters: [AFTER_1_DEC],
          sort: []
        },
        layout: { type: 'table' }
      })
      useEffect(() => {
        replacer.current = setView
      })
      const records = useRecords({ data: shows, fields, view, onViewChange })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<Replaced />)
    await customDates(user, chipLabels()[0]!)
    await act(() =>
      replacer.current({
        query: {
          search: '',
          filters: [{ field: 'city', operator: 'is', values: ['Perth'] }],
          sort: []
        },
        layout: { type: 'table' }
      })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onViewChange).not.toHaveBeenCalled()
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

  it('drops a new filter cleared before a late parent shows it', async () => {
    const writes = { sent: 0, shown: 0 }
    function Late() {
      const [view, setView] = useState<RecordView>({
        query: { search: '', filters: [], sort: [] },
        layout: { type: 'table' }
      })
      const records = useRecords({
        data: shows,
        fields,
        view,
        onViewChange: (next) => {
          writes.sent++
          setTimeout(() => {
            setView(next)
            writes.shown++
          }, 50)
        }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Search />
        </Records.Root>
      )
    }
    const user = userEvent.setup()
    render(<Late />)
    await user.click(input())
    await user.click(await option('Starts'))
    const dialog = await customDates(user)
    await condition(user, dialog, 'Is on')
    const date = within(dialog).getByRole('combobox', { name: 'Starts date' })
    await user.type(date, '1 dec{Enter}')
    await user.clear(date)
    await user.keyboard('{Enter}{Escape}')
    expect(writes.sent).toBeGreaterThan(0)
    await waitFor(() => expect(writes.shown).toBe(writes.sent))
    expect(chipLabels()).toEqual([])
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
      expect(operatorNames()).toEqual(['is', 'is not'])
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

    it('takes Empty with Enter on a date field, past Custom dates', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('Starts'))
      await user.keyboard('emp')
      await option('Empty')
      await user.keyboard('{Enter}')
      expect(chipLabels()).toEqual(['Starts is empty'])
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'is-not-set' }
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

    it('lists Empty and Not empty above the values, which add their own chips', async () => {
      const { user, lastView } = setup()
      await user.click(input())
      await user.click(await option('City'))
      await option('Sydney')
      const names = screen
        .getAllByRole('option')
        .map(
          (each) =>
            each.querySelector('[data-slot=query-field-option-label]')
              ?.textContent
        )
      expect(names.slice(0, 2)).toEqual(['Empty', 'Not empty'])
      expect(names).toContain('Sydney')
      expect(screen.getByRole('group', { name: 'Empty' })).toBeInTheDocument()
      await user.click(await option('Empty'))
      await user.click(input())
      await user.click(await option('Starts'))
      await user.click(await option('Not empty'))
      expect(chipLabels()).toEqual(['City is empty', 'Starts is not empty'])
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is-not-set' },
        { field: 'starts', operator: 'is-set' }
      ])
    })

    it('offers has all only for a field holding several values, and none for a date', async () => {
      const several = fields.map((each) =>
        each.key === 'city' ? { ...each, multiple: true } : each
      )
      const { user } = setup({ fields: several })
      await user.click(input())
      await user.click(await option('City'))
      expect(operatorNames()).toEqual(['is', 'is not', 'has all of'])
      await user.keyboard('{Escape}')
      await user.click(input())
      await user.click(await option('Starts'))
      await option(/This weekend/)
      expect(screen.queryByRole('group', { name: 'Operator' })).toBeNull()
    })
  })

  describe('text and number steps', () => {
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
        ['is not', null]
      ])
      await waitFor(() =>
        expect(optionLabels()).toEqual(['Empty', 'Not empty'])
      )
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
        ['between', 'is between']
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

    it('prefills a text chip’s value and condition, and Enter updates it', async () => {
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
      // Taking what the chip already holds writes nothing.
      await user.keyboard('{Enter}')
      // The condition changes the row, not the chip, until it is taken.
      await user.click(screen.getByRole('button', { name: 'contains' }))
      expect(lastView()).toBeUndefined()
      await user.clear(input())
      await user.keyboard('alley{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'contains', value: 'alley' }
      ])
      expect(chip('Show contains “alley”')).toHaveAttribute('data-selected')
      expect(input()).toHaveValue('alley')
      await waitFor(() => expect(ticked()).toEqual(['Show contains “alley”']))
      await user.keyboard('{Escape}')
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
      await user.click(screen.getByRole('button', { name: 'is not' }))
      expect(lastView().query.filters).toEqual(replaced)
      await user.keyboard('{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'show', operator: 'is-not', values: ['Ocean Alley 2'] }
      ])
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
      expect(input()).toHaveValue('20-50')
      expect(
        screen.getByRole('button', { name: 'is between', pressed: true })
      ).toBeInTheDocument()
      await user.clear(input())
      await user.keyboard('20..600{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth'] },
        { field: 'sold', operator: 'between', value: [20, 600] }
      ])
      await user.click(screen.getByRole('button', { name: 'is more than' }))
      await user.clear(input())
      await user.keyboard('100{Enter}')
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth'] },
        { field: 'sold', operator: 'gt', value: 100 }
      ])
      expect(chipLabels()).toEqual(['City is Perth', 'Sold is more than 100'])
    })

    it('keeps an unchanged text chip on Enter, though its text starts Not empty', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [{ field: 'show', operator: 'contains', value: 'no' }]
          }
        }
      })
      await selectChip(user, 'Show contains “no”')
      await waitFor(() => expect(ticked()).toEqual(['Show contains “no”']))
      await user.keyboard('{Enter}')
      expect(lastView()).toBeUndefined()
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
    it('ticks Empty for an empty chip, and taking a value replaces it', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: { filters: [{ field: 'city', operator: 'is-not-set' }] }
        }
      })
      await selectChip(user, 'City is empty')
      await waitFor(() => expect(ticked()).toEqual(['Empty']))
      await user.click(await option('Sydney'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Sydney'] }
      ])
      await waitFor(() => expect(ticked()).toEqual(['Sydney']))
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

    it('keeps a value the chip holds on Enter after typing it', async () => {
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
      expect(chip('City is Perth')).toHaveAttribute('data-selected')
    })

    it('keeps a held value on Enter after typing it, though Empty matches too', async () => {
      const { user, onViewChange } = setup({
        data: shows.map((show, index) =>
          index === 0 ? { ...show, city: 'Emerald' } : show
        ),
        defaultView: {
          query: {
            filters: [{ field: 'city', operator: 'is', values: ['Emerald'] }]
          }
        }
      })
      await selectChip(user, 'City is Emerald')
      await user.keyboard('em')
      await option('Emerald')
      await option('Empty')
      await user.keyboard('{Enter}')
      expect(onViewChange).not.toHaveBeenCalled()
      expect(chip('City is Emerald')).toHaveAttribute('data-selected')
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
      await user.click(await option('Sydney'))
      expect(lastView().query.filters).toEqual([
        { field: 'city', operator: 'is', values: ['Perth', 'Sydney'] }
      ])
      await waitFor(() => expect(ticked()).toEqual(['Perth', 'Sydney']))
    })

    it('ticks a date chip’s preset, and taking another replaces it', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }
      })
      await selectChip(user, 'Starts: This weekend')
      expect(screen.queryByRole('dialog')).toBeNull()
      await waitFor(() => expect(ticked()).toEqual(['This weekend']))
      await user.click(await option(/^Tomorrow/))
      expect(lastView().query.filters).toEqual([
        { field: 'starts', operator: 'within', value: 'tomorrow' }
      ])
      await waitFor(() => expect(ticked()).toEqual(['Tomorrow']))
    })

    it('opens the date editor for the chip from Custom dates', async () => {
      const { user, lastView } = setup({
        defaultView: {
          query: {
            filters: [
              { field: 'starts', operator: 'within', value: 'this-weekend' }
            ]
          }
        }
      })
      await selectChip(user, 'Starts: This weekend')
      await user.click(await option('Custom dates'))
      const dialog = await editor()
      expect(dialog).toHaveAccessibleName('Starts')
      await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
      expect(chip('Starts')).not.toHaveAttribute('data-selected')
      await user.click(
        within(dialog).getByRole('button', { name: 'Remove filter' })
      )
      await waitFor(() => expect(chipLabels()).toEqual([]))
      expect(lastView().query.filters).toEqual([])
      await waitFor(() => expect(input()).toHaveFocus())
    })

    it('ticks a boolean chip’s answer, and taking the other replaces it', async () => {
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
      await user.click(await option('No'))
      expect(onViewChange.mock.lastCall![0].query.filters).toEqual([
        { field: 'featured', operator: 'is-false' }
      ])
      await waitFor(() => expect(ticked()).toEqual(['No']))
    })
  })
})
