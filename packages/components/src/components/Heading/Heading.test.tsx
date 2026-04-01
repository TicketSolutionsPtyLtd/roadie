import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Heading } from './index'

describe('Heading', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Heading>Hello World</Heading>)
    const heading = getByText('Hello World')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName.toLowerCase()).toBe('h2')
    expect(heading).toHaveClass('emphasis-strong-fg')
    expect(heading).toHaveClass('text-display-ui')
  })

  it('renders with as prop', () => {
    const elements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
    elements.forEach((el) => {
      const { getByText, unmount } = render(
        <Heading as={el}>{`${el} Heading`}</Heading>
      )
      const heading = getByText(`${el} Heading`)
      expect(heading.tagName.toLowerCase()).toBe(el)
      unmount()
    })
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Heading emphasis='default'>Default</Heading>
    )
    expect(getByText('Default')).toHaveClass('emphasis-strong-fg')

    rerender(<Heading emphasis='strong'>Strong</Heading>)
    expect(getByText('Strong')).toHaveClass('emphasis-strong-fg')

    rerender(<Heading emphasis='subtle'>Subtle</Heading>)
    expect(getByText('Subtle')).toHaveClass('emphasis-subtle-fg')

    rerender(<Heading emphasis='subtler'>Subtler</Heading>)
    expect(getByText('Subtler')).toHaveClass('emphasis-subtler-fg')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Heading intent='brand'>Brand</Heading>
    )
    expect(getByText('Brand')).toHaveClass('intent-brand')

    rerender(<Heading intent='accent'>Accent</Heading>)
    expect(getByText('Accent')).toHaveClass('intent-accent')
  })

  it('applies text style via className', () => {
    const { getByText } = render(
      <Heading className='text-display-prose-1'>Big</Heading>
    )
    expect(getByText('Big')).toHaveClass('text-display-prose-1')
  })

  it('forwards additional HTML attributes', () => {
    const { getByTestId } = render(
      <Heading data-testid='heading' title='tooltip' aria-label='Accessible'>
        Styled Heading
      </Heading>
    )
    const heading = getByTestId('heading')
    expect(heading).toHaveAttribute('title', 'tooltip')
    expect(heading).toHaveAttribute('aria-label', 'Accessible')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Heading
        as='h1'
        emphasis='strong'
        intent='brand'
        className='text-display-ui-1 custom-class'
      >
        Combined styles
      </Heading>
    )
    const heading = getByText('Combined styles')
    expect(heading.tagName.toLowerCase()).toBe('h1')
    expect(heading).toHaveClass(
      'emphasis-strong-fg',
      'intent-brand',
      'text-display-ui-1',
      'custom-class'
    )
  })
})
