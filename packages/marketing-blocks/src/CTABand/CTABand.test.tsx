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
  it('renders the studio CTA as a band with its photo and actions', () => {
    render(
      <CTABand
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
    expect(section).toHaveAttribute('data-variant', 'band')
    expect(section).toHaveAttribute('data-preset', 'band')
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

  it('renders talk to us centred without a photo', () => {
    render(
      <CTABand
        title='Talk to our team'
        body={<p>We’ll find the right setup for your venue.</p>}
        actions={actions.slice(0, 1)}
      />
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Talk to our team' }).parentElement
    ).toHaveClass('text-center')
    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveAttribute(
      'href',
      '/contact/sales'
    )
  })

  it('starts the copy beside a photo', () => {
    render(<CTABand title='Talk to our team' image={image} />)

    expect(
      screen.getByRole('heading', { name: 'Talk to our team' }).parentElement
    ).toHaveClass('text-start')
  })

  it.each([
    ['with a photo', image, 'center', 'text-center'],
    ['without a photo', undefined, 'start', 'text-start']
  ] as const)('lines the copy up as asked %s', (_, photo, align, expected) => {
    render(<CTABand title='Talk to our team' image={photo} align={align} />)

    expect(
      screen.getByRole('heading', { name: 'Talk to our team' }).parentElement
    ).toHaveClass(expected)
  })

  it('sets the title a step smaller at md', () => {
    const { rerender } = render(<CTABand title='Talk to our team' />)
    const heading = () =>
      screen.getByRole('heading', { name: 'Talk to our team' })
    expect(heading()).toHaveClass('text-display-prose-2')

    rerender(<CTABand title='Talk to our team' size='md' />)
    expect(heading()).toHaveClass('text-display-prose-3')
  })

  it('draws a band by default, and an inset panel when asked', () => {
    const { container, rerender } = render(<CTABand title='Talk to our team' />)
    const surface = () => container.querySelector('[data-slot=block-surface]')
    expect(surface()).toHaveAttribute('data-shape', 'band')

    rerender(<CTABand title='Talk to our team' inset />)
    expect(surface()).toHaveAttribute('data-shape', 'panel')
  })

  it('falls back to band with no preset', () => {
    render(<CTABand title='Sell more tickets' actions={actions} />)

    expect(
      screen.getByRole('region', { name: 'Sell more tickets' })
    ).toHaveAttribute('data-preset', 'band')
  })

  it('reports a click on an action', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <CTABand position={3} title='Talk to our team' actions={actions} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Create my event' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'cta-band',
      variant: 'band',
      preset: 'band',
      position: 3,
      label: 'Create my event',
      href: 'https://studio.oztix.com.au'
    })
  })

  it('renders without actions', () => {
    render(<CTABand title='Talk to our team' />)

    expect(
      screen.getByRole('region', { name: 'Talk to our team' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('sets its intent, and a raised panel by default', () => {
    const { container } = render(
      <CTABand intent='brand' title='Talk to our team' />
    )

    expect(container.querySelector('section')).toHaveAttribute(
      'data-intent',
      'brand'
    )
    expect(container.querySelector('[data-slot=block-surface]')).toHaveClass(
      'emphasis-raised'
    )
  })

  it.each(['subtler', 'subtle', 'strong', 'inverted'] as const)(
    'draws a %s panel when asked',
    (emphasis) => {
      const { container } = render(
        <CTABand emphasis={emphasis} title='Talk to our team' />
      )

      expect(container.querySelector('[data-slot=block-surface]')).toHaveClass(
        `emphasis-${emphasis}`
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
