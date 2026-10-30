import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CTABand } from '.'
import { MarketingBlocksProvider } from '../Provider'

const actions = [
  { label: 'Talk to us', href: '/contact/sales' },
  { label: 'Create my event', href: 'https://studio.oztix.com.au' }
]

const image = {
  src: '/brand/photography/04.webp',
  alt: 'A crowd with their hands up at a gig'
}

describe('CTABand', () => {
  it('renders the studio CTA as a split panel with its photo and actions', () => {
    render(
      <CTABand
        preset='with-photo'
        position={6}
        title='Explore an Oztix partnership'
        titleHighlight='partnership'
        description='We’re always excited to welcome new partners.'
        body={<p>Let’s start with a get-to-know-you conversation.</p>}
        actions={actions}
        image={image}
      />
    )

    const section = screen.getByRole('region', {
      name: 'Explore an Oztix partnership'
    })
    expect(section).toHaveAttribute('data-block', 'cta-band')
    expect(section).toHaveAttribute('data-variant', 'split')
    expect(section).toHaveAttribute('data-preset', 'with-photo')
    expect(section).toHaveAttribute('data-position', '6')
    expect(screen.getByText('partnership').closest('mark')).not.toBeNull()
    expect(
      screen.getByText('We’re always excited to welcome new partners.')
    ).toBeInTheDocument()
    expect(
      screen.getByText('Let’s start with a get-to-know-you conversation.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'A crowd with their hands up at a gig' })
    ).toHaveAttribute('src', '/brand/photography/04.webp')
    expect(
      screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    ).toEqual(['/contact/sales', 'https://studio.oztix.com.au'])
  })

  it('renders talk to us centred, without a photo even when given one', () => {
    render(
      <CTABand
        preset='centred'
        title='Talk to our team'
        body={<p>We’ll find the right setup for your venue.</p>}
        actions={actions.slice(0, 1)}
        image={image}
      />
    )

    const section = screen.getByRole('region', { name: 'Talk to our team' })
    expect(section).toHaveAttribute('data-variant', 'centred')
    expect(section).toHaveAttribute('data-preset', 'centred')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveAttribute(
      'href',
      '/contact/sales'
    )
  })

  it('falls back to the studio CTA with no preset', () => {
    render(<CTABand title='Sell more tickets' actions={actions} />)

    expect(
      screen.getByRole('region', { name: 'Sell more tickets' })
    ).toHaveAttribute('data-preset', 'with-photo')
  })

  it('reports a click on an action', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <CTABand
          preset='centred'
          position={3}
          title='Talk to our team'
          actions={actions}
        />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Create my event' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'cta-band',
      variant: 'centred',
      preset: 'centred',
      position: 3,
      label: 'Create my event',
      href: 'https://studio.oztix.com.au'
    })
  })

  it('renders without actions', () => {
    render(<CTABand preset='centred' title='Talk to our team' />)

    expect(
      screen.getByRole('region', { name: 'Talk to our team' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('sets its intent, and a raised panel by default', () => {
    const { container } = render(
      <CTABand preset='centred' intent='brand' title='Talk to our team' />
    )

    expect(container.querySelector('section')).toHaveAttribute(
      'data-intent',
      'brand'
    )
    expect(container.querySelector('[data-slot=cta-band-panel]')).toHaveClass(
      'emphasis-raised'
    )
  })

  it.each(['subtle', 'strong', 'inverted'] as const)(
    'draws a %s panel when asked',
    (emphasis) => {
      const { container } = render(
        <CTABand emphasis={emphasis} title='Talk to our team' />
      )

      expect(container.querySelector('[data-slot=cta-band-panel]')).toHaveClass(
        `emphasis-${emphasis}`
      )
    }
  )

  it.each([
    [undefined, 'intent-accent'],
    ['brand', 'intent-neutral'],
    ['accent', 'intent-neutral']
  ] as const)(
    'sets the strong action apart from a strong %s panel',
    (intent, actionIntent) => {
      render(
        <CTABand
          emphasis='strong'
          intent={intent}
          title='Talk to our team'
          actions={actions}
        />
      )

      expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveClass(
        actionIntent
      )
    }
  )

  it('gives the strong action the block’s intent on other panels', () => {
    render(
      <CTABand intent='brand' title='Talk to our team' actions={actions} />
    )

    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveClass(
      'intent-brand'
    )
  })
})
