import { act, cleanup, render, screen } from '@testing-library/react'
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

import { recordFields } from '@oztix/roadie-core/records'

import roadieCss from '../../../vitest.browser.css?inline'
import { pickMenuItem, releaseDragPointer } from '../../css/testUtils'
import { loadBrandFont, useStylesheet } from '../Pane/testUtils'
import { type TestShow, showFields, testShows } from '../Records/testUtils'
import { type Move, Shows, column, titles } from './boardTestUtils'

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

  it('moves a card to another column from its Move menu, and calls onMove with the field it changes', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Cancelled'
    })
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: 'cancelled' }
    )
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    expect(titles('On sale')).toEqual([])
  })

  it('moves a card into "No status" with the field set to null', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} />)
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to No status'
    })
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: null }
    )
  })

  it('names the field the view groups by, when it isn’t the definition’s', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn<Move>()
    const city = recordFields<TestShow>().option('city', {
      label: 'City',
      options: [
        { value: 'Brisbane', label: 'Brisbane' },
        { value: 'Melbourne', label: 'Melbourne' }
      ]
    })
    render(
      <Shows
        onMove={onMove}
        save={() => undefined}
        fields={[...showFields.filter(({ key }) => key !== 'city'), city]}
        defaultView={{ layout: { type: 'board', groupBy: ['city'] } }}
      />
    )
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Melbourne'
    })
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { city: 'Melbourne' }
    )
  })

  it('drags a card into an empty column', async () => {
    const onMove = vi.fn<Move>()
    render(<Shows onMove={onMove} shows={testShows(3)} />)
    expect(titles('No status')).toEqual([])
    await browserUser.dragAndDrop(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      column('No status').querySelector('[data-slot="sortable-drop-zone"]')!
    )
    expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'show-0' }),
      { status: null }
    )
    await expect.poll(() => titles('No status')).toEqual(['Ocean Alley 1'])
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
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Cancelled'
    })
    // Shown in its new column while the app saves it.
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    reject(new Error('Cancelled shows can’t go back on sale.'))
    await expect.poll(() => titles('On sale')).toEqual(['Ocean Alley 1'])
    expect(titles('Cancelled')).not.toContain('Ocean Alley 1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cancelled shows can’t go back on sale.'
    )
    // The handle went with the card, so focus follows it back.
    expect(
      screen.getByRole('button', { name: 'Reorder Ocean Alley 1' })
    ).toHaveFocus()
  })

  it('shows no message for a move a later move of the same card replaced', async () => {
    const user = userEvent.setup()
    const pending: {
      promise: Promise<void>
      reject: (error: Error) => void
    }[] = []
    render(
      <Shows
        onMove={(_, changes) =>
          changes.status === 'cancelled'
            ? (() => {
                let reject = (_: Error) => {}
                const promise = new Promise<void>((_, fail) => {
                  reject = fail
                })
                pending.push({ promise, reject })
                return promise
              })()
            : undefined
        }
      />
    )
    const moveTo = async (column: string) => {
      await pickMenuItem(user, {
        from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
        item: `Move Ocean Alley 1 to ${column}`
      })
    }
    await moveTo('Cancelled')
    await moveTo('Sold out')
    await expect.poll(() => titles('Sold out')).toContain('Ocean Alley 1')
    // The board's own handler ran first, so its updates land within this act.
    await act(async () => {
      pending[0]!.reject(new Error('Too late.'))
      await pending[0]!.promise.catch(() => {})
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(titles('Sold out')).toContain('Ocean Alley 1')
  })

  it('keeps a blank option out of the columns, so "No status" is the only home for blanks', () => {
    const status = recordFields<TestShow>().option('status', {
      label: 'Status',
      options: [
        { value: '', label: 'None' },
        { value: 'on_sale', label: 'On sale' }
      ]
    })
    render(
      <Shows
        shows={testShows(2).map((show, index) =>
          index === 1 ? { ...show, status: '' } : show
        )}
        fields={[...showFields.filter(({ key }) => key !== 'status'), status]}
      />
    )
    expect(
      screen
        .getAllByRole('region')
        .map((region) => region.getAttribute('aria-label'))
    ).toEqual(['On sale', 'No status'])
    expect(titles('No status')).toEqual(['Ball Park Music 1'])
  })

  it('shows no handles in Select mode', () => {
    render(<Shows selected={['show-0']} />)
    expect(
      screen.getByRole('checkbox', { name: 'Select Ocean Alley 1' })
    ).toBeChecked()
    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull()
  })

  it('keeps a moved card in its new column once the app confirms, before its data catches up', async () => {
    const user = userEvent.setup()
    let confirm = () => {}
    render(
      <Shows
        onMove={() =>
          new Promise<void>((done) => {
            confirm = done
          })
        }
        save={() => undefined}
      />
    )
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Cancelled'
    })
    await expect.poll(() => titles('Cancelled')).toContain('Ocean Alley 1')
    await act(async () => confirm())
    expect(titles('Cancelled')).toContain('Ocean Alley 1')
    expect(titles('On sale')).toEqual([])
  })

  it('shows the value the app saved when it differs from the column', async () => {
    const user = userEvent.setup()
    render(<Shows save={() => 'sold_out'} />)
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Cancelled'
    })
    await expect.poll(() => titles('Sold out')).toContain('Ocean Alley 1')
    expect(titles('Cancelled')).not.toContain('Ocean Alley 1')
  })

  it('says the card wasn’t moved when the rejection has no message', async () => {
    const user = userEvent.setup()
    render(<Shows onMove={() => Promise.reject(new Error(''))} />)
    await pickMenuItem(user, {
      from: screen.getByRole('button', { name: 'Reorder Ocean Alley 1' }),
      item: 'Move Ocean Alley 1 to Cancelled'
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocean Alley 1 wasn’t moved. Try again.'
    )
    expect(titles('On sale')).toEqual(['Ocean Alley 1'])
  })

  it('fits every column side by side on a wide screen', () => {
    render(<Shows width={1100} />)
    const row = column('On sale').parentElement!.getBoundingClientRect()
    const last = column('No status').getBoundingClientRect()
    expect(last.right).toBeLessThanOrEqual(row.right)
    expect(column('On sale').getBoundingClientRect().width).toBeGreaterThan(200)
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
