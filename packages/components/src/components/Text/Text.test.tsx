/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from './index'

describe('Text', () => {
  it('renders with default props', () => {
    render(<Text>Hello World</Text>)
    const text = screen.getByText('Hello World')
    expect(text).toBeInTheDocument()
    expect(text.tagName.toLowerCase()).toBe('span')
    expect(text).toHaveClass('textStyle_ui')
  })

  it('applies textStyle prop', () => {
    render(<Text textStyle='heading.1'>Large Text</Text>)
    const text = screen.getByText('Large Text')
    expect(text).toHaveClass('textStyle_heading.1')
  })

  it('renders with custom element type', () => {
    render(<Text as='p'>Paragraph Text</Text>)
    const element = screen.getByText('Paragraph Text')
    expect(element.tagName.toLowerCase()).toBe('p')
  })

  it('applies color prop', () => {
    render(<Text color='fg.subtle'>Subtle Text</Text>)
    const text = screen.getByText('Subtle Text')
    expect(text).toHaveClass('textStyle_ui', 'c_fg.subtle')
  })

  it('applies line clamp prop', () => {
    render(<Text lineClamp={2}>Multi-line text that should be clamped</Text>)
    const text = screen.getByText('Multi-line text that should be clamped')
    expect(text).toHaveClass('lc_2')
  })

  it('forwards additional HTML attributes', () => {
    render(
      <Text data-testid='text' title='tooltip' aria-label='Accessible text'>
        Text with attributes
      </Text>
    )
    const text = screen.getByTestId('text')
    expect(text).toHaveClass('textStyle_ui')
    expect(text).toHaveAttribute('title', 'tooltip')
    expect(text).toHaveAttribute('aria-label', 'Accessible text')
  })

  it('combines multiple props', () => {
    render(
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
    const text = screen.getByText('Styled Text')
    expect(text).toHaveClass(
      'textStyle_heading.2',
      'c_fg.accent',
      'fs_lg',
      'fw_bold',
      'custom-class'
    )
  })
})
