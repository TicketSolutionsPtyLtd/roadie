import { type ComponentProps, useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { Sortable } from '.'

const menuRendered = vi.hoisted(() => vi.fn())

vi.mock('../Menu/MenuRoot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Menu/MenuRoot')>()
  function MenuRoot(props: ComponentProps<typeof actual.MenuRoot>) {
    menuRendered()
    return <actual.MenuRoot {...props} />
  }
  return { ...actual, MenuRoot }
})

const SONGS = Array.from({ length: 20 }, (_, index) => `Song ${index + 1}`)

function Setlist() {
  const [items, setItems] = useState(SONGS)
  return (
    <Sortable items={items} label='songs' onReorder={setItems}>
      <ul>
        {items.map((value) => (
          <Sortable.Item
            key={value}
            value={value}
            label={value}
            render={<li />}
          >
            <Sortable.Handle />
            {value}
          </Sortable.Item>
        ))}
      </ul>
    </Sortable>
  )
}

describe('Sortable render budget', () => {
  beforeAll(() => import('./SortableHandle'), 20_000)
  beforeEach(() => menuRendered.mockClear())

  it('renders no Move menu for a list nobody has reordered', () => {
    render(<Setlist />)
    expect(screen.getAllByRole('button')).toHaveLength(20)
    expect(menuRendered).not.toHaveBeenCalled()
  })

  it('renders one Move menu, not twenty, as a row of 20 moves', async () => {
    const user = userEvent.setup()
    render(<Setlist />)
    screen.getByRole('button', { name: 'Reorder Song 4' }).focus()
    await user.keyboard('{Enter}')
    const down = await screen.findByRole('menuitem', {
      name: 'Move Song 4 down'
    })
    menuRendered.mockClear()
    await user.click(down)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Song 4 moved to position 5 of 20 songs'
      )
    )
    // Measured at 1, the open menu closing. A menu on every handle made it 20.
    expect(menuRendered.mock.calls.length).toBeLessThanOrEqual(2)
  })
})
