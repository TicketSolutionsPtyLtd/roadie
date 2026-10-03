import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cellRenders = vi.fn()
vi.mock('../Records/RecordValue', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../Records/RecordValue')>()
  return {
    ...original,
    RecordValue: (props: Parameters<typeof original.RecordValue>[0]) => {
      cellRenders(props.field.key)
      return original.RecordValue(props)
    }
  }
})

const { RecordTable, tableColumns } = await import('.')
const { showFields, testShows } = await import('../Records/testUtils')

type Show = ReturnType<typeof testShows>[number]
const column = tableColumns<Show>(showFields)
const columns = [
  column.field('show', { pin: true }),
  column.field('city'),
  column.field('sold'),
  column.field('gross')
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
