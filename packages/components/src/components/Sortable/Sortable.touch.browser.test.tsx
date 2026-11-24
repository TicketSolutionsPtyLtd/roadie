import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { tapOn } from '../../utils/touchTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import { Lanes, type Transfer, listed } from './lanes.testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
})

const handle = (name: string) =>
  screen.getByRole('button', { name: `Reorder ${name}` })

describe('Sortable Move menu on a touch screen', () => {
  // Base UI locks the page a task after a mouse or keyboard opens a menu, and
  // leaves it free for a finger to swipe the menu away.
  it.each(['first', 'second'])(
    'opens on the %s tap of a handle and leaves the page free to scroll',
    async (tap) => {
      render(<Lanes />)
      if (tap === 'second') {
        await tapOn(handle('Date'), 'centre')
        await userEvent.keyboard('{Escape}')
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
      }
      await tapOn(handle('Date'), 'centre')
      const menu = await screen.findByRole('menu')
      await waitFor(() => expect(menu).toHaveFocus())
      for (const scroller of [document.documentElement, document.body])
        expect(getComputedStyle(scroller).overflowY).toBe('visible')
    }
  )
})

describe('Sortable connected lists on a touch screen', () => {
  // Playwright can't start a native drag from a finger, so this drags with
  // the mouse on a page that reports a coarse pointer.
  it('moves an item into another list', async () => {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    const onTransfer = vi.fn<Transfer>()
    render(<Lanes onTransfer={onTransfer} />)
    await userEvent.dragAndDrop(handle('Date'), handle('SKU'))
    await waitFor(() => expect(onTransfer).toHaveBeenCalled())
    const { index } = onTransfer.mock.calls[0]![0]
    expect(onTransfer).toHaveBeenCalledWith({
      value: 'Date',
      from: 'todo',
      to: 'done',
      index
    })
    expect(listed('todo')).toEqual(['Event'])
    expect(listed('done')).toEqual(
      index === 0 ? ['Date', 'SKU'] : ['SKU', 'Date']
    )
  })
})
