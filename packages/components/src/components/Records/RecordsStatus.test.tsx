import { useEffect } from 'react'

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Records } from '.'
import { type TestShow, showFields, testShows } from './testUtils'
import { type RecordsInstance, useRecords } from './useRecords'

const holder: { records?: RecordsInstance<TestShow> } = {}

function Shows({ selectable = false }: { selectable?: boolean }) {
  const records = useRecords({
    data: testShows(120),
    fields: showFields,
    getRowId: (row) => row.id,
    selectable
  })
  useEffect(() => {
    holder.records = records
  })
  return (
    <Records.Root records={records} layouts={[]}>
      <Records.Status />
    </Records.Root>
  )
}

const status = () => screen.getByRole('status')

describe('Records.Status', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('announces the count once typing settles, not on every keystroke', () => {
    render(<Shows />)
    for (const search of ['P', 'Pe', 'Per', 'Pert', 'Perth']) {
      act(() => holder.records!.setSearch(search))
      act(() => vi.advanceTimersByTime(100))
      expect(status()).toHaveTextContent('')
    }
    act(() => vi.advanceTimersByTime(500))
    expect(status()).toHaveTextContent('24 results')
  })

  it('announces a selection at once, with the settled count', () => {
    render(<Shows selectable />)
    act(() => holder.records!.setSearch('Perth'))
    act(() => vi.advanceTimersByTime(600))
    act(() => holder.records!.toggleRow('show-3'))
    expect(status()).toHaveTextContent('1 selected, 24 results')
    act(() => holder.records!.clearSelection())
    expect(status()).toHaveTextContent('24 results')
  })

  it('says when Select mode starts', () => {
    render(<Shows selectable />)
    act(() => holder.records!.setSelecting(true))
    expect(status()).toHaveTextContent('Select mode, 0 selected')
  })
})
