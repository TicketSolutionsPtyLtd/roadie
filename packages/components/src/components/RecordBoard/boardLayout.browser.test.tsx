import { cleanup, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { userEvent as browserUser } from 'vitest/browser'

import roadieCss from '../../../vitest.browser.css?inline'
import { releaseDragPointer } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { testShows } from '../Records/testUtils'
import { type Move, Shows, column, titles } from './board.testUtils'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(async () => {
  cleanup()
  await releaseDragPointer()
})

describe('boardLayout in a browser', { timeout: 30_000 }, () => {
  it('puts a column per option in option order, then "No status"', () => {
    render(<Shows />)
    expect(
      screen
        .getAllByRole('region')
        .map((region) => region.getAttribute('aria-label'))
    ).toEqual(['On sale', 'Sold out', 'Cancelled', 'No status'])
    expect(titles('On sale')).toEqual(['Ocean Alley 1'])
    expect(titles('Sold out')).toEqual(['Ball Park Music 1'])
    expect(titles('No status')).toEqual(['angie McMahon 1'])
  })

  it('keeps an empty "No status" column to move cards into', () => {
    render(<Shows shows={testShows(3)} />)
    expect(titles('No status')).toEqual([])
  })

  it('shows no handles without onMove', () => {
    render(<Shows movable={false} />)
    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull()
    expect(titles('On sale')).toEqual(['Ocean Alley 1'])
  })

  it('moves a card to another column from its Move menu, and calls onMove with the value', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await user.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to Cancelled'
      })
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      'cancelled'
    )
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    expect(titles('On sale')).toEqual([])
  })

  it('moves a card into "No status" with a null value', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await user.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to No status'
      })
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      null
    )
  })

  it('drags a card into an empty column', async () => {
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await browserUser.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      column('Cancelled').querySelector('[data-slot="sortable-drop-zone"]')!
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      'cancelled'
    )
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
  })

  it('puts a card back, with the message, when onMove rejects', async () => {
    const user = userEvent.setup()
    let reject = (_: Error) => {}
    render(
      <Shows
        onMove={() =>
          new Promise((_, fail) => {
            reject = fail
          })
        }
      />
    )
    await user.click(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    )
    await user.click(
      await screen.findByRole('menuitem', {
        name: 'Move Ocean Alley 1 to Cancelled'
      })
    )
    // Shown in its new column while the app saves it.
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    reject(new Error('Cancelled shows can’t go back on sale.'))
    await expect.poll(() => titles('On sale')).toEqual(['Ocean Alley 1'])
    expect(titles('Cancelled')).not.toContain('Ocean Alley 1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cancelled shows can’t go back on sale.'
    )
  })

  it('lays columns out as a scroll-snap row on a phone, the next one peeking in', () => {
    render(<Shows width={375} />)
    const first = column('On sale').getBoundingClientRect()
    const second = column('Sold out').getBoundingClientRect()
    expect(first.width / 375).toBeGreaterThan(0.75)
    expect(first.width / 375).toBeLessThan(0.9)
    expect(second.left).toBeLessThan(375)
    const row = column('On sale').parentElement!
    expect(getComputedStyle(row).scrollSnapType).toMatch(/x/)
    expect(getComputedStyle(column('On sale')).scrollSnapAlign).toBe('start')
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      window.innerWidth
    )
  })
})
