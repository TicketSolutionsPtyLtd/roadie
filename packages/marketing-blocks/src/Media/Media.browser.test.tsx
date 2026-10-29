import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { commands, page } from 'vitest/browser'

import { Media } from '.'
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

function Gallery() {
  return <Media preset='gallery' title='Our people' images={images} />
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

describe('Media gallery', () => {
  it.each([
    ['a phone', PHONE, 140],
    ['a desktop', DESKTOP, 220]
  ])('shows portrait 9:16 tiles on %s', async (_, size, width) => {
    await page.viewport(size.width, size.height)
    render(<Gallery />)

    expect(tile().width).toBe(width)
    expect(tile().height).toBeCloseTo((width * 16) / 9, 0)
    const img = screen
      .getByRole('img', { name: 'Photo 1 of a gig' })
      .getBoundingClientRect()
    expect([img.width, img.height]).toEqual([tile().width, tile().height])
  })

  it('keeps phone-sized tiles in a narrow column on a desktop', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <div style={{ width: 400 }}>
        <Gallery />
      </div>
    )

    expect(tile().width).toBe(140)
  })

  it('names each photo once, however many copies fill the width', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<Gallery />)

    await expect
      .poll(() => track().firstElementChild!.childElementCount)
      .toBeGreaterThan(1)
    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
    ).toEqual(images.map(({ alt }) => alt))
  })

  it('scrolls the photos past', async () => {
    render(<Gallery />)

    await expect
      .poll(() =>
        track()
          .getAnimations()
          .map((animation) => animation.playState)
      )
      .toEqual(['running'])
  })

  it('holds the photos still under reduced motion', async () => {
    await commands.reducedMotion(true)
    render(<Gallery />)

    await expect.poll(() => track().style.animationName).toBe('roadie-marquee')
    await expect.poll(() => track().getAnimations()).toEqual([])
    expect(getComputedStyle(track()).transform).toBe('none')
  })

  it('has no axe violations', async () => {
    const { container } = render(<Gallery />)

    expect(await axeViolations(container)).toEqual([])
  })
})
