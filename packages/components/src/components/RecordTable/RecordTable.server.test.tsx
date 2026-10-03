import * as React from 'react'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  RecordFilter,
  RecordPosition,
  RecordSelection,
  RecordView
} from '@oztix/roadie-core/records'

import { tableLayout } from '.'
import { Records, type RecordsBulkAction, useRecords } from '../Records'
import { useRecordsContext } from '../Records/context'
import { showFields, testShows } from '../Records/testUtils'
import { RecordTable } from './RecordTablePreset'
import {
  bulkBar,
  countMenuItems,
  pickFromCount,
  showColumns
} from './testUtils'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const SHOWS = testShows(120)
const layouts = [tableLayout(showColumns)]
const EMPTY_VIEW: RecordView = {
  query: { search: '', filters: [], sort: [] },
  layout: { type: 'table' }
}

function Server({
  onViewChange = () => {},
  onPositionChange = () => {},
  actions = []
}: {
  onViewChange?: (view: RecordView) => void
  onPositionChange?: (position: Required<RecordPosition>) => void
  actions?: RecordsBulkAction[]
}) {
  const [view, setView] = React.useState(EMPTY_VIEW)
  const [position, setPosition] = React.useState<RecordPosition>({
    pageSize: 10
  })
  const page = position.page ?? 0
  const records = useRecords({
    data: SHOWS.slice(page * 10, (page + 1) * 10),
    fields: showFields,
    getRowId: (row) => row.id,
    rowCount: 120,
    selectable: true,
    view,
    onViewChange: (next) => {
      onViewChange(next)
      setView(next)
    },
    position,
    onPositionChange: (next) => {
      onPositionChange(next)
      setPosition(next)
    }
  })
  return (
    <Records.Root records={records} layouts={layouts} caption='Shows'>
      <Records.Search />
      <Records.Content />
      <Records.Pagination />
      <Records.BulkActions actions={actions} />
      <Records.Status />
    </Records.Root>
  )
}

const bodyRows = () => screen.getAllByRole('row').slice(1)
const firstTitle = () =>
  within(bodyRows()[0]!).getAllByRole('cell')[1]!.textContent
const bar = bulkBar
const fakeTimers = () => {
  // React's scheduler runs on setImmediate, so only the debounce's timers fake.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  // Testing Library drains with a setTimeout it only advances under a `jest` global.
  vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

describe('RecordTable server mode', () => {
  it('renders the given page and pages through the server', async () => {
    const user = userEvent.setup()
    const onPositionChange = vi.fn()
    render(<Server onPositionChange={onPositionChange} />)
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText('1–10 of 120')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPositionChange).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      row: 0
    })
    expect(screen.getByText('11–20 of 120')).toBeInTheDocument()
    expect(firstTitle()).toBe('Alex Lahey 2')
    expect(bodyRows()).toHaveLength(10)
  })

  it('asks the server to sort without reordering the given rows', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    render(<Server onViewChange={onViewChange} />)
    await user.click(screen.getByRole('button', { name: 'Sold' }))
    expect(onViewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          sort: [{ field: 'sold', direction: 'descending' }]
        })
      })
    )
    expect(firstTitle()).toBe('Ocean Alley 1')
  })

  it('commits a search once typing pauses', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Server onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Perth{Escape}')
    expect(field).toHaveValue('Perth')
    expect(onViewChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenCalledTimes(1)
    expect(onViewChange).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: 'Perth' })
      })
    )
    expect(bodyRows()).toHaveLength(10)
  })

  it('clears the search at once', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Server onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Perth{Escape}')
    act(() => vi.advanceTimersByTime(250))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(field).toHaveValue('')
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: '' })
      })
    )
    await user.type(field, 'Hob')
    await user.keyboard('{Escape}{Escape}')
    expect(field).toHaveValue('')
    act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenCalledTimes(2)
  })

  it('clears the selection once a search commits', async () => {
    const user = fakeTimers()
    render(<Server actions={[{ label: 'Export', onAction: vi.fn() }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    expect(bar()).toHaveTextContent('1 selected')
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth{Escape}'
    )
    expect(bar()).toHaveTextContent('1 selected')
    act(() => vi.advanceTimersByTime(250))
    expect(bar()).toBeNull()
  })

  it('keeps ids picked on other pages and counts them', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Server actions={[{ label: 'Export', onAction }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Alex Lahey 2' })
    )
    expect(bar()).toHaveTextContent('2 selected')
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0', 'show-10'] },
      EMPTY_VIEW.query
    )
    await waitFor(() => expect(bar()).toBeNull())
  })

  it('selects every matching record and hands the selection to the action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<Server actions={[{ label: 'Export', onAction }]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 records')
    expect(bar()).toHaveTextContent('120 selected')
    expect(screen.getByRole('status')).toHaveTextContent('120 selected')
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    expect(bar()).toHaveTextContent('119 selected')
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { allMatching: true, except: ['show-0'] },
      EMPTY_VIEW.query
    )
    await waitFor(() => expect(bar()).toBeNull())
  })

  it('acts with the committed query, not a search still being typed', async () => {
    const user = fakeTimers()
    const onAction = vi.fn()
    render(<Server actions={[{ label: 'Export', onAction }]} />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Per{Escape}'
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(onAction).toHaveBeenCalledWith(
      { ids: ['show-0'] },
      expect.objectContaining({ search: '' })
    )
  })

  it('names records from the hook', async () => {
    const user = userEvent.setup()
    render(
      <RecordTable
        data={SHOWS.slice(0, 10)}
        fields={showFields}
        columns={showColumns}
        getRowId={(row) => row.id}
        rowCount={120}
        defaultPosition={{ pageSize: 10 }}
        recordName={{ one: 'show', other: 'shows' }}
        bulkActions={[{ label: 'Export', onAction: vi.fn() }]}
      />
    )
    expect(screen.getByText('1–10 of 120')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    expect(await countMenuItems(user)).toContain('Select all 120 shows')
  })
})

describe('Records server search in a custom field', () => {
  it('debounces a field driven by searchText and setSearch', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    function Custom() {
      const { records } = useRecordsContext()
      return (
        <input
          aria-label='Find'
          value={records.searchText}
          onChange={(event) => records.setSearch(event.target.value)}
        />
      )
    }
    function Table() {
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        rowCount: 120,
        onViewChange
      })
      return (
        <Records.Provider records={records} layouts={layouts}>
          <Custom />
        </Records.Provider>
      )
    }
    render(<Table />)
    const field = screen.getByRole('textbox', { name: 'Find' })
    await user.type(field, 'Perth{Escape}')
    expect(field).toHaveValue('Perth')
    expect(onViewChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenCalledTimes(1)
  })
})

function Outside({
  onViewChange = () => {},
  onSelectionChange,
  echo = 0
}: {
  onViewChange?: (view: RecordView) => void
  onSelectionChange?: () => void
  /** Milliseconds before the parent's own state takes a change, like an async router. */
  echo?: number
}) {
  const [view, setView] = React.useState(EMPTY_VIEW)
  const records = useRecords({
    data: SHOWS.slice(0, 10),
    fields: showFields,
    defaultPosition: { pageSize: 10 },
    getRowId: (row) => row.id,
    rowCount: 120,
    selectable: true,
    view,
    onViewChange: (next) => {
      onViewChange(next)
      if (echo) setTimeout(() => setView(next), echo)
      else setView(next)
    },
    onSelectionChange
  })
  return (
    <Records.Root records={records} layouts={layouts}>
      {['', 'Perth', 'Hobart'].map((search) => (
        <button
          key={search}
          type='button'
          onClick={() => setView({ ...view, query: { ...view.query, search } })}
        >
          {`Set "${search}"`}
        </button>
      ))}
      <Records.Search />
      <Records.Content />
    </Records.Root>
  )
}

describe('Records server search set from outside', () => {
  it('shows each search the URL sets, including one it sent before', async () => {
    const user = fakeTimers()
    render(<Outside />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Perth{Escape}')
    act(() => vi.advanceTimersByTime(250))
    await user.click(screen.getByRole('button', { name: 'Set ""' }))
    expect(field).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Set "Perth"' }))
    expect(field).toHaveValue('Perth')
  })

  it('drops a pending draft once a search arrives from outside', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Outside onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Per{Escape}')
    await user.click(screen.getByRole('button', { name: 'Set "Hobart"' }))
    act(() => vi.advanceTimersByTime(250))
    expect(field).toHaveValue('Hobart')
    expect(onViewChange).not.toHaveBeenCalled()
  })

  it('reports no selection change when a search commits with nothing selected', async () => {
    const user = fakeTimers()
    const onSelectionChange = vi.fn()
    render(<Outside onSelectionChange={onSelectionChange} />)
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth{Escape}'
    )
    act(() => vi.advanceTimersByTime(250))
    expect(onSelectionChange).not.toHaveBeenCalled()
  })
})

describe('Records server search with an async router', () => {
  it('keeps typing that lands before its own search echoes back', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Outside echo={150} onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Perth{Escape}')
    act(() => vi.advanceTimersByTime(250))
    act(() => vi.advanceTimersByTime(100))
    await user.type(field, ' W{Escape}')
    // Separate acts, so the echo renders before the debounce fires.
    act(() => vi.advanceTimersByTime(100))
    act(() => vi.advanceTimersByTime(1000))
    expect(field).toHaveValue('Perth W')
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: 'Perth W' })
      })
    )
  })

  it('drops a draft when an outside search changes and changes back', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Outside echo={150} onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Per{Escape}')
    await user.click(screen.getByRole('button', { name: 'Set "Hobart"' }))
    await user.click(screen.getByRole('button', { name: 'Set ""' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(field).toHaveValue('')
    expect(onViewChange).not.toHaveBeenCalled()
  })
})

describe('Records server selection taken against a query', () => {
  const STATUS = {
    field: 'status',
    operator: 'is',
    values: ['on_sale', 'sold_out']
  } satisfies RecordFilter
  const CITY: RecordFilter = {
    field: 'city',
    operator: 'is-not',
    values: ['Perth']
  }
  function Parent({ server }: { server: boolean }) {
    const [view, setView] = React.useState<RecordView>({
      ...EMPTY_VIEW,
      query: { ...EMPTY_VIEW.query, filters: [STATUS, CITY] }
    })
    const records = useRecords({
      data: server ? SHOWS.slice(0, 10) : SHOWS,
      fields: showFields,
      defaultPosition: { pageSize: 10 },
      getRowId: (row) => row.id,
      rowCount: server ? 64 : undefined,
      selectable: true,
      view,
      onViewChange: setView
    })
    const setQuery = (query: Partial<RecordView['query']>) =>
      setView({ ...view, query: { ...view.query, ...query } })
    return (
      <Records.Root records={records} layouts={layouts}>
        <button type='button' onClick={() => setQuery({ search: 'Hobart' })}>
          Hobart only
        </button>
        <button
          type='button'
          onClick={() =>
            setQuery({
              filters: [
                CITY,
                { ...STATUS, values: [...STATUS.values].reverse() }
              ]
            })
          }
        >
          Reorder filters
        </button>
        <Records.Content />
        <Records.BulkActions
          actions={[{ label: 'Export', onAction: vi.fn() }]}
        />
      </Records.Root>
    )
  }

  it.each([
    ['server', true],
    ['browser', false]
  ])(
    'keeps select-all-matching through reordered filters, and clears it on a new search (%s)',
    async (_, server) => {
      const user = userEvent.setup()
      render(<Parent server={server} />)
      await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
      await pickFromCount(user, 'Select all 64 records')
      expect(bar()).toHaveTextContent('64 selected')
      await user.click(screen.getByRole('button', { name: 'Reorder filters' }))
      expect(bar()).toHaveTextContent('64 selected')
      await user.click(screen.getByRole('button', { name: 'Hobart only' }))
      await waitFor(() => expect(bar()).toBeNull())
    }
  )
})

describe('Records server selection in the render a query applies', () => {
  type Seen = { search: string; selected: number }
  function Spy({ seen }: { seen: Seen[] }) {
    const { records } = useRecordsContext()
    seen.push({
      search: records.appliedView.query.search,
      selected: records.selectedCount
    })
    return null
  }
  function Committed({
    seen,
    onSelectionChange
  }: {
    seen: Seen[]
    onSelectionChange: (selection: RecordSelection) => void
  }) {
    const [view, setView] = React.useState(EMPTY_VIEW)
    const [selection, setSelection] = React.useState<RecordSelection>({
      ids: []
    })
    const records = useRecords({
      data: SHOWS.slice(0, 10),
      fields: showFields,
      defaultPosition: { pageSize: 10 },
      getRowId: (row) => row.id,
      rowCount: 120,
      selectable: true,
      view,
      onViewChange: setView,
      selection,
      onSelectionChange: (next) => {
        onSelectionChange(next)
        setSelection(next)
      }
    })
    return (
      <Records.Root records={records} layouts={layouts}>
        <button
          type='button'
          onClick={() => {
            setView({ ...view, query: { ...view.query, search: 'Hobart' } })
            setSelection({ allMatching: true, except: [] })
          }}
        >
          Restore Hobart
        </button>
        <Records.Search />
        <Records.Content />
        <Records.BulkActions actions={[]} />
        <Spy seen={seen} />
      </Records.Root>
    )
  }

  it('never shows the old selection against a search the debounce commits', async () => {
    const user = fakeTimers()
    const seen: Seen[] = []
    const onSelectionChange = vi.fn()
    render(<Committed seen={seen} onSelectionChange={onSelectionChange} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 records')
    expect(bar()).toHaveTextContent('120 selected')
    onSelectionChange.mockClear()
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth{Escape}'
    )
    act(() => vi.advanceTimersByTime(250))
    expect(
      seen.filter(({ search, selected }) => search === 'Perth' && selected)
    ).toEqual([])
    expect(bar()).toBeNull()
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith({ ids: [] })
  })

  it('clears again on a second query change', async () => {
    const user = fakeTimers()
    const onSelectionChange = vi.fn()
    render(<Committed seen={[]} onSelectionChange={onSelectionChange} />)
    const selectAll = async () => {
      await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
      await pickFromCount(user, 'Select all 120 records')
      expect(bar()).toHaveTextContent('120 selected')
    }
    await selectAll()
    await user.type(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      'Perth{Escape}'
    )
    act(() => vi.advanceTimersByTime(250))
    expect(bar()).toBeNull()
    await selectAll()
    await user.clear(
      screen.getByRole('combobox', { name: 'Search and filter' })
    )
    expect(bar()).toBeNull()
    expect(onSelectionChange).toHaveBeenLastCalledWith({ ids: [] })
  })

  it('clears a selection the parent passes as a new object each render', async () => {
    const user = userEvent.setup()
    function Fresh() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const [ids, setIds] = React.useState<readonly string[]>([])
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        getRowId: (row) => row.id,
        rowCount: 120,
        selectable: true,
        view,
        onViewChange: setView,
        selection: { ids },
        onSelectionChange: (next) => setIds('ids' in next ? next.ids : [])
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            onClick={() =>
              setView({ ...view, query: { ...view.query, search: 'Perth' } })
            }
          >
            Perth only
          </button>
          <Records.Content />
          <Records.BulkActions actions={[]} />
        </Records.Root>
      )
    }
    render(<Fresh />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    expect(bar()).toHaveTextContent('1 selected')
    await user.click(screen.getByRole('button', { name: 'Perth only' }))
    expect(bar()).toBeNull()
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).not.toBeChecked()
  })

  it('keeps a selection the parent restores with its query', async () => {
    const user = userEvent.setup()
    render(<Committed seen={[]} onSelectionChange={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Restore Hobart' }))
    expect(bar()).toHaveTextContent('120 selected')
  })
})

describe('Records server search with a slow router', () => {
  it('keeps typing while two of its own searches are still to echo', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    render(<Outside echo={400} onViewChange={onViewChange} />)
    const field = screen.getByRole('combobox', { name: 'Search and filter' })
    await user.type(field, 'Pe{Escape}')
    act(() => vi.advanceTimersByTime(250))
    await user.type(field, 'rth{Escape}')
    act(() => vi.advanceTimersByTime(250))
    act(() => vi.advanceTimersByTime(100))
    await user.type(field, ' W{Escape}')
    act(() => vi.advanceTimersByTime(50))
    expect(field).toHaveValue('Perth W')
    act(() => vi.advanceTimersByTime(2000))
    expect(field).toHaveValue('Perth W')
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: 'Perth W' })
      })
    )
  })

  it('debounces through a setSearch kept from an older render', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    let kept: ((search: string) => void) | undefined
    function Kept() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        rowCount: 120,
        view,
        onViewChange: (next) => {
          onViewChange(next)
          setView(next)
        }
      })
      kept ??= records.setSearch
      return (
        <button
          type='button'
          onClick={() =>
            setView({ ...view, query: { ...view.query, search: 'Hobart' } })
          }
        >
          Set Hobart
        </button>
      )
    }
    render(<Kept />)
    await user.click(screen.getByRole('button', { name: 'Set Hobart' }))
    act(() => kept!('Perth'))
    act(() => vi.advanceTimersByTime(250))
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: 'Perth' })
      })
    )
  })

  it('clears through a setSearch kept from an older render', async () => {
    const user = fakeTimers()
    const onViewChange = vi.fn()
    let kept: ((search: string) => void) | undefined
    function Kept() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        rowCount: 120,
        view,
        onViewChange: (next) => {
          onViewChange(next)
          setView(next)
        }
      })
      kept ??= records.setSearch
      return (
        <button
          type='button'
          onClick={() =>
            setView({ ...view, query: { ...view.query, search: 'Hobart' } })
          }
        >
          Set Hobart
        </button>
      )
    }
    render(<Kept />)
    await user.click(screen.getByRole('button', { name: 'Set Hobart' }))
    act(() => kept!(''))
    expect(onViewChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({ search: '' })
      })
    )
  })
})

describe('Records server mode while a page loads without a count', () => {
  it('stays in server mode on the last count and keeps the selection', async () => {
    const user = userEvent.setup()
    function Paging() {
      const [position, setPosition] = React.useState<RecordPosition>({
        pageSize: 10
      })
      const [loaded, setLoaded] = React.useState(true)
      const page = position.page ?? 0
      const records = useRecords({
        data: loaded ? SHOWS.slice(page * 10, page * 10 + 10) : [],
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: loaded ? 120 : undefined,
        loading: !loaded,
        selectable: true,
        position,
        onPositionChange: (next) => {
          setPosition(next)
          setLoaded(false)
        }
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
          <Records.Pagination />
          <Records.BulkActions actions={[]} />
          <output data-testid='state'>{`${records.mode} ${records.selectedCount}`}</output>
        </Records.Root>
      )
    }
    render(<Paging />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByTestId('state')).toHaveTextContent('server 1')
    expect(screen.getByText('0 results')).toBeInTheDocument()
  })
})

describe('Records server bulk actions that settle after a query change', () => {
  it('leaves a selection taken against the new query as it is', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    function Slow() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        getRowId: (row) => row.id,
        rowCount: view.query.search ? 80 : 120,
        selectable: true,
        view,
        onViewChange: setView
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            onClick={() =>
              setView({ ...view, query: { ...view.query, search: 'Perth' } })
            }
          >
            Perth only
          </button>
          <Records.Content />
          <Records.BulkActions actions={[{ label: 'Tag', onAction }]} />
          <output data-testid='count'>{records.selectedCount}</output>
        </Records.Root>
      )
    }
    render(<Slow />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 2' })
    )
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: 'Perth only' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 80 records')
    await act(async () => finish())
    expect(screen.getByTestId('count')).toHaveTextContent('80')
  })

  it('keeps an exception picked again while an action on every match runs', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    function Except() {
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        getRowId: (row) => row.id,
        rowCount: 120,
        selectable: true
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <Records.Content />
          <Records.BulkActions actions={[{ label: 'Tag', onAction }]} />
          <output data-testid='count'>{records.selectedCount}</output>
        </Records.Root>
      )
    }
    render(<Except />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 records')
    const ocean = () =>
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    await user.click(ocean())
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    expect(onAction).toHaveBeenCalledWith(
      { allMatching: true, except: ['show-0'] },
      EMPTY_VIEW.query
    )
    await user.click(ocean())
    await act(async () => finish())
    expect(screen.getByTestId('count')).toHaveTextContent('1')
    expect(ocean()).toBeChecked()
  })

  it('leaves a new selection alone after the query changes and changes back', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    function Return() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 120,
        selectable: true,
        view,
        onViewChange: setView,
        defaultPosition: { pageSize: 10 }
      })
      const search = (text: string) =>
        setView({ ...view, query: { ...view.query, search: text } })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button type='button' onClick={() => search('Perth')}>
            Perth only
          </button>
          <button type='button' onClick={() => search('')}>
            Everything
          </button>
          <Records.Content />
          <Records.BulkActions actions={[{ label: 'Tag', onAction }]} />
          <output data-testid='count'>{records.selectedCount}</output>
        </Records.Root>
      )
    }
    render(<Return />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: 'Perth only' }))
    await user.click(screen.getByRole('button', { name: 'Everything' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await act(async () => finish())
    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('clears every pick once an action on all matches settles', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    function Swap() {
      const [position, setPosition] = React.useState<RecordPosition>({
        pageSize: 10
      })
      const page = position.page ?? 0
      const records = useRecords({
        data: SHOWS.slice(page * 10, page * 10 + 10),
        fields: showFields,
        getRowId: (row) => row.id,
        rowCount: 120,
        selectable: true,
        position,
        onPositionChange: setPosition
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            onClick={() => records.setSelection({ ids: ['show-1', 'show-99'] })}
          >
            Pick two
          </button>
          <Records.Content />
          <Records.Pagination />
          <Records.BulkActions actions={[{ label: 'Tag', onAction }]} />
        </Records.Root>
      )
    }
    render(<Swap />)
    await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
    await pickFromCount(user, 'Select all 120 records')
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    await user.click(screen.getByRole('button', { name: 'Pick two' }))
    await act(async () => finish())
    await waitFor(() => expect(bar()).toBeNull())
  })
})

describe('Records bulk actions: hidden ids after an action', () => {
  it('clears and keeps focus when only hidden ids remain', async () => {
    const user = userEvent.setup()
    function Controlled() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 12),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        getRowId: (row) => row.id,
        selectable: true,
        view,
        onViewChange: setView
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            onClick={() =>
              setView({ ...view, query: { ...view.query, search: 'Perth' } })
            }
          >
            Perth only
          </button>
          <Records.Content />
          <Records.BulkActions
            actions={[{ label: 'Export', onAction: vi.fn() }]}
          />
        </Records.Root>
      )
    }
    render(<Controlled />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Perth only' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Select angie McMahon 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Export' }))
    await waitFor(() => expect(bar()).toBeNull())
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
  })
})

describe('Records selection and filters the fields cannot apply', () => {
  it.each([
    ['server', true],
    ['browser', false]
  ])(
    'keeps select-all-matching when a skipped filter is added (%s)',
    async (_, server) => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const user = userEvent.setup()
      function Stray() {
        const records = useRecords({
          data: server ? SHOWS.slice(0, 10) : SHOWS,
          fields: showFields,
          getRowId: (row) => row.id,
          rowCount: server ? 120 : undefined,
          selectable: true,
          defaultPosition: { pageSize: 10 }
        })
        return (
          <Records.Root records={records} layouts={layouts}>
            <button
              type='button'
              onClick={() =>
                records.addFilter({
                  field: 'venue',
                  operator: 'is',
                  values: ['Kazoo Hollow Room']
                })
              }
            >
              Stray filter
            </button>
            <Records.Content />
            <Records.BulkActions actions={[]} />
          </Records.Root>
        )
      }
      render(<Stray />)
      await user.click(screen.getByRole('checkbox', { name: 'Select page' }))
      await pickFromCount(user, 'Select all 120 records')
      await user.click(screen.getByRole('button', { name: 'Stray filter' }))
      expect(bar()).toHaveTextContent('120 selected')
      vi.restoreAllMocks()
    }
  )
})

describe('Records server bulk bar focus when a query change clears it', () => {
  it('moves focus to Select page rather than the page body', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onAction = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        })
    )
    function Narrowed() {
      const [view, setView] = React.useState(EMPTY_VIEW)
      const records = useRecords({
        data: SHOWS.slice(0, 10),
        fields: showFields,
        defaultPosition: { pageSize: 10 },
        getRowId: (row) => row.id,
        rowCount: 120,
        selectable: true,
        view,
        onViewChange: setView
      })
      return (
        <Records.Root records={records} layouts={layouts}>
          <button
            type='button'
            hidden
            data-testid='narrow'
            onClick={() =>
              setView({ ...view, query: { ...view.query, search: 'Perth' } })
            }
          >
            Narrow
          </button>
          <Records.Content />
          <Records.BulkActions actions={[{ label: 'Tag', onAction }]} />
        </Records.Root>
      )
    }
    render(<Narrowed />)
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    )
    await user.click(screen.getByRole('button', { name: 'Tag' }))
    act(() => screen.getByTestId('narrow').click())
    expect(bar()).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Select page' })).toHaveFocus()
    await act(async () => finish())
  })
})
