// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SPOT_ILLUSTRATION_NAMES } from '@/lib/spot-illustrations'

import {
  IllustrationGallery,
  filterSpotIllustrations
} from './IllustrationGallery'

afterEach(() => cleanup())

describe('filterSpotIllustrations', () => {
  it.each([
    ['', SPOT_ILLUSTRATION_NAMES.length],
    ['zigzag', 4],
    ['vertical right', 1],
    ['no such thing', 0]
  ])('"%s" leaves %i illustrations', (query, count) => {
    expect(
      filterSpotIllustrations(SPOT_ILLUSTRATION_NAMES, query)
    ).toHaveLength(count)
  })

  it('finds an illustration by its brand tags, not just its name', () => {
    expect(filterSpotIllustrations(SPOT_ILLUSTRATION_NAMES, 'music')).toEqual(
      expect.arrayContaining(['NoteMusic', 'TapeCassetteMusic'])
    )
  })
})

describe('IllustrationGallery', () => {
  it('narrows the tiles as you type, and shows an empty state with no match', () => {
    render(<IllustrationGallery />)
    const tiles = () => screen.queryAllByRole('button', { name: /^Copy / })
    expect(tiles()).toHaveLength(SPOT_ILLUSTRATION_NAMES.length)

    const search = screen.getByRole('searchbox', {
      name: 'Search spot illustrations'
    })
    fireEvent.change(search, { target: { value: 'heart' } })
    expect(tiles().map((tile) => tile.getAttribute('aria-label'))).toEqual([
      'Copy Heart',
      'Copy HeartPixel'
    ])

    fireEvent.change(search, { target: { value: 'zzz' } })
    expect(tiles()).toHaveLength(0)
    expect(screen.getByText('No illustrations found')).toBeTruthy()
  })
})
