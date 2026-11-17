import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { DESKTOP, centreOf } from './browser'

const TITLE = 'Why Oztix'
const WIDE = { width: 1920, height: 1080 } as const
const MEASURE = 1440

function measureAt(width: number) {
  const inset = (width - MEASURE) / 2
  return { left: inset, right: width - inset }
}
const actions = [{ label: 'Talk to us', href: '/contact' }]

/** Checks the frame every block shares: its section named by its heading, its block and preset, and its actions lined up with the heading. */
export function describeBlockFrame(
  block: string,
  preset: string,
  Block: ComponentType<never>,
  props: Record<string, unknown> = {}
) {
  const Rendered = Block as ComponentType<Record<string, unknown>>
  const renderBlock = (extra: Record<string, unknown> = {}) =>
    render(<Rendered title={TITLE} actions={actions} {...props} {...extra} />)

  describe(`The ${block} block frame`, () => {
    it('keeps its content within the page’s measure on a band across a wide window', async () => {
      await page.viewport(WIDE.width, WIDE.height)
      const { container } = renderBlock({ emphasis: 'subtle' })

      const { left, right } = measureAt(WIDE.width)
      // A marquee or carousel runs past the measure on purpose; everything else stays inside it.
      const content = [
        ...container.querySelectorAll('h1, h2, h3, p, li, a, button')
      ].filter(
        (element) =>
          !element.closest(
            '[data-slot=marquee], [data-slot=carousel-content]'
          ) && element.getBoundingClientRect().width > 0
      )
      expect(content.length).toBeGreaterThan(0)
      for (const element of content) {
        const box = element.getBoundingClientRect()
        expect(box.left).toBeGreaterThanOrEqual(left - 0.5)
        expect(box.right).toBeLessThanOrEqual(right + 0.5)
      }
    })

    it('names its section by its heading, with its block and preset', () => {
      renderBlock()

      const root = screen
        .getByRole('region', { name: TITLE })
        .closest('[data-block]')!
      expect(root).toHaveAttribute('data-block', block)
      expect(root).toHaveAttribute('data-preset', preset)
    })

    it.each(['start', 'center'] as const)(
      'lines its actions up with a %s-aligned heading',
      async (align) => {
        await page.viewport(DESKTOP.width, DESKTOP.height)
        renderBlock({ align })

        const heading = screen.getByRole('heading', { name: TITLE })
        const link = screen.getByRole('link', { name: 'Talk to us' })
        if (align === 'center')
          expect(Math.abs(centreOf(link) - centreOf(heading))).toBeLessThan(2)
        else
          expect(link.getBoundingClientRect().left).toBeCloseTo(
            heading.getBoundingClientRect().left,
            0
          )
      }
    )
  })
}
