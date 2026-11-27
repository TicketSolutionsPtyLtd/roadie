import { cleanup, render, screen, within } from '@testing-library/react'
import { userEvent as user } from '@testing-library/user-event'
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

import { pickMenuItem } from '@oztix/roadie-browser-testing'
import { useStylesheet } from '@oztix/roadie-browser-testing/stylesheet'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { Menu } from '../Menu'
import { testShows } from '../Records/testUtils'
import { type Move, Shows, column, titles } from './boardTestUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
  history.replaceState(null, '', location.pathname + location.search)
})

const card = (title: string) =>
  screen
    .getByText(title, { selector: '[data-slot="card-title"] *' })
    .closest<HTMLElement>('[data-slot="record-card"]')!
const dropZone = (name: string) =>
  column(name).querySelector<HTMLElement>('[data-slot="sortable-drop-zone"]')!

describe('dragging a board card', { timeout: 30_000 }, () => {
  it('drags a card from anywhere on it, not just its handle', async () => {
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await userEvent.dragAndDrop(
      card('Ocean Alley 1').querySelector('[data-slot="card-description"]')!,
      dropZone('Sold out')
    )
    await expect.poll(() => titles('Sold out')).toContain('Ocean Alley 1')
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'sold_out' }
    )
  })

  it('drags a card by its title link', async () => {
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} getRowHref={(show) => `#${show.id}`} />)
    await userEvent.dragAndDrop(
      screen.getByRole('link', { name: 'Ocean Alley 1' }),
      dropZone('Cancelled')
    )
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    expect(location.hash).toBe('')
  })

  it('takes a drop anywhere in a column, below its cards too', async () => {
    const onMove = vi.fn<Move>()
    // Three cards in On sale make every column that tall; No status is empty.
    render(<Shows onMove={onMove} shows={testShows(7)} />)
    const target = column('No status')
    const zone = dropZone('No status').getBoundingClientRect()
    const box = target.getBoundingClientRect()
    // The zone runs to the column's padding, not just past its last card.
    expect(box.bottom - zone.bottom).toBeLessThan(12)
    await userEvent.dragAndDrop(card('Ocean Alley 1'), target, {
      targetPosition: { x: box.width / 2, y: box.height - 14 }
    })
    await expect.poll(() => titles('No status')).toEqual(['Ocean Alley 1'])
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: null }
    )
  })

  it('still follows the title link on a click', async () => {
    render(<Shows getRowHref={(show) => `#${show.id}`} />)
    await userEvent.click(screen.getByRole('link', { name: 'Ocean Alley 1' }))
    expect(location.hash).toBe('#show-0')
  })

  it('still opens the row actions on a click', async () => {
    const onArchive = vi.fn()
    render(
      <Shows
        rowActions={() => <Menu.Item onClick={onArchive}>Archive</Menu.Item>}
      />
    )
    await pickMenuItem(user.setup(), {
      from: within(card('Ocean Alley 1')).getByRole('button', {
        name: 'More actions for Ocean Alley 1'
      }),
      item: 'Archive'
    })
    expect(onArchive).toHaveBeenCalled()
  })

  it('still opens the Move menu from the handle on a click', async () => {
    render(<Shows />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    expect(
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to Sold out'
      })
    ).toBeVisible()
  })
})
