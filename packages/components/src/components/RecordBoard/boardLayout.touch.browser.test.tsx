import { cleanup, render, screen } from '@testing-library/react'
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
import { useStylesheet } from '../Pane/testUtils'
import { type Move, Shows, column, titles } from './boardTestUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
})

describe('boardLayout on a touch screen', () => {
  // Playwright can't start a native drag from a finger, so this drags with
  // the mouse on a page that reports a coarse pointer.
  it('drags a card to another column on a phone', async () => {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true)
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} width={375} />)
    await userEvent.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      column('Sold out').querySelector('[data-slot="sortable-drop-zone"]')!,
      // On its edge that peeks in, as a finger would.
      { targetPosition: { x: 12, y: 40 } }
    )
    await expect.poll(() => titles('Sold out')).toContain('Ocean Alley 1')
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      'sold_out'
    )
  })
})
