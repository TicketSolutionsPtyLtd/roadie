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
    const { getByText } = render(<Card.Root>Root content</Card.Root>)
    expect(getByText('Root content').tagName.toLowerCase()).toBe('div')
  })

  it('renders with default props', () => {
    const { getByText } = render(<Card>Content</Card>)
    const card = getByText('Content')
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
    const { rerender, getByText } = render(<Card intent='accent'>Accent</Card>)
    expect(getByText('Accent')).toHaveClass('intent-accent')

    rerender(<Card intent='danger'>Danger</Card>)
    expect(getByText('Danger')).toHaveClass('intent-danger')

    rerender(<Card intent='success'>Success</Card>)
    expect(getByText('Success')).toHaveClass('intent-success')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Card emphasis='raised'>Raised</Card>
    )
    expect(getByText('Raised')).toHaveClass('emphasis-raised')

    rerender(<Card emphasis='subtle'>Subtle</Card>)
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle')

    rerender(<Card emphasis='subtler'>Subtler</Card>)
    expect(getByText('Subtler')).toHaveClass('emphasis-subtler', 'p-2', 'gap-4')

    rerender(<Card emphasis='normal'>Default</Card>)
    expect(getByText('Default')).toHaveClass('emphasis-normal')
  })

  it('renders Header sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Header>Card Title</Card.Header>
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
        <Card.Footer>Card Footer</Card.Footer>
      </Card>
    )
    const footer = getByText('Card Footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveClass('px-6', 'pb-6')
  })

  it('renders as a custom element', () => {
    const { getByText } = render(<Card as='section'>Section Card</Card>)
    expect(getByText('Section Card').tagName.toLowerCase()).toBe('section')
  })

  it('renders as anchor when as="a" and href is provided', () => {
    const { getByText } = render(
      <Card as='a' href='/event'>
        Event
      </Card>
    )
    const card = getByText('Event')
    expect(card.tagName.toLowerCase()).toBe('a')
    expect(card).toHaveAttribute('href', '/event')
    expect(card).toHaveClass('is-interactive')
  })

  it('adds is-interactive when onClick is provided', () => {
    const { getByText } = render(<Card onClick={() => {}}>Click me</Card>)
    const card = getByText('Click me')
    expect(card.tagName.toLowerCase()).toBe('div')
    expect(card).toHaveClass('is-interactive')
  })

  it('does not add is-interactive without href or onClick', () => {
    const { getByText } = render(<Card>Static</Card>)
    expect(getByText('Static')).not.toHaveClass('is-interactive')
  })

  it('uses as prop to render as button', () => {
    const { getByText } = render(
      <Card as='button' onClick={() => {}}>
        Button Card
      </Card>
    )
    expect(getByText('Button Card').tagName.toLowerCase()).toBe('button')
  })

  it('applies custom className', () => {
    const { getByText } = render(<Card className='custom-class'>Custom</Card>)
    expect(getByText('Custom')).toHaveClass('custom-class')
  })

  it('renders Image sub-component with wrapper', () => {
    const { getByAltText } = render(
      <Card>
        <Card.Image src='test.jpg' alt='Test image' />
      </Card>
    )
    const img = getByAltText('Test image')
    expect(img).toBeInTheDocument()
    expect(img.tagName.toLowerCase()).toBe('img')
    expect(img).toHaveClass('aspect-2/1', 'w-full', 'object-cover')
    expect(img.parentElement).toHaveClass('overflow-hidden', 'rounded-xl')
  })

  it('renders Title sub-component', () => {
    const { getByText } = render(
      <Card>
        <Card.Header>
          <Card.Title>Event name</Card.Title>
        </Card.Header>
      </Card>
    )
    const title = getByText('Event name')
    expect(title).toBeInTheDocument()
    expect(title.tagName.toLowerCase()).toBe('h3')
    expect(title).toHaveClass('text-display-ui-6', 'text-strong')
  })

  describe('href routing', () => {
    it('renders as anchor when href is set without as', () => {
      const { getByText } = render(<Card href='/event/123'>Event</Card>)
      const card = getByText('Event')
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('href', '/event/123')
      expect(card).toHaveClass('is-interactive')
    })

    it('routes through configured Link when provider is wired', () => {
      const { getByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card href='/event/123'>Event</Card>
        </RoadieLinkProvider>
      )
      const card = getByTestId('stub-link')
      expect(card).toHaveAttribute('href', '/event/123')
      expect(card).toHaveClass('is-interactive')
    })

    it('renders external href with target=_blank rel=noopener', () => {
      const { getByText } = render(
        <Card href='https://example.com'>External</Card>
      )
      const card = getByText('External')
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('target', '_blank')
      expect(card).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('as prop wins over href smart-routing (back-compat)', () => {
      const { getByText, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card as='a' href='/event'>
            Event
          </Card>
        </RoadieLinkProvider>
      )
      // Provider Link must NOT be invoked when `as` is explicit
      expect(queryByTestId('stub-link')).toBeNull()
      const card = getByText('Event')
      expect(card.tagName.toLowerCase()).toBe('a')
      expect(card).toHaveAttribute('href', '/event')
    })

    it('forces external when external={true}', () => {
      const { getByText, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card href='/redirect/foo' external>
            R
          </Card>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      const card = getByText('R')
      expect(card).toHaveAttribute('target', '_blank')
    })
  })

  describe('render escape hatch', () => {
    it('renders the element form, merging className', () => {
      const { getByText } = render(
        <Card render={<button type='button' className='extra' />}>
          Click me
        </Card>
      )
      const card = getByText('Click me')
      expect(card.tagName.toLowerCase()).toBe('button')
      expect(card).toHaveClass('rounded-xl', 'extra')
    })

    it('render wins over href smart-routing', () => {
      const { getByText, queryByTestId } = render(
        <RoadieLinkProvider Link={StubLink}>
          <Card href='/x' render={<a href='/y' data-custom='1' />}>
            Custom
          </Card>
        </RoadieLinkProvider>
      )
      expect(queryByTestId('stub-link')).toBeNull()
      const card = getByText('Custom')
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
          Click me
        </Card>
      )
      const card = getByText('Click me')
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
          Section
        </Card>
      )
      const card = getByText('Section')
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
      </Card>
    )
    const desc = getByText('Some details')
    expect(desc).toBeInTheDocument()
    expect(desc.tagName.toLowerCase()).toBe('p')
    expect(desc).toHaveClass('text-sm', 'text-subtle')
  })
})
