import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Gallery, type GalleryPreset } from '.'
import { BlocksProvider } from '../Provider'
import type { BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  fontSizeOf,
  photo,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

describeBlockFrame('gallery', 'wrap', Gallery as ComponentType<never>, {
  preset: 'wrap',
  images: [photo('A crowd')]
})

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
] as const satisfies readonly BlockIntent[]

const MID = { width: 640, height: 800 }

const images = Array.from({ length: 6 }, (_, index) =>
  photo(`Photo ${index + 1} of a gig`)
)

function Photos({ preset = 'marquee' }: { preset?: GalleryPreset }) {
  return <Gallery preset={preset} title='Our people' images={images} />
}

function tile() {
  return screen
    .getByRole('img', { name: 'Photo 1 of a gig' })
    .parentElement!.getBoundingClientRect()
}

function track() {
  return document.querySelector<HTMLElement>('[data-slot=marquee]')!
    .lastElementChild as HTMLElement
}

describe('Gallery', () => {
  it.each([
    ['carousel', 'a phone', PHONE, 140],
    ['carousel', 'a desktop', DESKTOP, 220],
    ['marquee', 'a phone', PHONE, 140],
    ['marquee', 'a desktop', DESKTOP, 220],
    ['carousel', 'a mid-width screen', MID, 180],
    ['marquee', 'a mid-width screen', MID, 180]
  ] as const)(
    'shows the %s in portrait 9:16 tiles on %s',
    async (preset, _, size, width) => {
      await page.viewport(size.width, size.height)
      render(<Photos preset={preset} />)

      expect(tile().width).toBe(width)
      expect(tile().height).toBeCloseTo((width * 16) / 9, 0)
      const img = screen
        .getByRole('img', { name: 'Photo 1 of a gig' })
        .getBoundingClientRect()
      expect([img.width, img.height]).toEqual([tile().width, tile().height])
    }
  )

  it.each(['carousel', 'marquee'] as const)(
    'keeps the %s’s tiles phone-sized in a narrow column on a desktop',
    async (preset) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(
        <div style={{ width: 400 }}>
          <Photos preset={preset} />
        </div>
      )

      expect(tile().width).toBe(140)
    }
  )

  it('names each marquee photo once, however many copies fill the width', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<Photos />)

    await expect
      .poll(() => track().firstElementChild!.childElementCount)
      .toBeGreaterThan(1)
    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
    ).toEqual(images.map(({ alt }) => alt))
  })

  it('scrolls the marquee photos past', async () => {
    render(<Photos />)

    await expect
      .poll(() =>
        track()
          .getAnimations()
          .map((animation) => animation.playState)
      )
      .toEqual(['running'])
  })

  it('holds the marquee photos still while hovered', async () => {
    render(<Photos />)
    await expect
      .poll(() =>
        track()
          .getAnimations()
          .map(({ playState }) => playState)
      )
      .toEqual(['running'])

    onTestFinished(() => commands.parkPointer())
    await userEvent.hover(document.querySelector('[data-slot=marquee]')!)

    await expect
      .poll(() =>
        track()
          .getAnimations()
          .map(({ playState }) => playState)
      )
      .toEqual(['paused'])
  })

  it('holds the marquee photos still under reduced motion', async () => {
    await commands.reducedMotion(true)
    render(<Photos />)

    await expect.poll(() => track().style.animationName).toBe('roadie-marquee')
    await expect.poll(() => track().getAnimations()).toEqual([])
    expect(getComputedStyle(track()).transform).toBe('none')
  })

  it.each(['carousel', 'marquee'] as const)(
    'has no axe violations as a %s',
    async (preset) => {
      const { container } = render(<Photos preset={preset} />)

      expect(await axeViolations(container)).toEqual([])
    }
  )

  it('steps the carousel with its next control and reports the click', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Gallery
          preset='carousel'
          title='Our people'
          images={[...images, ...images]}
        />
      </BlocksProvider>
    )
    const firstSlide = () => screen.getAllByRole('group', { hidden: true })[0]!

    const next = await screen.findByRole('button', { name: 'Next slide' })
    expect(
      screen.getByRole('button', { name: 'Previous slide' })
    ).toBeDisabled()
    expect(firstSlide()).not.toHaveAttribute('inert')
    await userEvent.click(next)

    await expect.poll(() => firstSlide().hasAttribute('inert')).toBe(true)
    expect(onBlockEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'click',
        block: 'gallery',
        preset: 'carousel',
        label: 'Next slide'
      })
    )
  })

  it(
    'steps and swipes the carousel in a narrow column',
    { timeout: 20_000 },
    async () => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(
        <div style={{ width: 450 }}>
          <Gallery
            preset='carousel'
            title='Our people'
            images={[...images, images[0]!]}
          />
        </div>
      )
      const settle = { timeout: 5_000 }
      const firstTile = () =>
        screen
          .getAllByRole('group', { hidden: true })[0]!
          .getBoundingClientRect()
      // Polls until the tile stops moving, so a slow frame never reads it mid-scroll.
      let last = Number.NaN
      const restingLeft = () => {
        const left = firstTile().left
        const resting = Math.abs(left - last) < 0.5
        last = left
        return resting ? left : Number.NaN
      }
      let origin = Number.NaN
      const restsAtOrigin = () =>
        expect.poll(() => restingLeft() - origin, settle).toBeCloseTo(0, 0)
      const restsOutOfView = () =>
        expect
          .poll(() => restingLeft() < origin - firstTile().width, settle)
          .toBe(true)

      const next = await screen.findByRole(
        'button',
        { name: 'Next slide' },
        settle
      )
      const previous = screen.getByRole('button', { name: 'Previous slide' })
      expect(previous).toBeVisible()
      await expect.poll(restingLeft, settle).not.toBeNaN()
      origin = firstTile().left

      await userEvent.click(next)
      await restsOutOfView()

      await userEvent.click(previous)
      await restsAtOrigin()

      const tile = firstTile()
      const y = tile.top + tile.height / 2
      const x = origin + 200
      await commands.pointer([
        { type: 'move', x, y },
        { type: 'down' },
        { type: 'move', x: x - 100, y, steps: 10 },
        { type: 'move', x: x - 200, y, steps: 10 },
        { type: 'move', x: x - 300, y, steps: 10 },
        { type: 'up' }
      ])
      await restsOutOfView()
    }
  )

  it.each(
    MODES.flatMap((theme) => INTENTS.map((intent) => [intent, theme] as const))
  )(
    'keeps its heading readable with a %s intent in %s mode',
    async (intent, theme) => {
      setMode(theme)
      onTestFinished(() => setMode('light'))
      const { container } = render(
        <Gallery
          preset='marquee'
          intent={intent}
          title='Our people'
          titleHighlight='people'
          description='From festivals to local venues.'
          images={images}
        />
      )

      expect(
        textContrast(screen.getByRole('heading', { level: 2 }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      expect(textContrast(screen.getByText('people'))).toBeGreaterThanOrEqual(
        MINIMUM_LC.large
      )
      expect(
        textContrast(screen.getByText('From festivals to local venues.'))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      expect(await axeViolations(container)).toEqual([])
    }
  )

  it.each(
    MODES.flatMap((theme) =>
      (['subtler', 'subtle', 'normal', 'raised'] as const).flatMap((emphasis) =>
        INTENTS.map((intent) => [emphasis, intent, theme] as const)
      )
    )
  )(
    'keeps its text readable on a %s %s surface in %s mode',
    async (emphasis, intent, theme) => {
      setMode(theme)
      onTestFinished(() => setMode('light'))
      const { container } = render(
        <Gallery
          preset='marquee'
          intent={intent}
          emphasis={emphasis}
          title='Our people'
          titleHighlight='people'
          description='From festivals to local venues.'
          images={images}
          actions={[{ label: 'Become a partner', href: '/partners' }]}
        />
      )

      expect(
        textContrast(screen.getByRole('heading', { level: 2 }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      expect(textContrast(screen.getByText('people'))).toBeGreaterThanOrEqual(
        MINIMUM_LC.large
      )
      expect(
        textContrast(screen.getByText('From festivals to local venues.'))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      expect(
        textContrast(screen.getByRole('link', { name: 'Become a partner' }))
      ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
      expect(await axeViolations(container)).toEqual([])
    }
  )
})

describe('Gallery controls', () => {
  const marqueeBox = () =>
    document.querySelector('[data-slot=marquee]')!.getBoundingClientRect()

  it('gives the carousel heading the row, with its controls at the bottom edge', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Gallery
        preset='carousel'
        title='Join thousands of partners who trust Oztix'
        description='From festivals to local venues, we help event organisers sell more tickets.'
        images={images}
      />
    )

    const header = document
      .querySelector('[data-slot=carousel-header]')!
      .getBoundingClientRect()
    const heading = screen
      .getByRole('heading', { level: 2 })
      .parentElement!.getBoundingClientRect()
    const next = screen
      .getByRole('button', { name: 'Next slide' })
      .getBoundingClientRect()
    expect(heading.width).toBeGreaterThan(header.width * 0.7)
    expect(next.bottom).toBeCloseTo(heading.bottom, 0)
  })

  it.each([
    ['on the page', undefined],
    ['on a band', 'subtle']
  ] as const)(
    'puts the marquee’s pause control on the photos, %s',
    async (_, emphasis) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(
        <Gallery
          preset='marquee'
          emphasis={emphasis}
          title='Our people'
          images={images}
        />
      )

      const track = marqueeBox()
      const pause = screen
        .getByRole('button', { name: 'Pause gallery' })
        .getBoundingClientRect()
      expect(pause.top).toBeGreaterThan(track.top)
      expect(pause.bottom).toBeLessThan(track.bottom)
      expect(pause.right).toBeLessThan(track.right)
    }
  )
})

describe('Gallery align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it.each([
    { preset: 'carousel', align: undefined, expected: 'start' },
    { preset: 'marquee', align: undefined, expected: 'center' },
    { preset: 'carousel', align: 'center', expected: 'center' },
    { preset: 'marquee', align: 'start', expected: 'start' }
  ] as const)(
    'sets the $preset heading to the $expected, with align $align',
    ({ preset, align, expected }) => {
      render(
        <Gallery
          preset={preset}
          align={align}
          title='Our people'
          images={images}
        />
      )

      expect(textAlignOf(heading())).toBe(expected)
    }
  )

  it('sets the title smaller at md, and again at sm', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<Photos />)
    const large = fontSizeOf(heading())

    rerender(<Gallery title='Our people' images={images} size='md' />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<Gallery title='Our people' images={images} size='sm' />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })
})

describe('Gallery surfaces', () => {
  const marqueeBox = () =>
    document.querySelector('[data-slot=marquee]')!.getBoundingClientRect()
  // The padding box, inside any border the emphasis draws.
  const surfaceBox = () => {
    const surface = document.querySelector('[data-slot=block-surface]')!
    const { left } = surface.getBoundingClientRect()
    return {
      left: left + surface.clientLeft,
      right: left + surface.clientLeft + surface.clientWidth
    }
  }

  it('runs the marquee the full width of the block on the page', async () => {
    await page.viewport(1920, 900)
    const { container } = render(<Photos />)

    expect(marqueeBox().width).toBeCloseTo(
      container.querySelector('section')!.getBoundingClientRect().width,
      0
    )
  })

  it.each([
    ['a band', false],
    ['a contained panel', true]
  ])('runs the marquee edge to edge of %s', async (_, contained) => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Gallery
        preset='marquee'
        emphasis='subtle'
        contained={contained}
        title='Our people'
        images={images}
      />
    )

    expect(marqueeBox().left).toBeCloseTo(surfaceBox().left, 0)
    expect(marqueeBox().right).toBeCloseTo(surfaceBox().right, 0)
  })

  it('keeps the carousel inside the surface', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Gallery
        preset='carousel'
        emphasis='raised'
        contained
        title='Our people'
        images={images}
      />
    )

    const heading = screen
      .getByRole('heading', { level: 2 })
      .getBoundingClientRect()
    expect(heading.left).toBeGreaterThan(surfaceBox().left)
  })

  it.each([
    ['a band', false],
    ['a contained panel', true]
  ])(
    'runs the carousel edge to edge of %s, starting in line with the heading',
    async (_, contained) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(
        <Gallery
          preset='carousel'
          emphasis='subtle'
          contained={contained}
          title='Our people'
          images={images}
        />
      )

      const viewport = document
        .querySelector('[data-slot=carousel-content]')!
        .getBoundingClientRect()
      expect(viewport.left).toBeCloseTo(surfaceBox().left, 0)
      expect(viewport.right).toBeCloseTo(surfaceBox().right, 0)
      expect(tile().left).toBeCloseTo(
        screen.getByRole('heading', { level: 2 }).getBoundingClientRect().left,
        0
      )
    }
  )
})

describe('Gallery ratio', () => {
  const box = (name: string) =>
    screen.getByRole('img', { name }).getBoundingClientRect()

  it.each([
    ['portrait', 9 / 16],
    ['square', 1],
    ['landscape', 2]
  ] as const)('crops each %s tile to its ratio', async (ratio, expected) => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Gallery preset='wrap' ratio={ratio} title='Our people' images={images} />
    )

    const { width, height } = box('Photo 1 of a gig')
    expect(width / height).toBeCloseTo(expected, 1)
  })

  it.each([
    ['a phone', PHONE],
    ['a desktop', DESKTOP]
  ])(
    'sets natural images 48px tall in their own ratio, centred, on %s',
    async (_, size) => {
      await page.viewport(size.width, size.height)
      render(
        <Gallery
          preset='wrap'
          ratio='natural'
          title='Partners'
          images={[
            photo('Wide logo', 600, 100),
            photo('Square logo', 300, 300)
          ]}
        />
      )

      expect(box('Wide logo').height).toBeCloseTo(48, 0)
      expect(box('Wide logo').width).toBeCloseTo(288, 0)
      expect(box('Square logo').width).toBeCloseTo(48, 0)
      const list = document.querySelector('ul')!.getBoundingClientRect()
      const items = [...document.querySelectorAll('li')].map((item) =>
        item.getBoundingClientRect()
      )
      const left = Math.min(...items.map((item) => item.left)) - list.left
      const right = list.right - Math.max(...items.map((item) => item.right))
      expect(left).toBeCloseTo(right, 0)
      expect(textAlignOf(screen.getByRole('heading', { level: 2 }))).toBe(
        'center'
      )
    }
  )

  it('fits three 3:1 logos to a row at 640px', async () => {
    await page.viewport(MID.width, MID.height)
    render(
      <Gallery
        preset='wrap'
        ratio='natural'
        title='Partners'
        images={['A', 'B', 'C', 'D'].map((name) =>
          photo(`${name} logo`, 300, 100)
        )}
      />
    )

    const tops = [...document.querySelectorAll('li')].map((item) =>
      Math.round(item.getBoundingClientRect().top)
    )
    expect(tops.filter((top) => top === tops[0])).toHaveLength(3)
  })

  it('tints a linked natural image on hover', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <Gallery
        preset='wrap'
        ratio='natural'
        title='Partners'
        images={[
          { ...photo('Kerosene Pony Collective', 240, 80), href: '/partners' }
        ]}
      />
    )
    const link = screen.getByRole('link', { name: 'Kerosene Pony Collective' })
    const fill = () => getComputedStyle(link).backgroundColor
    const before = fill()

    await userEvent.hover(link)
    await expect.poll(fill).not.toBe(before)
  })

  it.each(['natural', 'portrait'] as const)(
    'has no axe violations with linked %s images',
    async (ratio) => {
      const { container } = render(
        <main>
          <Gallery
            preset='wrap'
            ratio={ratio}
            intent='brand'
            title='Partners'
            images={images.map((image) => ({ ...image, href: '/partners' }))}
          />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
