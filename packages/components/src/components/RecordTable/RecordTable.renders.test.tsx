import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecordTable, tableColumns } from '.'
import { renderProfiled } from '../../utils/renderTestUtils'
import { RecordList } from '../RecordList'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const cellRenders = vi.fn()
const column = tableColumns<TestShow>(showFields)
const counted = (key: 'show' | 'city' | 'sold' | 'gross', pin = false) =>
  column.field(key, {
    pin,
    cell: ({ value, row }) => {
      cellRenders(row.id)
      return String(value)
    }
  })
const columns = [
  counted('show', true),
  counted('city'),
  counted('sold'),
  counted('gross')
]
const shows = testShows(50)

const renderedIds = () =>
  new Set(cellRenders.mock.calls.map(([id]) => id as string))

// Searching a page of 100 for "H" keeps 58 of its rows and brings in 42.
function narrowPage() {
  const first = renderedIds()
  cellRenders.mockClear()
  act(() => {
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Search and filter' }),
      { target: { value: 'H' } }
    )
  })
  const rendered = [...renderedIds()]
  return {
    again: rendered.filter((id) => first.has(id)),
    arrived: rendered.filter((id) => !first.has(id))
  }
}

describe('RecordTable render budget', () => {
  beforeEach(() => cellRenders.mockClear())

  it('renders nothing on hover', () => {
    render(<RecordTable data={shows} fields={showFields} columns={columns} />)
    cellRenders.mockClear()
    const row = screen.getAllByRole('row')[3]!
    fireEvent.pointerEnter(row)
    fireEvent.pointerMove(row)
    fireEvent.pointerLeave(row)
    expect(cellRenders).not.toHaveBeenCalled()
  })

  it('renders no row again that a narrower search keeps', () => {
    render(<RecordTable data={shows} fields={showFields} columns={columns} />)
    cellRenders.mockClear()
    act(() => {
      fireEvent.change(
        screen.getByRole('combobox', { name: 'Search and filter' }),
        {
          target: { value: 'Hobart' }
        }
      )
    })
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(cellRenders).not.toHaveBeenCalled()
  })

  it('renders no row again that a narrower search moves up a page of many', () => {
    render(
      <RecordTable
        data={testShows(200)}
        fields={showFields}
        columns={columns}
        getRowId={(row) => row.id}
        defaultPosition={{ pageSize: 100 }}
        selectable
      />
    )
    // The first match, under the header and three rows the search drops.
    const moved = screen.getAllByRole('row')[4]!
    expect(moved).toHaveAttribute('aria-rowindex', '5')
    const { again, arrived } = narrowPage()
    expect(arrived).toHaveLength(42)
    expect(again).toEqual([])
    expect(screen.getAllByRole('row')[1]).toBe(moved)
    expect(moved).toHaveAttribute('aria-rowindex', '2')
  })

  it('renders no row again while loading toggles', () => {
    const { rerender } = render(
      <RecordTable data={shows} fields={showFields} columns={columns} />
    )
    cellRenders.mockClear()
    rerender(
      <RecordTable data={shows} fields={showFields} columns={columns} loading />
    )
    expect(cellRenders).not.toHaveBeenCalled()
  })
})

describe('RecordList render budget', () => {
  beforeEach(() => cellRenders.mockClear())

  it('renders no row again that a narrower search moves up a page of many', () => {
    render(
      <RecordList
        data={testShows(200)}
        fields={showFields}
        row={{
          title: {
            key: 'show',
            cell: ({ value, row }) => {
              cellRenders(row.id)
              return String(value)
            }
          },
          description: 'city'
        }}
        getRowId={(row) => row.id}
        defaultPosition={{ pageSize: 100 }}
      />
    )
    // The first match, under three rows the search drops.
    const moved = screen.getAllByRole('listitem')[3]!
    expect(moved).toHaveAttribute('aria-posinset', '4')
    expect(moved).toHaveAttribute('aria-setsize', '200')
    const { again, arrived } = narrowPage()
    expect(arrived).toHaveLength(42)
    expect(again).toEqual([])
    expect(screen.getAllByRole('listitem')[0]).toBe(moved)
    expect(moved).toHaveAttribute('aria-posinset', '1')
    expect(moved).toHaveAttribute('aria-setsize', '119')
  })
})

describe('RecordTable re-renders by component', () => {
  const page = () =>
    renderProfiled(
      <RecordTable
        caption='Shows'
        data={testShows(200)}
        fields={showFields}
        columns={columns}
        getRowId={(row) => row.id}
        defaultPosition={{ pageSize: 100 }}
        selectable
      />
    )

  const parts = (counts: Record<string, number>) =>
    Object.keys(counts)
      .filter((name) => name.startsWith('Records.'))
      .sort()

  it('renders only what shows the selection on a tick', async () => {
    const { measure } = page()
    const box = within(screen.getAllByRole('row')[5]!).getByRole('checkbox')
    const tick = await measure(() => fireEvent.click(box))
    expect(box).toHaveAttribute('aria-checked', 'true')
    // The state's owners, and the status that counts the selection.
    expect(parts(tick)).toEqual([
      'Records.Provider',
      'Records.Root',
      'Records.Status'
    ])
    // The ticked row, not every row on the page.
    expect(tick.Row).toBe(1)
    expect(tick.RecordsRowCheckbox).toBe(1)
  })

  it('renders the parts that show a search, not the toolbar around them', async () => {
    const { measure } = page()
    const firstMatch = screen.getAllByRole('row')[4]
    const search = screen.getByRole('combobox', { name: 'Search and filter' })
    const typed = await measure(() =>
      fireEvent.change(search, { target: { value: 'H' } })
    )
    // The first match, under three rows the search drops, moves up.
    expect(screen.getAllByRole('row')[1]).toBe(firstMatch)
    expect(typed['Records.Header']).toBeUndefined()
    expect(parts(typed)).toEqual(
      expect.arrayContaining([
        'Records.Search',
        'Records.Pagination',
        'Records.Status'
      ])
    )
  })
})
