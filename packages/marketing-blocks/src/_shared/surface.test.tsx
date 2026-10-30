import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BlockHeading, titleStep } from './BlockHeading'
import { BlockRoot } from './BlockRoot'
import { BlockSurface } from './BlockSurface'
import { emphasisClass } from './surface'

describe('block intent and emphasis', () => {
  it('names the intent a block sets, so its children inherit it', () => {
    render(
      <BlockRoot
        block='cta-band'
        variant='centred'
        preset='centred'
        intent='brand'
        aria-label='Talk to us'
      />
    )

    const section = screen.getByRole('region', { name: 'Talk to us' })
    expect(section).toHaveAttribute('data-intent', 'brand')
    expect(section).toHaveClass('intent-brand')
  })

  it('leaves the intent to the page when a block sets none', () => {
    render(
      <BlockRoot
        block='faq'
        variant='accordion'
        preset='accordion'
        aria-label='FAQ'
      />
    )

    const section = screen.getByRole('region', { name: 'FAQ' })
    expect(section).not.toHaveAttribute('data-intent')
    expect(section.className).not.toMatch(/\bintent-/)
  })

  it('marks highlighted words in the block intent, or brand-secondary without one', () => {
    const { rerender } = render(
      <BlockHeading title='Sell more tickets' titleHighlight='more' />
    )
    expect(screen.getByText('more').closest('mark')).toHaveClass(
      'intent-brand-secondary'
    )

    rerender(
      <BlockHeading
        title='Sell more tickets'
        titleHighlight='more'
        intent='info'
      />
    )
    expect(screen.getByText('more').closest('mark')).toHaveClass('intent-info')
  })

  it('maps each emphasis to its Roadie preset, and none to no surface', () => {
    expect(emphasisClass('raised')).toBe('emphasis-raised')
    expect(emphasisClass('strong')).toBe('emphasis-strong')
    expect(emphasisClass(undefined)).toBe('')
  })
})

describe('BlockSurface', () => {
  it('sits the content on the page without an emphasis', () => {
    const { container } = render(
      <BlockSurface width='4xl'>Content</BlockSurface>
    )
    expect(
      container.querySelector('[data-slot=block-surface]')
    ).not.toBeInTheDocument()
  })

  it('draws a full-width band by default', () => {
    const { container } = render(
      <BlockSurface emphasis='subtle'>Content</BlockSurface>
    )
    const surface = container.querySelector('[data-slot=block-surface]')
    expect(surface).toHaveAttribute('data-shape', 'band')
    expect(surface).toHaveClass('emphasis-subtle')
  })

  it('draws an inset panel when asked', () => {
    const { container } = render(
      <BlockSurface emphasis='raised' inset>
        Content
      </BlockSurface>
    )
    const surface = container.querySelector('[data-slot=block-surface]')
    expect(surface).toHaveAttribute('data-shape', 'panel')
    expect(surface).toHaveClass('emphasis-raised')
  })

  it('pads a backdrop as a surface, with no emphasis', () => {
    const { container } = render(
      <BlockSurface backdrop={<img alt='' />}>Content</BlockSurface>
    )
    const surface = container.querySelector('[data-slot=block-surface]')
    expect(surface).toHaveAttribute('data-shape', 'band')
    expect(surface?.querySelector('img')).toBeInTheDocument()
  })
})

describe('titleStep', () => {
  it('keeps the preset step at lg, drops one at md and two at sm, down to 6', () => {
    expect(titleStep(2, undefined)).toBe(2)
    expect(titleStep(2, 'lg')).toBe(2)
    expect(titleStep(2, 'md')).toBe(3)
    expect(titleStep(2, 'sm')).toBe(4)
    expect(titleStep(5, 'sm')).toBe(6)
    expect(titleStep(6, 'md')).toBe(6)
  })
})
