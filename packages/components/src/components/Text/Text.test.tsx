import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from './index'

describe('Text', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Text>Hello World</Text>)
    const text = getByText('Hello World')
    expect(text).toBeInTheDocument()
    expect(text.tagName.toLowerCase()).toBe('p')
    expect(text).toHaveClass('emphasis-default-fg')
  })

  it('renders with custom element type', () => {
    const { getByText } = render(<Text as='span'>Span Text</Text>)
    expect(getByText('Span Text').tagName.toLowerCase()).toBe('span')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Text emphasis='strong'>Strong Text</Text>
    )
    expect(getByText('Strong Text')).toHaveClass('emphasis-strong-fg')

    rerender(<Text emphasis='subtle'>Subtle Text</Text>)
    expect(getByText('Subtle Text')).toHaveClass('emphasis-subtle-fg')

    rerender(<Text emphasis='subtler'>Subtler Text</Text>)
    expect(getByText('Subtler Text')).toHaveClass('emphasis-subtler-fg')

    rerender(<Text emphasis='default'>Default Text</Text>)
    expect(getByText('Default Text')).toHaveClass('emphasis-default-fg')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Text intent='accent'>Accent Text</Text>
    )
    expect(getByText('Accent Text')).toHaveClass('intent-accent')

    rerender(<Text intent='brand'>Brand Text</Text>)
    expect(getByText('Brand Text')).toHaveClass('intent-brand')

    rerender(<Text intent='danger'>Danger Text</Text>)
    expect(getByText('Danger Text')).toHaveClass('intent-danger')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Text size='sm'>Small</Text>)
    expect(getByText('Small')).toHaveClass('text-sm')

    rerender(<Text size='lg'>Large</Text>)
    expect(getByText('Large')).toHaveClass('text-lg')
  })

  it('forwards additional HTML attributes', () => {
    const { getByTestId } = render(
      <Text data-testid='text' title='tooltip' aria-label='Accessible text'>
        Text with attributes
      </Text>
    )
    const text = getByTestId('text')
    expect(text).toHaveAttribute('title', 'tooltip')
    expect(text).toHaveAttribute('aria-label', 'Accessible text')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Text
        emphasis='strong'
        intent='accent'
        size='lg'
        className='custom-class'
      >
        Styled Text
      </Text>
    )
    const text = getByText('Styled Text')
    expect(text).toHaveClass(
      'emphasis-strong-fg',
      'intent-accent',
      'text-lg',
      'custom-class'
    )
  })
})
