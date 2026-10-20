import { type ReactElement } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='stub-link' href={href} {...rest}>
    {children}
  </a>
)

describe('Card', () => {
  it('Card and Card.Root are the same component reference', () => {
    expect(Card).toBe(Card.Root)
  })

  it('renders <Card.Root> alias the same as bare <Card>', () => {
    const { getByText } = render(
      <Card.Root>
        <Card.Content>Root content</Card.Content>
      </Card.Root>
    )
    expect(
      getByText('Root content')
        .closest('[data-slot=card]')!
        .tagName.toLowerCase()
    ).toBe('div')
  })

  it('renders with default props', () => {
    const { getByText } = render(
      <Card>
        <Card.Content>Content</Card.Content>
      </Card>
    )
    const card = getByText('Content').closest('[data-slot=card]')!
    expect(card).toBeInTheDocument()
    expect(card.tagName.toLowerCase()).toBe('div')
    expect(card).toHaveClass(
      'grid',
      'content-start',
      'rounded-xl',
      'emphasis-normal'
    )
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Card intent='accent'>
        <Card.Content>Accent</Card.Content>
      </Card>
    )
    expect(getByText('Accent').closest('[data-slot=card]')!).toHaveClass(
      'intent-accent'
    )

    rerender(
      <Card intent='danger'>
        <Card.Content>Danger</Card.Content>
      </Card>
    )
    expect(getByText('Danger').closest('[data-slot=card]')!).toHaveClass(
      'intent-danger'
    )

    rerender(
      <Card intent='success'>
        <Card.Content>Success</Card.Content>
      </Card>
    )
    expect(getByText('Success').closest('[data-slot=card]')!).toHaveClass(
      'intent-success'
    )
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Card emphasis='raised'>
        <Card.Content>Raised</Card.Content>
      </Card>
    )
    expect(getByText('Raised').closest('[data-slot=card]')!).toHaveClass(
      'emphasis-raised'
    )

    rerender(
      <Card emphasis='subtle'>
        <Card.Content>Subtle</Card.Content>
      </Card>
    )
    expect(getByText('Subtle').closest('[data-slot=card]')!).toHaveClass(
      'emphasis-subtle'
    )

    rerender(
      <Card emphasis='subtler'>
        <Card.Content>Subtler</Card.Content>
      </Card>
    )
    expect(getByText('Subtler').closest('[data-slot=card]')!).toHaveClass(
      'emphasis-subtler',
      'p-2',
      'gap-4'
    )

    rerender(
      <Card emphasis='normal'>
        <Card.Content>Default</Card.Content>
      </Card>
    )
    expect(getByText('Default').closest('[data-slot=card]')!).toHaveClass(
      'emphasis-normal'
    )
  })

  it('renders Header sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Header>Card Title</Card.Header>
        <Card.Content>Doors open at 7pm.</Card.Content>
      </Card>
    )
    const header = getByText('Card Title')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('px-6', 'pt-6')
  })

  it('renders Content sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Content>Card Body</Card.Content>
      </Card>
    )
    const content = getByText('Card Body')
    expect(content).toBeInTheDocument()
    expect(content).toHaveClass('px-6', 'py-4')
  })

  it('renders Footer sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Content>Doors open at 7pm.</Card.Content>
        <Card.Footer>Card Footer</Card.Footer>
      </Card>
    )
    const footer = getByText('Card Footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('px-6', 'pb-6')
  })

  it('renders as a custom element', () => {
    const { getByText } = render(
      <Card as='section'>
        <Card.Content>Section Card</Card.Content>
      </Card>
    )
    expect(
      getByText('Section Card')
        .closest('[data-slot=card]')!
        .tagName.toLowerCase()
    ).toBe('section')
  })

  it('renders as anchor when as="a" and href is provided', () => {
    const { getByText } = render(
      <Card as='a' href='/event'>
        <Card.Content>Event</Card.Content>
      </Card>
    )
    const card = getByText('Event').closest('[data-slot=card]')!
    expect(card.tagName.toLowerCase()).toBe('a')
    expect(card).toHaveAttribute('href', '/event')
    expect(card).toHaveClass('is-interactive')
  })

  it('adds is-interactive when onClick is provided', () => {
    const { getByText } = render(
      <Card onClick={() => {}}>
        <Card.Content>Click me</Card.Content>
      </Card>
    )
    const card = getByText('Click me').closest('[data-slot=card]')!
    expect(card.tagName.toLowerCase()).toBe('div')
    expect(card).toHaveClass('is-interactive')
  })

  it('does not add is-interactive without href or onClick', () => {
    const { getByText } = render(
      <Card>
        <Card.Content>Static</Card.Content>
      </Card>
    )
    expect(getByText('Static').closest('[data-slot=card]')!).not.toHaveClass(
      'is-interactive'
    )
  })

  it('uses as prop to render as button', () => {
    const { getByText } = render(
      <Card as='button' onClick={() => {}}>
        <Card.Content>Button Card</Card.Content>
      </Card>
    )
    expect(
      getByText('Button Card')
        .closest('[data-slot=card]')!
        .tagName.toLowerCase()
    ).toBe('button')
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <Card className='custom-class'>
        <Card.Content>Custom</Card.Content>
      </Card>
    )
    expect(getByText('Custom').closest('[data-slot=card]')!).toHaveClass(
      'custom-class'
    )
  })

  it('renders Image sub-component with wrapper', () => {
    const { getByAltText } = render(
      <Card>
        <Card.Image src='test.jpg' alt='Test image' />
        <Card.Content>Doors open at 7pm.</Card.Content>
      </Card>
    )
    const img = getByAltText('Test image')
    expect(img).toBeInTheDocument()
    expect(img.tagName.toLowerCase()).toBe('img')
    expect(img).toHaveClass('aspect-2/1', 'w-full', 'object-cover')
    expect(img.parentElement).toHaveClass('overflow-hidden', 'rounded-xl')
  })

  it('resizes Image sub-component when given a width', () => {
    const { getByAltText } = render(
      <Card>
        <Card.Image
          src='https://assets.oztix.com.au/image/abc.png'
          alt='Sized'
          width={600}
        />
        <Card.Content>Doors open at 7pm.</Card.Content>
      </Card>
    )
    const img = getByAltText('Sized')
    expect(img.getAttribute('src')).toContain('width=600')
    expect(img.getAttribute('srcset')).toContain('1200w')
  })

  it('renders Title sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Header>
          <Card.Title>Event name</Card.Title>
        </Card.Header>
        <Card.Content>Doors open at 7pm.</Card.Content>
      </Card>
    )
    const title = getByText('Event name')
    expect(title).toBeInTheDocument()
    expect(title.tagName.toLowerCase()).toBe('h3')
    expect(title).toHaveClass('text-display-ui-6', 'text-strong')
  })

  describe('href routing', () => {
    it('renders as anchor when href is set without as', () => {
      const { getByText } = render(
        <Card href='/event/123'>
          <Card.Content>Event</Card.Content>
        </Card>
      )
      const card = getByText('Event').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('href', '/event/123')
      expect(card).toHaveClass('is-interactive')
    })

    it('routes through configured Link when provider is wired', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card href='/event/123'>
            <Card.Content>Event</Card.Content>
          </Card>
        </RoadieLinkProvider>
      )
      const card = getByTestId('stub-link')
      expect(card).toHaveAttribute('href', '/event/123')
      expect(card).toHaveClass('is-interactive')
    })

    it('as prop wins over href smart-routing (back-compat)', () => {
      const { getByText, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card as='a' href='/event'>
            <Card.Content>Event</Card.Content>
          </Card>
        </RoadieLinkProvider>
      )
      // Provider Link must NOT be invoked when `as` is explicit
      expect(queryByTestId('stub-link')).toBeNull()
      const card = getByText('Event').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('href', '/event')
    })
  })

  describe('render escape hatch', () => {
    it('renders the element form, merging className', () => {
      const { getByText } = render(
        <Card render={<button type='button' className='extra' />}>
          <Card.Content>Click me</Card.Content>
        </Card>
      )
      const card = getByText('Click me').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('button')
      expect(card).toHaveClass('rounded-xl', 'extra')
    })

    it('render wins over href smart-routing', () => {
      const { getByText, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card href='/x' render={<a href='/y' data-custom='1' />}>
            <Card.Content>Custom</Card.Content>
          </Card>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      const card = getByText('Custom').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('href', '/y')
      expect(card).toHaveAttribute('data-custom', '1')
    })

    it('adds is-interactive when render carries onClick (ADV-003)', () => {
      // Regression: previously isInteractive looked only at outer
      // onClick. With render={<button onClick=…/>} the click handler
      // lived inside the render element, so the cursor/focus-ring/scale
      // styles silently dropped.
      const { getByText } = render(
        <Card render={<button type='button' onClick={() => {}} />}>
          <Card.Content>Click me</Card.Content>
        </Card>
      )
      const card = getByText('Click me').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('button')
      expect(card).toHaveClass('is-interactive')
    })

    it('supports the function form with default props', () => {
      const { getByText } = render(
        <Card
          render={(props) => (
            <section
              {...(props as React.HTMLAttributes<HTMLElement>)}
              data-from-fn='1'
            />
          )}
        >
          <Card.Content>Section</Card.Content>
        </Card>
      )
      const card = getByText('Section').closest('[data-slot=card]')!
      expect(card.tagName.toLowerCase()).toBe('section')
      expect(card).toHaveAttribute('data-from-fn', '1')
      expect(card).toHaveClass('rounded-xl')
    })
  })

  it('renders Description sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Header>
          <Card.Description>Some details</Card.Description>
        </Card.Header>
        <Card.Content>Doors open at 7pm.</Card.Content>
      </Card>
    )
    const desc = getByText('Some details')
    expect(desc).toBeInTheDocument()
    expect(desc.tagName.toLowerCase()).toBe('p')
    expect(desc).toHaveClass('text-sm', 'text-subtle')
  })

  describe('direction', () => {
    const cardIn = (ui: ReactElement) =>
      render(ui).container.querySelector('[data-slot=card]')!

    it('defaults to vertical, ticket or not', () => {
      expect(
        cardIn(
          <Card>
            <Card.Content>Body</Card.Content>
          </Card>
        )
      ).toHaveAttribute('data-direction', 'vertical')
      expect(
        cardIn(
          <Card variant='ticket'>
            <Card.Content>Body</Card.Content>
          </Card>
        )
      ).toHaveAttribute('data-direction', 'vertical')
    })

    it.each(['horizontal', 'auto'] as const)(
      'renders %s on a plain card',
      (direction) => {
        const card = cardIn(
          <Card direction={direction}>
            <Card.Content>Body</Card.Content>
            <Card.Footer>Actions</Card.Footer>
          </Card>
        )

        expect(card).toHaveAttribute('data-direction', direction)
        expect(card).not.toHaveAttribute('data-variant')
      }
    )

    it('renders on a ticket alongside the ticket attributes', () => {
      const card = cardIn(
        <Card variant='ticket' direction='horizontal'>
          <Card.Content>Body</Card.Content>
          <Card.Footer>Holder</Card.Footer>
        </Card>
      )

      expect(card).toHaveAttribute('data-direction', 'horizontal')
      expect(card).toHaveAttribute('data-variant', 'ticket')
    })
  })

  describe('ticket variant', () => {
    it('marks the root for the ticket styles and moves emphasis to data', () => {
      const { container } = render(
        <Card variant='ticket' emphasis='raised' intent='brand'>
          <Card.Content>Body</Card.Content>
          <Card.Footer>Holder</Card.Footer>
        </Card>
      )
      const card = container.querySelector('[data-slot=card]')!

      expect(card).toHaveAttribute('data-variant', 'ticket')
      expect(card).toHaveAttribute('data-emphasis', 'raised')
      expect(card).toHaveClass('intent-brand')
      expect(card).not.toHaveClass('emphasis-raised')
    })

    it('rounds the ticket at 4xl, and lets className override it', () => {
      const { container, rerender } = render(
        <Card variant='ticket'>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      const card = () => container.querySelector('[data-slot=card]')!

      expect(card()).toHaveClass('rounded-4xl')
      expect(card()).not.toHaveClass('rounded-xl')

      rerender(
        <Card variant='ticket' className='rounded-2xl'>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      expect(card()).toHaveClass('rounded-2xl')
      expect(card()).not.toHaveClass('rounded-4xl')
    })

    it('keeps subtler emphasis for the ticket styles', () => {
      const { container } = render(
        <Card variant='ticket' emphasis='subtler' href='/tickets/1'>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      const card = container.querySelector('[data-slot=card]')!

      expect(card).toHaveAttribute('data-emphasis', 'subtler')
      expect(card).toHaveClass('is-interactive')
    })

    it('defaults the ticket emphasis to normal', () => {
      const { container } = render(
        <Card variant='ticket'>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      const card = container.querySelector('[data-slot=card]')!

      expect(card).toHaveAttribute('data-emphasis', 'normal')
      expect(card).not.toHaveClass('emphasis-normal')
    })

    it('keeps the ticket attributes on a linked card', () => {
      const { container } = render(
        <Card variant='ticket' href='/tickets/1'>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      expect(container.querySelector('a')).toHaveAttribute(
        'data-variant',
        'ticket'
      )
    })

    it('adds nothing by default', () => {
      const { container } = render(
        <Card>
          <Card.Content>Body</Card.Content>
        </Card>
      )
      const card = container.querySelector('[data-slot=card]')!

      expect(card).not.toHaveAttribute('data-variant')
      expect(card).not.toHaveAttribute('data-emphasis')
      expect(card).toHaveAttribute('data-direction', 'vertical')
      expect(card).toHaveClass('emphasis-normal')
    })
  })
})
