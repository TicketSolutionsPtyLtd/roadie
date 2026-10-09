import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RecordTable, tableColumns } from '.'
import { type TestShow, showFields, testShows } from '../Records/testUtils'

const cellRenders = vi.fn()
const column = tableColumns<TestShow>(showFields)
const counted = (key: 'show' | 'city' | 'sold' | 'gross', pin = false) =>
  column.field(key, {
    pin,
    cell: ({ value }) => {
      cellRenders(key)
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
