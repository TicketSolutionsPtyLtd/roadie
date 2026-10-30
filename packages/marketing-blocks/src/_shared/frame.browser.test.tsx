import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { CTABand } from '../CTABand'
import { CardGrid } from '../CardGrid'
import { FAQ } from '../FAQ'
import { Gallery } from '../Gallery'
import { Hero } from '../Hero'
import { Mosaic } from '../Mosaic'
import { RichText } from '../RichText'
import { Split } from '../Split'
import { Stats } from '../Stats'
import { Testimonial } from '../Testimonial'
import { DESKTOP, centreOf, photo, withBrowserPage } from '../_test/browser'

withBrowserPage()

const TITLE = 'Why Oztix'
const actions = [{ label: 'Talk to us', href: '/contact' }]

// Every block, at its first preset or one whose heading names the block, with the least it needs.
const BLOCKS: [
  string,
  string,
  ComponentType<never>,
  Record<string, unknown>
][] = [
  ['hero', 'title', Hero as ComponentType<never>, { preset: 'title' }],
  ['rich-text', 'statement', RichText as ComponentType<never>, {}],
  [
    'card-grid',
    'cards',
    CardGrid as ComponentType<never>,
    { items: [{ title: 'Fast payouts' }] }
  ],
  [
    'split',
    'media-text',
    Split as ComponentType<never>,
    { image: photo('A crowd') }
  ],
  [
    'stats',
    'figures',
    Stats as ComponentType<never>,
    { items: [{ value: '7 million+', label: 'tickets sold' }] }
  ],
  [
    'mosaic',
    'tiers',
    Mosaic as ComponentType<never>,
    { tiles: [{ title: 'Kazoo Hollow Room' }] }
  ],
  [
    'testimonial',
    'quote',
    Testimonial as ComponentType<never>,
    { quotes: [{ quote: 'Brilliant.', person: { name: 'Mia Tran' } }] }
  ],
  ['cta-band', 'band', CTABand as ComponentType<never>, {}],
  [
    'gallery',
    'wrap',
    Gallery as ComponentType<never>,
    { preset: 'wrap', images: [photo('A crowd')] }
  ],
  [
    'faq',
    'accordion',
    FAQ as ComponentType<never>,
    { items: [{ question: 'Does it cost anything?', answer: <p>No.</p> }] }
  ]
]

function renderBlock(
  Block: ComponentType<never>,
  props: Record<string, unknown>
) {
  const Rendered = Block as ComponentType<Record<string, unknown>>
  return render(<Rendered title={TITLE} actions={actions} {...props} />)
}

describe.each(BLOCKS)('The %s block frame', (block, preset, Block, props) => {
  it('names its section by its heading, with its block and preset', () => {
    renderBlock(Block, props)

    const section = screen.getByRole('region', {
      name: TITLE
    })
    const root = section.closest('[data-block]')!
    expect(root).toHaveAttribute('data-block', block)
    expect(root).toHaveAttribute('data-preset', preset)
  })

  it.each(['start', 'center'] as const)(
    'lines its actions up with a %s-aligned heading',
    async (align) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      renderBlock(Block, { ...props, align })

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
