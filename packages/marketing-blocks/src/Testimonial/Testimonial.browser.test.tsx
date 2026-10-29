import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Testimonial } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  atWidth,
  axeViolations,
  useStylesheet,
  widths
} from '../_shared/testUtils'
import { quote } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterEach(() => cleanup())
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})

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

      const photo = rectOf(
        screen.getByRole('img', { name: 'Portrait of Mia Tran' }).parentElement!
      )
      const name = rectOf(screen.getByText('Mia Tran'))
      expect(photo.width).toBeCloseTo(portrait, 0)
      expect(photo.height).toBeCloseTo(portrait, 0)
      expect(name.left).toBeGreaterThan(photo.right)
      expect(Math.round(name.top)).toBeGreaterThanOrEqual(Math.round(photo.top))
    }
  )

  it('centres the quote in a reading measure, with the background photo spanning the block', async () => {
    await atWidth(1280, 800)
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
