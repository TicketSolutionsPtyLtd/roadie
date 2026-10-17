// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BRAND_ILLUSTRATIONS } from '@/lib/brand-illustrations'

import { IllustrationLibrary, filterIllustrations } from './IllustrationLibrary'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const tiles = () => screen.queryAllByRole('listitem')

describe('filterIllustrations', () => {
  it.each([
    ['', BRAND_ILLUSTRATIONS.length],
    ['heart', 2],
    ['tickets', 3],
    ['TICKETS events', 3],
    ['no such thing', 0]
  ])('"%s" leaves %i illustrations', (query, count) => {
    expect(filterIllustrations(BRAND_ILLUSTRATIONS, query)).toHaveLength(count)
  })

  it('matches the SpotIllustration component name', () => {
    expect(
      filterIllustrations(BRAND_ILLUSTRATIONS, 'NoteMusic').map((i) => i.slug)
    ).toEqual(['note-music'])
  })
})

describe('IllustrationLibrary', () => {
  it('narrows the tiles as you type, and shows an empty state with no match', () => {
    render(<IllustrationLibrary />)
    expect(tiles()).toHaveLength(BRAND_ILLUSTRATIONS.length)

    const search = screen.getByRole('searchbox', {
      name: 'Search illustrations'
    })
    fireEvent.change(search, { target: { value: 'music' } })
    const musical = tiles()
    expect(musical.length).toBeGreaterThan(0)
    expect(musical.length).toBeLessThan(BRAND_ILLUSTRATIONS.length)

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(tiles()).toHaveLength(0)
    expect(screen.getByText('No illustrations found')).toBeTruthy()
  })

  it('puts the tile actions in a Card.Footer, after the body', () => {
    render(<IllustrationLibrary />)
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'ghost' }
    })

    const [tile] = tiles()
    const footer = within(tile!)
      .getByRole('button', { name: 'Copy SVG of Ghost' })
      .closest('[data-slot="card-footer"]')
    expect(footer?.previousElementSibling?.getAttribute('data-slot')).toBe(
      'card-content'
    )
    expect(
      within(footer as HTMLElement).getByRole('button', {
        name: 'More options for Ghost'
      })
    ).toBeTruthy()
  })

  it('copies the SVG markup and announces it', async () => {
    const markup = '<svg viewBox="0 0 48 48"><path d="M0 0h48v48z"/></svg>'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => markup })
    )
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    })
    render(<IllustrationLibrary />)
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'ghost' }
    })

    const [tile] = tiles()
    fireEvent.click(
      within(tile!).getByRole('button', { name: 'Copy SVG of Ghost' })
    )

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(markup))
    expect(within(tile!).getByText('Copied the SVG of Ghost')).toBeTruthy()
    expect(fetch).toHaveBeenCalledWith('/brand/illustrations/ghost.svg')
  })

  it('offers SVG and PNG downloads in the more options menu', async () => {
    const saved: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      saved.push(`${this.download} ${this.getAttribute('href')}`)
    })
    render(<IllustrationLibrary />)
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'ghost' }
    })

    const [tile] = tiles()
    fireEvent.click(
      within(tile!).getByRole('button', { name: 'More options for Ghost' })
    )
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Download SVG',
      'Download PNG'
    ])

    fireEvent.click(items[0]!)
    await waitFor(() =>
      expect(saved).toEqual(['oztix-ghost.svg /brand/illustrations/ghost.svg'])
    )
    expect(
      await within(tile!).findByText('Downloaded the SVG of Ghost')
    ).toBeTruthy()
  })
})
