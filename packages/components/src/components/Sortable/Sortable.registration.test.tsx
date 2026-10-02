import { useState } from 'react'

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Sortable } from '.'
import * as dnd from './dnd'

vi.mock('./dnd', async (importOriginal) => {
  const actual = await importOriginal<typeof dnd>()
  return {
    ...actual,
    sortableItem: vi.fn(actual.sortableItem),
    sortableMonitor: vi.fn(actual.sortableMonitor)
  }
})

function Columns() {
  const [items, setItems] = useState(['Date', 'Event', 'SKU'])
  const [, setTick] = useState(0)
  return (
    <>
      <button type='button' onClick={() => setTick((tick) => tick + 1)}>
        Re-render
      </button>
      <Sortable items={items.map((item) => item)} onReorder={setItems}>
        {items.map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    </>
  )
}

describe('Sortable registration', () => {
  it('keeps the monitor and each item registered across re-renders and moves', async () => {
    const user = userEvent.setup()
    render(<Columns />)
    await waitFor(() => expect(dnd.sortableItem).toHaveBeenCalledTimes(3))
    expect(dnd.sortableMonitor).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Re-render' }))
    screen.getByRole('button', { name: 'Reorder Date' }).focus()
    await user.keyboard('{Enter}')
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move Date down' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    )

    expect(dnd.sortableItem).toHaveBeenCalledTimes(3)
    expect(dnd.sortableMonitor).toHaveBeenCalledTimes(1)
  })
})

describe('Sortable teardown', () => {
  it('clears the dragging state when a registration is torn down mid-drag', async () => {
    const view = (disabled: boolean) => (
      <Sortable items={['A', 'B']} onReorder={() => {}} disabled={disabled}>
        {['A', 'B'].map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
    vi.mocked(dnd.sortableItem).mockClear()
    const { rerender } = render(view(false))
    await waitFor(() => expect(dnd.sortableItem).toHaveBeenCalledTimes(2))
    const options = vi.mocked(dnd.sortableItem).mock.calls[0]![0]
    act(() => {
      options.onDraggingChange(true)
      options.onDropEdgeChange('bottom')
    })
    const item = document.querySelector('[data-slot="sortable-item"]')!
    expect(item).toHaveAttribute('data-dragging')
    rerender(view(true))
    expect(item).not.toHaveAttribute('data-dragging')
    expect(item).not.toHaveAttribute('data-drop-edge')
  })
})

describe('Sortable unknown values', () => {
  it('does not register an item whose value is not in items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(dnd.sortableItem).mockClear()
    render(
      <Sortable items={['A']} onReorder={() => {}}>
        {['A', 'Z'].map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
    await waitFor(() => expect(dnd.sortableItem).toHaveBeenCalled())
    expect(
      vi.mocked(dnd.sortableItem).mock.calls.map(([options]) => options.value)
    ).toEqual(['A'])
    warn.mockRestore()
  })
})
