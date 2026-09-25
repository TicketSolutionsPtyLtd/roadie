import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Callout } from './index'
import { calloutVariants } from './variants'

function slot(container: HTMLElement, name: string) {
  return container.querySelector(`[data-slot="${name}"]`)
}

describe('Callout', () => {
  it('renders a container with no live role', () => {
    const { container } = render(<Callout>Doors open at 7pm</Callout>)
    const root = slot(container, 'callout')
    expect(root).toBeInTheDocument()
    expect(root).not.toHaveAttribute('role')
    expect(root).toHaveClass('rounded-xl', 'emphasis-subtle', '@container')
  })

  it('passes role through for dynamically inserted callouts', () => {
    render(<Callout role='alert'>Payment failed</Callout>)
    expect(screen.getByRole('alert')).toHaveTextContent('Payment failed')
  })

  it('sets no intent class when intent is omitted', () => {
    const { container } = render(<Callout>Plain</Callout>)
    expect(slot(container, 'callout')?.className).not.toMatch(/intent-/)
  })

  it('applies intent and emphasis', () => {
    const { container } = render(
      <Callout intent='warning' emphasis='strong'>
        Only 20 tickets left at this price
      </Callout>
    )
    expect(slot(container, 'callout')).toHaveClass(
      'intent-warning',
      'emphasis-strong'
    )
  })

  it('merges a custom className', () => {
    const { container } = render(<Callout className='mt-6'>x</Callout>)
    expect(slot(container, 'callout')).toHaveClass('mt-6')
  })

  it('exposes the parts and a Root alias', () => {
    expect(Callout.Root).toBe(Callout)
    expect(Callout.Icon).toBeTypeOf('function')
    expect(Callout.Title).toBeTypeOf('function')
    expect(Callout.Description).toBeTypeOf('function')
    expect(Callout.Actions).toBeTypeOf('function')
  })
})

describe('Callout short form', () => {
  it('renders title, description and the intent icon', () => {
    const { container } = render(
      <Callout intent='success' title='Your event is live'>
        Tickets are on sale now.
      </Callout>
    )
    expect(slot(container, 'callout-title')).toHaveTextContent(
      'Your event is live'
    )
    expect(slot(container, 'callout-description')).toHaveTextContent(
      'Tickets are on sale now.'
    )
    expect(slot(container, 'callout-icon')?.querySelector('svg')).toBeTruthy()
  })

  it('wraps string children in a description', () => {
    const { container } = render(
      <Callout intent='info'>Doors open at 7pm</Callout>
    )
    expect(slot(container, 'callout-description')).toHaveTextContent(
      'Doors open at 7pm'
    )
    expect(slot(container, 'callout-title')).toBeNull()
    expect(slot(container, 'callout-icon')).toBeInTheDocument()
  })

  it('renders a title on its own', () => {
    const { container } = render(
      <Callout intent='info' title='Doors open at 7pm' />
    )
    expect(slot(container, 'callout-title')).toBeInTheDocument()
    expect(slot(container, 'callout-description')).toBeNull()
  })

  it.each([null, false, ''])('treats a %j title as absent', (title) => {
    const { container } = render(
      <Callout intent='info' title={title}>
        Doors open at 7pm
      </Callout>
    )
    expect(slot(container, 'callout-title')).toBeNull()
    expect(slot(container, 'callout-description')).toHaveTextContent(
      'Doors open at 7pm'
    )
  })

  it('renders 0 as a title and as the description', () => {
    const { container } = render(<Callout title={0}>{0}</Callout>)
    expect(slot(container, 'callout-title')).toHaveTextContent('0')
    expect(slot(container, 'callout-description')).toHaveTextContent('0')
  })

  it('wraps interpolated text in a description', () => {
    const seats = 0
    const { container } = render(
      <Callout intent='warning'>{seats} seats left</Callout>
    )
    expect(slot(container, 'callout-description')).toHaveTextContent(
      '0 seats left'
    )
    expect(slot(container, 'callout-icon')).toBeInTheDocument()
  })

  it('renders no description for empty children', () => {
    const { container } = render(<Callout title='Doors open'>{false}</Callout>)
    expect(slot(container, 'callout-description')).toBeNull()
  })

  it('has no default icon for intents without a status', () => {
    const { container } = render(<Callout title='Heads up'>Body</Callout>)
    expect(slot(container, 'callout-icon')).toBeNull()
  })

  it('takes a custom icon, or none', () => {
    const { container, rerender } = render(
      <Callout intent='warning' icon={<svg data-testid='custom' />}>
        Body
      </Callout>
    )
    expect(screen.getByTestId('custom')).toBeInTheDocument()
    rerender(
      <Callout intent='warning' icon={null}>
        Body
      </Callout>
    )
    expect(slot(container, 'callout-icon')).toBeNull()
  })
})

describe('Callout compound form', () => {
  it('renders parts as given', () => {
    const { container } = render(
      <Callout intent='danger'>
        <Callout.Icon />
        <Callout.Title>Payment failed</Callout.Title>
        <Callout.Description>
          Update your card to keep your booking.
        </Callout.Description>
        <Callout.Actions>
          <button>Update card</button>
        </Callout.Actions>
      </Callout>
    )
    expect(slot(container, 'callout-icon')?.querySelector('svg')).toBeTruthy()
    expect(slot(container, 'callout-icon')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
    expect(slot(container, 'callout-actions')).toContainElement(
      screen.getByRole('button', { name: 'Update card' })
    )
  })

  it('renders the icon it is given over the default', () => {
    render(
      <Callout intent='info'>
        <Callout.Icon>
          <svg data-testid='own' />
        </Callout.Icon>
      </Callout>
    )
    expect(screen.getByTestId('own')).toBeInTheDocument()
  })

  it('shows a different default icon per status intent', () => {
    const markup = (['success', 'danger', 'warning', 'info'] as const).map(
      (intent) => {
        const { container, unmount } = render(
          <Callout intent={intent}>
            <Callout.Icon />
          </Callout>
        )
        const html = slot(container, 'callout-icon')?.innerHTML
        unmount()
        return html
      }
    )
    expect(new Set(markup).size).toBe(4)
  })

  it('titles with a paragraph by default and takes a heading via render', () => {
    const { container, rerender } = render(
      <Callout>
        <Callout.Title>Doors open at 7pm</Callout.Title>
      </Callout>
    )
    expect(slot(container, 'callout-title')?.tagName).toBe('P')
    expect(screen.queryByRole('heading')).toBeNull()
    rerender(
      <Callout>
        <Callout.Title render={<h3 />}>Doors open at 7pm</Callout.Title>
      </Callout>
    )
    const heading = screen.getByRole('heading', {
      level: 3,
      name: 'Doors open at 7pm'
    })
    expect(heading).toHaveAttribute('data-slot', 'callout-title')
  })
})

describe('Callout dismiss', () => {
  it('renders no dismiss button without onDismiss', () => {
    render(<Callout>Body</Callout>)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onDismiss from a labelled button', () => {
    const onDismiss = vi.fn()
    render(<Callout onDismiss={onDismiss}>Body</Callout>)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('takes a dismiss label', () => {
    render(
      <Callout onDismiss={() => {}} dismissLabel='Hide notice'>
        Body
      </Callout>
    )
    expect(
      screen.getByRole('button', { name: 'Hide notice' })
    ).toBeInTheDocument()
  })
})

describe('calloutVariants', () => {
  it('defaults to subtle emphasis', () => {
    expect(calloutVariants()).toContain('emphasis-subtle')
  })

  it('maps every emphasis', () => {
    expect(calloutVariants({ emphasis: 'strong' })).toContain('emphasis-strong')
    expect(calloutVariants({ emphasis: 'normal' })).toContain('emphasis-normal')
    expect(calloutVariants({ emphasis: 'subtler' })).toContain(
      'emphasis-subtler'
    )
  })
})
