import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from './index'

describe('Text', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Text>Hello World</Text>)
    const text = getByText('Hello World')
    expect(text).toBeInTheDocument()
    expect(text.tagName.toLowerCase()).toBe('span')
    expect(text).toHaveClass('textStyle_ui')
  })

  it('applies textStyle prop', () => {
    const { getByText } = render(<Text textStyle='heading.1'>Large Text</Text>)
    const text = getByText('Large Text')
    expect(text).toHaveClass('textStyle_heading.1')
  })

  it('renders with custom element type', () => {
    const { getByText } = render(<Text as='p'>Paragraph Text</Text>)
    const element = getByText('Paragraph Text')
    expect(element.tagName.toLowerCase()).toBe('p')
  })

  it('applies color prop', () => {
    const { getByText } = render(<Text color='fg.subtle'>Subtle Text</Text>)
    const text = getByText('Subtle Text')
    expect(text).toHaveClass('textStyle_ui', 'c_fg.subtle')
  })

  it('applies line clamp prop', () => {
    const { getByText } = render(<Text lineClamp={2}>Multi-line text that should be clamped</Text>)
    const text = getByText('Multi-line text that should be clamped')
    expect(text).toHaveClass('lc_2')
  })

  it('forwards additional HTML attributes', () => {
    const { getByTestId } = render(
      <Text data-testid='text' title='tooltip' aria-label='Accessible text'>
        Text with attributes
      </Text>
    )
    const text = getByTestId('text')
    expect(text).toHaveClass('textStyle_ui')
    expect(text).toHaveAttribute('title', 'tooltip')
    expect(text).toHaveAttribute('aria-label', 'Accessible text')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Text
        textStyle='heading.2'
        color='fg.accent'
        fontSize='lg'
        fontWeight='bold'
        className='custom-class'
      >
        Styled Text
      </Text>
    )
    const text = getByText('Styled Text')
    expect(text).toHaveClass('textStyle_heading.2', 'c_fg.accent', 'custom-class')
  })
})
