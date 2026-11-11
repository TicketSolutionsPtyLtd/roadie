import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CallToAction } from '.'
import { BlocksProvider } from '../Provider'
import { SPOT_ILLUSTRATIONS } from '../_shared/illustrations'

const actions = [
  { label: 'Talk to us', href: '/contact/sales' },
  { label: 'Create my event', href: 'https://studio.oztix.com.au' }
]

const image = {
  src: '/brand/photography/04.webp',
  alt: 'A crowd with their hands up at a gig'
}

describe('CallToAction', () => {
  it.each([
    [undefined, 'HighFive'],
    ['Ticket', 'Ticket']
  ] as const)(
    'draws the %s illustration by the photo as %s',
    (illustration, expected) => {
      const Expected = SPOT_ILLUSTRATIONS[expected]
      const { container: reference } = render(<Expected outline />)
      const { container } = render(
        <CallToAction
          title='Explore an Oztix partnership'
          image={image}
          illustration={illustration}
        />
      )

      expect(container.querySelector('svg')!.innerHTML).toBe(
        reference.querySelector('svg')!.innerHTML
      )
    }
  )

  it('renders the photo preset with its photo and actions', () => {
    render(
      <CallToAction
        preset='photo'
        position={6}
        title='Explore an Oztix partnership'
        highlight='partnership'
        description='We’re always excited to welcome new partners.'
        body={<p>Let’s start with a get-to-know-you conversation.</p>}
        actions={actions}
        image={image}
      />
    )

    const section = screen.getByRole('region', {
      name: 'Explore an Oztix partnership'
    })
    expect(section).toHaveAttribute('data-block', 'call-to-action')
    expect(section).toHaveAttribute('data-preset', 'photo')
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

  it('renders the centred preset without a photo, even when given one', () => {
    render(
      <CallToAction
        preset='centred'
        image={image}
        title='Talk to our team'
        body={<p>We’ll find the right setup for your venue.</p>}
        actions={actions.slice(0, 1)}
      />
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Talk to our team' })
    ).toHaveAttribute('data-preset', 'centred')
    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveAttribute(
      'href',
      '/contact/sales'
    )
  })

  it('draws photo on a contained panel by default, and on a band when asked', () => {
    const { container, rerender } = render(
      <CallToAction title='Talk to our team' />
    )
    const surface = () => container.querySelector('[data-slot=block-surface]')
    expect(surface()).toHaveAttribute('data-shape', 'panel')

    rerender(<CallToAction title='Talk to our team' contained={false} />)
    expect(surface()).toHaveAttribute('data-shape', 'band')
  })

  it('draws centred on a band by default, and a contained panel when asked', () => {
    const { container, rerender } = render(
      <CallToAction preset='centred' title='Talk to our team' />
    )
    const surface = () => container.querySelector('[data-slot=block-surface]')
    expect(surface()).toHaveAttribute('data-shape', 'band')

    rerender(
      <CallToAction preset='centred' title='Talk to our team' contained />
    )
    expect(surface()).toHaveAttribute('data-shape', 'panel')
  })

  it('falls back to photo with no preset', () => {
    render(<CallToAction title='Sell more tickets' actions={actions} />)

    expect(
      screen.getByRole('region', { name: 'Sell more tickets' })
    ).toHaveAttribute('data-preset', 'photo')
  })

  it('reports a click on an action', async () => {
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <CallToAction position={3} title='Talk to our team' actions={actions} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Create my event' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'call-to-action',
      preset: 'photo',
      position: 3,
      label: 'Create my event',
      href: 'https://studio.oztix.com.au'
    })
  })

  it('renders without actions', () => {
    render(<CallToAction title='Talk to our team' />)

    expect(
      screen.getByRole('region', { name: 'Talk to our team' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it.each(['photo', 'centred'] as const)(
    'sets its intent, and a raised panel by default, on %s',
    (preset) => {
      const { container } = render(
        <CallToAction preset={preset} intent='brand' title='Talk to our team' />
      )

      expect(container.querySelector('section')).toHaveAttribute(
        'data-intent',
        'brand'
      )
      expect(container.querySelector('[data-slot=block-surface]')).toHaveClass(
        'emphasis-raised'
      )
    }
  )

  it.each(['subtler', 'subtle', 'strong', 'inverted'] as const)(
    'draws a %s panel when asked',
    (emphasis) => {
      const { container } = render(
        <CallToAction emphasis={emphasis} title='Talk to our team' />
      )

      expect(container.querySelector('[data-slot=block-surface]')).toHaveClass(
        `emphasis-${emphasis}`
      )
    }
  )

  it('gives the strong action the block’s intent on other panels', () => {
    render(
      <CallToAction intent='brand' title='Talk to our team' actions={actions} />
    )

    expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveClass(
      'intent-brand'
    )
  })
})
