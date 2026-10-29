import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Testimonial } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  photo,
  widths,
  withBrowserPage
} from '../_test/browser'
import { quote as fixture } from './fixtures'

withBrowserPage()

const quote = {
  ...fixture,
  person: { ...fixture.person, image: photo('Portrait of Mia Tran', 128, 128) },
  organisation: {
    ...fixture.organisation,
    logo: photo('Thimble Orbit Presents logo', 120, 40)
  },
  backgroundImage: photo('', 1600, 900)
}

const rectOf = (element: Element) => element.getBoundingClientRect()

describe('Testimonial quote layout', () => {
  it.each([
    { ...widths[0], portrait: 80 },
    { ...widths[1], portrait: 120 }
  ])(
    'sets a $portrait px portrait beside the name at $name width',
    async ({ width, height, portrait }) => {
      await atWidth(width, height)
      render(<Testimonial {...quote} />)

      const photoBox = rectOf(
        screen.getByRole('img', { name: 'Portrait of Mia Tran' }).parentElement!
      )
      const name = rectOf(screen.getByText('Mia Tran'))
      expect(photoBox.width).toBeCloseTo(portrait, 0)
      expect(photoBox.height).toBeCloseTo(portrait, 0)
      expect(name.left).toBeGreaterThan(photoBox.right)
      expect(Math.round(name.top)).toBeGreaterThanOrEqual(
        Math.round(photoBox.top)
      )
    }
  )

  it('centres the quote in a reading measure, with the background photo spanning the block', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<Testimonial {...quote} />)

    const section = rectOf(container.querySelector('section')!)
    const blockquote = rectOf(screen.getByRole('blockquote'))
    const background = rectOf(
      container.querySelector(`img[src="${quote.backgroundImage.src}"]`)!
    )
    expect(blockquote.width).toBeLessThanOrEqual(896)
    expect(blockquote.left - section.left).toBeCloseTo(
      section.right - blockquote.right,
      0
    )
    expect(background.width).toBeCloseTo(section.width, 0)
    expect(background.height).toBeCloseTo(section.height, 0)
  })

  it('crops a sized portrait and background to their frames', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(
      <Testimonial
        {...quote}
        person={{
          ...quote.person,
          image: photo('Portrait of Mia Tran', 400, 800)
        }}
        backgroundImage={photo('', 400, 400)}
      />
    )

    const portrait = screen.getByRole('img', { name: 'Portrait of Mia Tran' })
    const frame = rectOf(portrait.parentElement!)
    expect(rectOf(portrait).height).toBeLessThanOrEqual(frame.height)
    expect(rectOf(portrait).width).toBeCloseTo(rectOf(portrait).height, 0)

    const section = rectOf(container.querySelector('section')!)
    const background = rectOf(container.querySelector('section > img')!)
    expect(background.width).toBeCloseTo(section.width, 0)
    expect(background.height).toBeCloseTo(section.height, 0)
  })

  it('keeps a large organisation logo to a small mark under the role', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Testimonial
        {...quote}
        organisation={{
          name: 'Thimble Orbit Presents',
          logo: photo('Thimble Orbit Presents logo', 400, 200)
        }}
      />
    )

    const logo = rectOf(
      screen.getByRole('img', { name: 'Thimble Orbit Presents logo' })
    )
    expect(logo.height).toBeLessThanOrEqual(48)
    expect(logo.width).toBeCloseTo(logo.height * 2, 0)
  })

  it('pads only inside a background photo, and sits flush without one', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container, rerender } = render(<Testimonial {...quote} />)
    const gapAbove = () =>
      rectOf(screen.getByRole('heading', { level: 2 })).top -
      rectOf(container.querySelector('section')!).top

    expect(gapAbove()).toBeGreaterThan(0)

    rerender(<Testimonial {...quote} backgroundImage={undefined} />)
    expect(gapAbove()).toBe(0)
  })
})

describe('Testimonial accessibility', () => {
  it.each(widths)(
    'quote has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Testimonial {...quote} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
