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

import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { groupedShowFields } from '../Records/testUtils'
import {
  type Move,
  Shows,
  cell,
  cellTitles,
  column,
  titles
} from './boardTestUtils'

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
      { status: 'sold_out' }
    )
  })
  it('drags a card to another column in its lane on a phone', async () => {
    const onMove = vi.fn<Move>()
    render(
      <Shows
        onMove={onMove}
        width={375}
        fields={groupedShowFields}
        groupBy={['status', 'city']}
      />
    )
    await userEvent.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      cell('Brisbane', 'Sold out').querySelector(
        '[data-slot="sortable-drop-zone"]'
      )!,
      { targetPosition: { x: 12, y: 20 } }
    )
    await expect
      .poll(() => cellTitles('Brisbane', 'Sold out'))
      .toEqual(['Ocean Alley 1'])
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'sold_out' }
    )
  })
  it('drags a card to another lane on a phone', async () => {
    const onMove = vi.fn<Move>()
    render(
      <Shows
        onMove={onMove}
        width={375}
        fields={groupedShowFields}
        groupBy={['status', 'city']}
      />
    )
    await userEvent.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      cell('Melbourne', 'On sale').querySelector(
        '[data-slot="sortable-drop-zone"]'
      )!,
      { targetPosition: { x: 12, y: 20 } }
    )
    await expect
      .poll(() => cellTitles('Melbourne', 'On sale'))
      .toEqual(['Ocean Alley 1'])
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { city: 'Melbourne' }
    )
  })
})
