import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

let unmount = () => {}
afterEach(() => unmount())

/** A list whose Move menu is still on its way until `arrive` is called. */
async function setup() {
  vi.resetModules()
  const arrived = Promise.withResolvers<void>()
  vi.doMock('./SortableMoveMenu', async (importOriginal) => {
    await arrived.promise
    return importOriginal()
  })
  // After the reset, so these share one React with the list.
  const { act, fireEvent, render, screen, waitFor } =
    await import('@testing-library/react')
  const { Sortable } = await import('.')
  const view = render(
    <Sortable items={['Date', 'SKU']} onReorder={() => {}}>
      {['Date', 'SKU'].map((value) => (
        <Sortable.Item key={value} value={value} label={value}>
          <Sortable.Handle />
        </Sortable.Item>
      ))}
    </Sortable>
  )
  unmount = view.unmount
  const handle = (name: string) =>
    screen.getByRole('button', { name: `Reorder ${name}` })
  const arrive = () =>
    act(async () => {
      arrived.resolve()
      await import('./SortableMoveMenu')
    })
  return { fireEvent, screen, waitFor, handle, arrive }
}

type List = Awaited<ReturnType<typeof setup>>

describe('Sortable handle while its Move menu loads', () => {
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
    ]
  ])('opens nothing late once %s', async (_, moveOn) => {
    const user = userEvent.setup()
    const list = await setup()
    const { screen, handle, arrive } = list
    await user.click(handle('SKU'))
    moveOn(list)
    await arrive()
    // The menu has loaded, as the next press shows by opening it.
    expect(screen.queryByRole('menu')).toBeNull()
    await user.click(handle('SKU'))
    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })
})
