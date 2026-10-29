import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Mosaic, type MosaicProps } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  photo,
  widths,
  withBrowserPage
} from '../_test/browser'
import { partnerTiers } from './fixtures'

withBrowserPage()

const offline = (props: MosaicProps): MosaicProps => ({
  ...props,
  tiles: props.tiles.map((partner) => ({
    ...partner,
    image: photo(''),
    logo: partner.logo && photo(partner.logo.alt, 240, 80)
  })),
  logoTile: props.logoTile && {
    ...props.logoTile,
    logos: props.logoTile.logos.map((logo) => photo(logo.alt, 240, 80))
  }
})

const tiles = () =>
  [...document.querySelectorAll('li')].map((tile) =>
    tile.getBoundingClientRect()
  )

const columns = () =>
  getComputedStyle(document.querySelector('ul')!)
    .gridTemplateColumns.split(' ')
    .filter((track) => parseFloat(track) > 0).length

describe('Mosaic partner-tiers layout', () => {
  it.each([
    { ...widths[0], columns: 2 },
    { ...widths[1], columns: 4 }
  ])(
    'fits $columns columns at $name width',
    async ({ width, height, columns: expected }) => {
      await atWidth(width, height)
      render(<Mosaic {...offline(partnerTiers)} />)

      const [featured, square] = tiles()
      expect(columns()).toBe(expected)
      expect(featured!.width).toBeGreaterThan(square!.width * 2)
      expect(featured!.height).toBeCloseTo(square!.height, 0)
      expect(square!.height).toBeCloseTo(square!.width, 0)
    }
  )

  it('packs a square partner into the gap a wide tile leaves', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiers).tiles
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[featured!, square!, featured!, square!]}
        logoTile={undefined}
      />
    )

    const [first, , wide, last] = tiles()
    expect(Math.round(last!.top)).toBe(Math.round(first!.top))
    expect(wide!.top).toBeGreaterThan(first!.bottom)
  })
})

describe('Mosaic photos', () => {
  it('fills each tile with its photo whatever shape the photo is', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiers).tiles
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[
          { ...featured!, image: photo('', 400, 1200) },
          { ...square!, image: photo('', 1200, 400) }
        ]}
        logoTile={undefined}
      />
    )

    for (const tile of document.querySelectorAll('li')) {
      const frame = tile.getBoundingClientRect()
      const image = tile.querySelector('img')!.getBoundingClientRect()
      expect(image.width).toBeCloseTo(frame.width, 0)
      expect(image.height).toBeCloseTo(frame.height, 0)
    }
  })
})

describe('Mosaic accessibility', () => {
  it.each(widths)(
    'partner-tiers has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Mosaic {...offline(partnerTiers)} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
