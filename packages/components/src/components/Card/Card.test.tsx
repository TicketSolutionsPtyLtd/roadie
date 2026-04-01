import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Card } from '.'

describe('Card', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Card>Content</Card>)
    const card = getByText('Content')
    expect(card).toBeInTheDocument()
    expect(card.tagName.toLowerCase()).toBe('div')
    expect(card).toHaveClass('rounded-lg', 'emphasis-default-surface')
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
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle-surface')

    rerender(<Card emphasis='default'>Default</Card>)
    expect(getByText('Default')).toHaveClass('emphasis-default-surface')
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

  it('applies custom className', () => {
    const { getByText } = render(<Card className='custom-class'>Custom</Card>)
    expect(getByText('Custom')).toHaveClass('custom-class')
  })
})
