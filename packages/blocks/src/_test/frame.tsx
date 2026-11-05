import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { DESKTOP, centreOf } from './browser'

const TITLE = 'Why Oztix'
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
