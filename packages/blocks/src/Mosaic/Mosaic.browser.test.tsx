import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, onTestFinished } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Mosaic, type MosaicProps } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  centreOf,
  fontSizeOf,
  photo,
  textAlignOf,
  widths,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'
import { partnerTiles } from './fixtures'

const MID = { name: 'mid', width: 640, height: 900 } as const

withBrowserPage()

describeBlockFrame('mosaic', 'tiles', Mosaic as ComponentType<never>, {
  tiles: [{ title: 'Kazoo Hollow Room' }]
})

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

describe('Mosaic tiles layout', () => {
  // Two columns or four, never three, so tiles that add up to four columns fill every row.
  it.each([390, 640, 768, 900, 1024, 1280])(
    'fills every row of an md and two sm tiles at %ipx',
    async (width) => {
      await atWidth(width, 900)
      const square = offline(partnerTiles).tiles[1]!
      render(
        <Mosaic
          {...partnerTiles}
          tiles={[{ ...square, size: 'md' }, square, square]}
          logoTile={undefined}
        />
      )

      const list = document.querySelector('ul')!.getBoundingClientRect()
      const gap = parseFloat(
        getComputedStyle(document.querySelector('ul')!).columnGap
      )
      const boxes = tiles()
      for (const top of new Set(boxes.map((box) => Math.round(box.top)))) {
        const row = boxes.filter((box) => Math.round(box.top) === top)
        const filled =
          row.reduce((sum, box) => sum + box.width, 0) + gap * (row.length - 1)
        expect(filled).toBeCloseTo(list.width, 0)
      }
    }
  )

  it.each([
    { ...widths[0], columns: 2 },
    { ...MID, columns: 2 },
    { ...widths[1], columns: 4 }
  ])(
    'fits $columns columns at $name width',
    async ({ width, height, columns: expected }) => {
      await atWidth(width, height)
      render(<Mosaic {...offline(partnerTiles)} />)

      const [featured, square] = tiles()
      expect(columns()).toBe(expected)
      expect(featured!.width).toBeGreaterThan(square!.width * 2)
      expect(featured!.height).toBeCloseTo(square!.height, 0)
      expect(square!.height).toBeCloseTo(square!.width, 0)
    }
  )

  it.each([1, 2])(
    'keeps %i tiles at the four-column size at desktop width',
    async (count) => {
      await atWidth(DESKTOP.width, DESKTOP.height)
      const square = offline(partnerTiles).tiles[1]!
      render(
        <Mosaic
          {...partnerTiles}
          tiles={Array.from({ length: count }, () => square)}
          logoTile={undefined}
        />
      )

      const list = document.querySelector('ul')!.getBoundingClientRect()
      const gap = parseFloat(
        getComputedStyle(document.querySelector('ul')!).columnGap
      )
      for (const tile of tiles())
        expect(tile.width).toBeCloseTo((list.width - gap * 3) / 4, 0)
    }
  )

  it.each([
    ['a desktop', DESKTOP],
    ['a phone', widths[0]]
  ])(
    'mixes sm, md, and lg tiles one row tall, lg across the full row, on %s',
    async (_, { width, height }) => {
      await atWidth(width, height)
      const square = offline(partnerTiles).tiles[1]!
      render(
        <Mosaic
          {...partnerTiles}
          tiles={[
            { ...square, size: 'lg' },
            { ...square, size: 'md' },
            square,
            { ...square, size: 'sm' }
          ]}
          logoTile={undefined}
        />
      )

      const list = document.querySelector('ul')!.getBoundingClientRect()
      const gap = parseFloat(
        getComputedStyle(document.querySelector('ul')!).columnGap
      )
      const [lg, md, sm] = tiles()
      expect(lg!.width).toBeCloseTo(list.width, 0)
      expect(md!.width).toBeCloseTo(sm!.width * 2 + gap, 0)
      for (const tile of [lg!, md!]) {
        expect(tile.height).toBeCloseTo(sm!.height, 0)
      }
      expect(sm!.height).toBeCloseTo(sm!.width, 0)
    }
  )

  it('packs a square partner into the gap a wide tile leaves', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiles).tiles
    render(
      <Mosaic
        {...partnerTiles}
        tiles={[featured!, square!, featured!, square!]}
        logoTile={undefined}
      />
    )

    const [first, , wide, last] = tiles()
    expect(Math.round(last!.top)).toBe(Math.round(first!.top))
    expect(wide!.top).toBeGreaterThan(first!.bottom)
  })
})

describe('Mosaic tiles labels', () => {
  it('sets a level on one light line on a phone, as on the website', async () => {
    await atWidth(widths[0].width, widths[0].height)
    render(<Mosaic {...offline(partnerTiles)} />)

    const label = screen.getByText('Category partner')
    const style = getComputedStyle(label)
    expect(Number(style.fontWeight)).toBeLessThanOrEqual(600)
    expect(label.getBoundingClientRect().height).toBeLessThan(
      parseFloat(style.lineHeight) * 1.5 + parseFloat(style.paddingTop) * 2
    )
  })

  it('keeps a long unbroken name inside its block', async () => {
    await atWidth(widths[0].width, widths[0].height)
    const { container } = render(
      <Mosaic
        {...offline(partnerTiles)}
        tiles={[
          {
            title: 'Supercalifragilisticexpialidociousproductions',
            description: 'Supercalifragilisticexpialidociouspartner',
            image: photo('')
          },
          ...offline(partnerTiles).tiles
        ]}
      />
    )

    const section = container.querySelector('section')!
    for (const item of container.querySelectorAll('li'))
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(
        section.getBoundingClientRect().right
      )
  })
})

describe('Mosaic photos', () => {
  it('fills each tile with its photo whatever shape the photo is', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiles).tiles
    render(
      <Mosaic
        {...partnerTiles}
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
        {...partnerTiles}
        tiles={[{ title: 'Kazoo Hollow Room', image: photo('') }]}
        logoTile={undefined}
      />
    )

    const name = screen.getByText('Kazoo Hollow Room').getBoundingClientRect()
    expect(name.width).toBeGreaterThan(40)
    expect(name.height).toBeGreaterThan(16)
  })
  // Light text over the photo's dark shade, whatever the page's mode.
  const lightness = (colour: string) => {
    const [r, g, b] = colour.match(/[\d.]+/g)!.map(Number)
    return colour.startsWith('oklch') ? r! : (r! + g! + b!) / 765
  }

  it.each(MODES)('set their name light over the photo in %s mode', (mode) => {
    setMode(mode)
    onTestFinished(() => setMode('light'))
    render(
      <Mosaic
        {...partnerTiles}
        tiles={[{ title: 'Kazoo Hollow Room', image: photo('') }]}
        logoTile={undefined}
      />
    )

    expect(
      lightness(getComputedStyle(screen.getByText('Kazoo Hollow Room')).color)
    ).toBeGreaterThan(0.8)
  })

  it.each(MODES)(
    'draw the logo tile dark in %s mode, for light logos',
    (mode) => {
      setMode(mode)
      onTestFinished(() => setMode('light'))
      render(<Mosaic {...offline(partnerTiles)} />)

      const tile = screen
        .getByRole('heading', { name: 'Also supporting' })
        .closest('li')!
      expect(lightness(getComputedStyle(tile).backgroundColor)).toBeLessThan(
        0.4
      )
    }
  )
})

describe('Mosaic logo tile', () => {
  it('centres its title over the logos', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Mosaic {...offline(partnerTiles)} />)

    const title = screen.getByRole('heading', { name: 'Also supporting' })
    expect(
      Math.abs(centreOf(title) - centreOf(title.closest('li')!))
    ).toBeLessThan(2)
  })
})

describe('Mosaic align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('starts the tiles heading by default, and centres it when asked', () => {
    const { rerender } = render(<Mosaic {...offline(partnerTiles)} />)
    expect(textAlignOf(heading())).toBe('start')

    rerender(<Mosaic {...offline(partnerTiles)} align='center' />)
    expect(textAlignOf(heading())).toBe('center')
  })

  it('sets the title smaller at md, and again at sm', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<Mosaic {...offline(partnerTiles)} />)
    const large = fontSizeOf(heading())

    rerender(<Mosaic {...offline(partnerTiles)} size='md' />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<Mosaic {...offline(partnerTiles)} size='sm' />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })
})

describe('Mosaic accessibility', () => {
  it.each(widths)(
    'tiles has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Mosaic {...offline(partnerTiles)} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})

const INTENTS = [
  undefined,
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
] as const

describe('Mosaic contrast', () => {
  afterEach(() => setMode('light'))

  it.each(
    MODES.flatMap((mode) =>
      INTENTS.map((intent) => ({
        mode,
        intent: intent ?? 'none',
        props: { intent }
      }))
    )
  )(
    'keeps tile labels and heading readable in $mode mode, intent $intent',
    async ({ mode, props }) => {
      setMode(mode)
      render(
        <div className='bg-normal'>
          <Mosaic {...offline(partnerTiles)} {...props} />
        </div>
      )

      expect(
        textContrast(screen.getByRole('heading', { level: 2 }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      expect(
        textContrast(screen.getByText(partnerTiles.description))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      for (const tile of partnerTiles.tiles)
        expect(
          textContrast(screen.getByText(tile.description)),
          tile.description
        ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
    }
  )

  it.each(
    MODES.flatMap((mode) =>
      (['subtler', 'subtle', 'normal', 'raised'] as const).flatMap((emphasis) =>
        INTENTS.map((intent) => ({
          mode,
          emphasis,
          intent: intent ?? 'none',
          props: { intent }
        }))
      )
    )
  )(
    'keeps the heading, description and action readable on a $emphasis surface in $mode mode, intent $intent',
    async ({ mode, emphasis, props }) => {
      setMode(mode)
      render(
        <Mosaic
          {...offline(partnerTiles)}
          {...props}
          emphasis={emphasis}
          description='Partners across the country.'
          actions={[{ label: 'Become a partner', href: '/partners' }]}
        />
      )

      expect(
        textContrast(screen.getByRole('heading', { level: 2 }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      expect(
        textContrast(screen.getByText('Partners across the country.'))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      expect(
        textContrast(screen.getByRole('link', { name: 'Become a partner' }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
    }
  )

  it('has no axe violations with linked tiles', async () => {
    const { container } = render(
      <main>
        <Mosaic
          {...offline(partnerTiles)}
          intent='brand'
          tiles={offline(partnerTiles).tiles.map((tile) => ({
            ...tile,
            href: '/partners'
          }))}
        />
      </main>
    )

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('Mosaic link hover', () => {
  const linkedTiles = () => {
    const [first, second] = offline(partnerTiles).tiles
    return [{ ...first!, href: '/partners' }, second!]
  }
  const photoScale = (tile: Element) =>
    getComputedStyle(tile.querySelector('img')!).scale

  it('scales a linked tile photo on hover, and leaves an unlinked one', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Mosaic {...partnerTiles} tiles={linkedTiles()} logoTile={undefined} />
    )
    const [linked, plain] = document.querySelectorAll('li')

    await userEvent.hover(linked!)
    await expect.poll(() => photoScale(linked!)).toBe('1.05')
    await userEvent.hover(plain!)
    await expect.poll(() => photoScale(plain!)).toBe('none')
  })

  it('keeps the photo still with reduced motion', async () => {
    await commands.reducedMotion(true)
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Mosaic {...partnerTiles} tiles={linkedTiles()} logoTile={undefined} />
    )
    const [linked] = document.querySelectorAll('li')

    await userEvent.hover(linked!)
    expect(photoScale(linked!)).toBe('none')
  })
})
