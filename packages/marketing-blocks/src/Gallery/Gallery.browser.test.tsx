import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { Gallery, type GalleryPreset } from '.'
import { MarketingBlocksProvider } from '../Provider'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  photo,
  withBrowserPage
} from '../_test/browser'

withBrowserPage()

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
    ['marquee', 'a desktop', DESKTOP, 220]
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

  it('steps the carousel with its controls and reports each step', async () => {
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
})
