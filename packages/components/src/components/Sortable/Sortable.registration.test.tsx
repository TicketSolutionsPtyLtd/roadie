import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
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
