import { render, screen } from '@testing-library/react'
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
import { logoStrip, partnerTiers } from './fixtures'

withBrowserPage()

const offline = (props: MosaicProps): MosaicProps => ({
  ...props,
  tiles: props.tiles.map((partner) => ({
    ...partner,
    image: partner.image && photo(''),
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

describe('Mosaic tiers layout', () => {
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

describe('Mosaic tiles without a logo', () => {
  it('show their name as text in place of the logo', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[{ name: 'Kazoo Hollow Room', image: photo('') }]}
        logoTile={undefined}
      />
    )

    const name = screen.getByText('Kazoo Hollow Room').getBoundingClientRect()
    expect(name.width).toBeGreaterThan(40)
    expect(name.height).toBeGreaterThan(16)
  })
})

describe('Mosaic logo-strip layout', () => {
  it.each(widths)(
    'sets logos 48px tall in their own ratio, centred, at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      render(
        <Mosaic
          {...offline(logoStrip)}
          tiles={[
            { name: 'Wide', logo: photo('Wide logo', 600, 100) },
            { name: 'Square', logo: photo('Square logo', 300, 300) }
          ]}
        />
      )

      const wide = screen.getByRole('img', { name: 'Wide logo' })
      const square = screen.getByRole('img', { name: 'Square logo' })
      expect(wide.getBoundingClientRect().height).toBeCloseTo(48, 0)
      expect(wide.getBoundingClientRect().width).toBeCloseTo(288, 0)
      expect(square.getBoundingClientRect().width).toBeCloseTo(48, 0)

      const list = document.querySelector('ul')!.getBoundingClientRect()
      const items = [...document.querySelectorAll('li')].map((item) =>
        item.getBoundingClientRect()
      )
      const left = Math.min(...items.map((item) => item.left)) - list.left
      const right = list.right - Math.max(...items.map((item) => item.right))
      expect(left).toBeCloseTo(right, 0)
      const heading = screen.getByRole('heading', { level: 2 })
      expect(getComputedStyle(heading).textAlign).toBe('center')
    }
  )

  it('wraps onto more rows at phone width', async () => {
    const rows = () =>
      new Set(
        [...document.querySelectorAll('li')].map((item) =>
          Math.round(item.getBoundingClientRect().top)
        )
      ).size
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Mosaic {...offline(logoStrip)} />)
    const desktopRows = rows()

    await atWidth(widths[0].width, widths[0].height)
    expect(rows()).toBeGreaterThan(desktopRows)
  })
})

describe('Mosaic accessibility', () => {
  it.each(widths)(
    'tiers has no axe violations at $name width',
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

  it.each(widths)(
    'logo-strip has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Mosaic {...offline(logoStrip)} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
