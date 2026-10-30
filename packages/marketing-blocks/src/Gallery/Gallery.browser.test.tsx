import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Gallery, type GalleryPreset } from '.'
import { MarketingBlocksProvider } from '../Provider'
import type { BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  photo,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'

withBrowserPage()

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
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Gallery
          preset='carousel'
          title='Our people'
          images={[...images, ...images]}
        />
      </MarketingBlocksProvider>
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
})
