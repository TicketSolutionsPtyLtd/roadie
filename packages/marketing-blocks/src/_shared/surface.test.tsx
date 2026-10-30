import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BlockHeading } from './BlockHeading'
import { BlockRoot } from './BlockRoot'
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
