import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

let unmount = () => {}
afterEach(() => {
  unmount()
  vi.unstubAllGlobals()
})

/** A list whose Move menu is asked for when `requested` is called, and still on its way until `arrive` is. */
async function setup() {
  vi.resetModules()
  const requested = vi.fn()
  const arrived = Promise.withResolvers<void>()
  vi.doMock('./SortableMoveMenu', async (importOriginal) => {
    requested()
    await arrived.promise
    return importOriginal()
  })
  // jsdom has no idle callback, so the page goes idle when the test says.
  let goIdle = () => {}
  vi.stubGlobal('requestIdleCallback', (run: () => void) => (goIdle = run))
  vi.stubGlobal('cancelIdleCallback', () => {})
  // After the reset, so these share one React with the list.
  const { act, fireEvent, render, screen, waitFor } =
    await import('@testing-library/react')
  const { Sortable } = await import('.')
  const list = (disabled = false) => (
    <Sortable items={['Date', 'SKU']} onReorder={() => {}} disabled={disabled}>
      {['Date', 'SKU'].map((value) => (
        <Sortable.Item key={value} value={value} label={value}>
          <Sortable.Handle />
        </Sortable.Item>
      ))}
    </Sortable>
  )
  const view = render(list())
  unmount = view.unmount
  return {
    fireEvent,
    screen,
    waitFor,
    requested,
    goIdle: () => goIdle(),
    disable: () => view.rerender(list(true)),
    handle: (name: string) =>
      screen.getByRole('button', { name: `Reorder ${name}` }),
    arrive: () =>
      act(async () => {
        arrived.resolve()
        await import('./SortableMoveMenu')
      })
  }
}

type List = Awaited<ReturnType<typeof setup>>

describe('Sortable handle before its Move menu has loaded', () => {
  it.each<[string, (list: List) => void]>([
    ['the page goes idle', ({ goIdle }) => goIdle()],
    [
      'a pointer reaches a handle',
      ({ fireEvent, handle }) => fireEvent.pointerEnter(handle('SKU'))
    ],
    ['focus reaches a handle', ({ handle }) => handle('SKU').focus()]
  ])('asks for the menu once %s, and not before', async (_, reach) => {
    const list = await setup()
    expect(list.requested).not.toHaveBeenCalled()
    reach(list)
    await list.waitFor(() => expect(list.requested).toHaveBeenCalled())
  })

  it('is a closed menu button, then opens for the key that asked without another', async () => {
    const user = userEvent.setup()
    const { screen, waitFor, handle, arrive } = await setup()
    expect(handle('SKU')).toHaveAttribute('aria-haspopup', 'menu')
    expect(handle('SKU')).toHaveAttribute('aria-expanded', 'false')
    handle('SKU').focus()
    await user.keyboard('{Enter}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(handle('SKU')).toHaveFocus()
    await arrive()
    const first = await screen.findByRole('menuitem', { name: 'Move SKU up' })
    await waitFor(() => expect(first).toHaveFocus())
    expect(handle('SKU')).toHaveAttribute('aria-expanded', 'true')
  })

  it.each<[string, (list: List) => void]>([
    ['focus has moved on', ({ handle }) => handle('Date').focus()],
    [
      'its handle is pressed again',
      ({ fireEvent, handle }) => fireEvent.pointerDown(handle('SKU'))
    ],
    ['its list is disabled', ({ disable }) => disable()]
  ])('opens nothing late once %s', async (_, moveOn) => {
    const user = userEvent.setup()
    const list = await setup()
    await user.click(list.handle('SKU'))
    moveOn(list)
    await list.arrive()
    expect(list.screen.queryByRole('menu')).toBeNull()
  })
})
