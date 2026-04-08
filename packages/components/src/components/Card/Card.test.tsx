import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from '.'

describe('Card', () => {
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

  it('renders as anchor when href is provided', () => {
    const { getByText } = render(<Card href='/event'>Event</Card>)
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

  it('uses as prop over implicit anchor', () => {
    const { getByText } = render(
      <Card as='button' href='/event'>
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
