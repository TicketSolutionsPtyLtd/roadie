import { useEffect, useState } from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// jsdom never upgrades NumberField's animated number, so its hooks don't exist.
vi.mock('@number-flow/react', async () => {
  const { createElement } = await import('react')
  return {
    default: ({ value }: { value: unknown }) =>
      createElement('number-flow-react', null, String(value))
  }
})

const field = recordFields<TestShow>()
const fields = [
  field.text('show', { label: 'Show' }),
  field.option('city', { label: 'City' }),
  field.number('sold', { label: 'Sold' }),
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

  it('edits a chip’s values and condition, as they change', async () => {
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
    const dialog = await editor()
    expect(dialog).toHaveAccessibleName('City')
    await waitFor(() => expect(dialog).toHaveFocus())
    await user.click(within(dialog).getByRole('checkbox', { name: 'Hobart' }))
    expect(chipLabels()).toEqual(['City is Perth or Hobart'])
    await user.click(
      within(dialog).getByRole('combobox', { name: 'City condition' })
    )
    await user.click(await screen.findByRole('option', { name: 'Is not' }))
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is-not', values: ['Perth', 'Hobart'] }
    ])
    expect(rows()).toHaveLength(18)
  })

  it('removes a filter from its editor, returning focus to the field', async () => {
    const { user } = setup({
      defaultView: {
        query: { filters: [{ field: 'sold', operator: 'gt', value: 100 }] }
      }
    })
    chip('Sold').focus()
    await user.keyboard('{Enter}')
    const dialog = await editor()
    await user.click(
      within(dialog).getByRole('button', { name: 'Remove filter' })
    )
    await waitFor(() => expect(chipLabels()).toEqual([]))
    await waitFor(() => expect(input()).toHaveFocus())
  })

  it('returns focus to the chip when its editor closes', async () => {
    const { user } = setup({
      defaultView: {
        query: { filters: [{ field: 'sold', operator: 'gt', value: 100 }] }
      }
    })
    chip('Sold').focus()
    await user.keyboard('{Enter}')
    await editor()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(chip('Sold')).toHaveFocus())
  })

  it('opens an editor for a number field, adding the filter once it has a value', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.click(await option('Sold'))
    const dialog = await editor()
    expect(chipLabels()).toEqual([])
    const value = within(dialog).getByRole('textbox', { name: 'Sold value' })
    await waitFor(() => expect(value).toHaveFocus())
    await user.keyboard('1500')
    expect(chipLabels()).toEqual(['Sold is 1,500'])
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Sold condition' })
    )
    await user.click(
      await screen.findByRole('option', { name: 'Is more than' })
    )
    expect(chipLabels()).toEqual(['Sold is more than 1,500'])
    expect(lastView().query.filters).toEqual([
      { field: 'sold', operator: 'gt', value: 1500 }
    ])
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

  it('removes a filter its editor emptied, once it closes', async () => {
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
    const dialog = await editor()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Perth' }))
    expect(chipLabels()).toEqual(['City is Perth'])
    await user.keyboard('{Escape}')
    await waitFor(() => expect(chipLabels()).toEqual([]))
    expect(lastView().query.filters).toEqual([])
    await waitFor(() => expect(input()).toHaveFocus())
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
    const dialog = await editor()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Darwin' }))
    expect(lastView().query.filters).toEqual([
      { field: 'city', operator: 'is', values: ['Perth'] }
    ])
  })

  it('edits the same filter after a parent reorders them', async () => {
    const onViewChange = vi.fn()
    function Sorted() {
      const [view, setView] = useState<RecordView>({
        query: {
          search: '',
          filters: [
            { field: 'sold', operator: 'gt', value: 100 },
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
    await user.click(
      within(chip('Sold')).getByRole('button', { name: /^Sold/ })
    )
    const dialog = await editor()
    const value = within(dialog).getByRole('textbox', { name: 'Sold value' })
    await user.clear(value)
    await user.type(value, '250')
    const filters = onViewChange.mock.lastCall![0].query.filters
    expect(filters).toContainEqual({
      field: 'city',
      operator: 'is',
      values: ['Perth']
    })
    expect(filters).toContainEqual({
      field: 'sold',
      operator: 'gt',
      value: 250
    })
    expect(filters).toHaveLength(2)
  })

  it('keeps searching the words a picked field didn’t read', async () => {
    const { user, lastView } = setup()
    await user.click(input())
    await user.keyboard('ocean cit')
    await user.click(await option('City'))
    expect(lastView().query.search).toBe('ocean')
  })

  it('keeps a filter whose condition was only tried, once its editor closes', async () => {
    const { user } = setup({
      defaultView: {
        query: { filters: [{ field: 'sold', operator: 'gt', value: 100 }] }
      }
    })
    chip('Sold').focus()
    await user.keyboard('{Enter}')
    const dialog = await editor()
    await user.click(
      within(dialog).getByRole('combobox', { name: 'Sold condition' })
    )
    await user.click(await screen.findByRole('option', { name: 'Is between' }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(chipLabels()).toEqual(['Sold is more than 100'])
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
          filters: [{ field: 'sold', operator: 'gt', value: 100 }],
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
    chip('Sold').focus()
    await user.keyboard('{Enter}')
    await editor()
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

  it('keeps its editor open and every edit when the parent commits late', async () => {
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
    const dialog = await editor()
    await user.click(within(dialog).getByRole('checkbox', { name: 'Hobart' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sydney' }))
    await waitFor(() =>
      expect(chipLabels()).toEqual(['City is Perth, Hobart or 1 more'])
    )
    expect(screen.getByRole('dialog')).toBe(dialog)
  })

  it('drops a new filter cleared before a late parent shows it', async () => {
    function Late() {
      const [view, setView] = useState<RecordView>({
        query: { search: '', filters: [], sort: [] },
        layout: { type: 'table' }
      })
      const records = useRecords({
        data: shows,
        fields,
        view,
        onViewChange: (next) => setTimeout(() => setView(next), 50)
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
    await user.click(await option('Sold'))
    const dialog = await editor()
    const value = within(dialog).getByRole('textbox', { name: 'Sold value' })
    await waitFor(() => expect(value).toHaveFocus())
    await user.keyboard('5')
    await user.clear(value)
    await user.keyboard('{Escape}')
    await new Promise((resolve) => setTimeout(resolve, 150))
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
    const dialog = await editor()
    const value = within(dialog).getByRole('textbox', { name: 'Sold value' })
    await waitFor(() => expect(value).toHaveFocus())
    await user.keyboard('100')
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
})
