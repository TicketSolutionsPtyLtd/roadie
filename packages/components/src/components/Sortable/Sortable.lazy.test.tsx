import type { ComponentProps } from 'react'

import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

let unmount = () => {}
afterEach(() => {
  unmount()
  vi.unstubAllGlobals()
})

/** A setlist. `requested` hears its handle with the menu asked for, `arrive` lets it load, and `withMenu` counts its renders. */
async function setup(songs = 2) {
  vi.resetModules()
  const requested = vi.fn()
  const withMenu = vi.fn()
  const arrived = Promise.withResolvers<void>()
  vi.doMock('./SortableHandle', async (importOriginal) => {
    requested()
    await arrived.promise
    const actual = await importOriginal<typeof import('./SortableHandle')>()
    function SortableHandle(
      props: ComponentProps<typeof actual.SortableHandle>
    ) {
      withMenu()
      return <actual.SortableHandle {...props} />
    }
    return { ...actual, SortableHandle }
  })
  // jsdom has no idle callback, so the page goes idle when the test says.
  let goIdle = () => {}
  vi.stubGlobal('requestIdleCallback', (run: () => void) => (goIdle = run))
  vi.stubGlobal('cancelIdleCallback', () => {})
  // After the reset, so these share one React with the list.
  const { useState } = await import('react')
  const { act, fireEvent, render, screen, waitFor } =
    await import('@testing-library/react')
  const { Sortable } = await import('.')
  const all = Array.from({ length: songs }, (_, index) => `Song ${index + 1}`)
  function Setlist({ disabled = false }) {
    const [items, setItems] = useState(all)
    return (
      <Sortable items={items} onReorder={setItems} disabled={disabled}>
        {items.map((value) => (
          <Sortable.Item key={value} value={value} label={value}>
            <Sortable.Handle />
          </Sortable.Item>
        ))}
      </Sortable>
    )
  }
  const view = render(<Setlist />)
  unmount = view.unmount
  return {
    fireEvent,
    screen,
    waitFor,
    requested,
    withMenu,
    goIdle: () => goIdle(),
    disable: () => view.rerender(<Setlist disabled />),
    handle: (name: string) =>
      screen.getByRole('button', { name: `Reorder ${name}` }),
    arrive: () =>
      act(async () => {
        arrived.resolve()
        await import('./SortableHandle')
      })
  }
}

type List = Awaited<ReturnType<typeof setup>>

describe('Sortable handle before its Move menu has loaded', () => {
  it.each<[string, (list: List) => void]>([
    ['the page goes idle', ({ goIdle }) => goIdle()],
    [
      'a pointer reaches a handle',
      ({ fireEvent, handle }) => fireEvent.pointerEnter(handle('Song 2'))
    ],
    ['focus reaches a handle', ({ handle }) => handle('Song 2').focus()]
  ])('asks for the menu once %s, and not before', async (_, reach) => {
    const list = await setup()
    expect(list.requested).not.toHaveBeenCalled()
    reach(list)
    await list.waitFor(() => expect(list.requested).toHaveBeenCalled())
  })

  it('is a closed menu button, then opens for the key that asked without another', async () => {
    const user = userEvent.setup()
    const { screen, waitFor, handle, arrive } = await setup()
    expect(handle('Song 2')).toHaveAttribute('aria-haspopup', 'menu')
    expect(handle('Song 2')).toHaveAttribute('aria-expanded', 'false')
    handle('Song 2').focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(handle('Song 2')).toHaveFocus()
    await arrive()
    const first = await screen.findByRole('menuitem', {
      name: 'Move Song 2 up'
    })
    await waitFor(() => expect(first).toHaveFocus())
    expect(handle('Song 2')).toHaveAttribute('aria-expanded', 'true')
  })

  it.each<[string, (list: List) => void]>([
    ['focus has moved on', ({ handle }) => handle('Song 1').focus()],
    [
      'its handle is pressed again',
      ({ fireEvent, handle }) => fireEvent.pointerDown(handle('Song 2'))
    ],
    ['its list is disabled', ({ disable }) => disable()]
  ])('opens nothing late once %s', async (_, moveOn) => {
    const user = userEvent.setup()
    const list = await setup()
    await user.click(list.handle('Song 2'))
    moveOn(list)
    await list.arrive()
    expect(list.screen.queryByRole('menu')).toBeNull()
  })

  it('renders one handle with a menu, not twenty, as a row of 20 moves', async () => {
    const user = userEvent.setup()
    const { screen, waitFor, handle, arrive, withMenu } = await setup(20)
    await arrive()
    expect(withMenu).not.toHaveBeenCalled()
    handle('Song 4').focus()
    await user.keyboard('{Enter}')
    await user.click(
      await screen.findByRole('menuitem', { name: 'Move Song 4 down' })
    )
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Song 4 moved to position 5 of 20'
      )
    )
    // Measured at 2, both the one handle's. A menu on every handle took 20
    // renders for the move alone.
    expect(withMenu.mock.calls.length).toBeLessThanOrEqual(3)
  })
})
