import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Text } from './index'

describe('Text', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Text>Hello World</Text>)
    const text = getByText('Hello World')
    expect(text).toBeInTheDocument()
    expect(text.tagName.toLowerCase()).toBe('p')
    expect(text).toHaveClass('text', 'text--emphasis_default')
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

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Text emphasis='strong'>Strong Text</Text>
    )
    let text = getByText('Strong Text')
    expect(text).toHaveClass('text--emphasis_strong')

    rerender(<Text emphasis='subtle'>Subtle Text</Text>)
    text = getByText('Subtle Text')
    expect(text).toHaveClass('text--emphasis_subtle')

    rerender(<Text emphasis='subtler'>subtler Text</Text>)
    text = getByText('subtler Text')
    expect(text).toHaveClass('text--emphasis_subtler')

    rerender(<Text emphasis='default'>Default Text</Text>)
    text = getByText('Default Text')
    expect(text).toHaveClass('text--emphasis_default')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByText } = render(
      <Text colorPalette='accent'>Accent Text</Text>
    )
    let text = getByText('Accent Text')
    expect(text).toHaveClass('color-palette_accent')

    rerender(<Text colorPalette='brand'>Brand Text</Text>)
    text = getByText('Brand Text')
    expect(text).toHaveClass('color-palette_brand')

    rerender(<Text colorPalette='success'>Success Text</Text>)
    text = getByText('Success Text')
    expect(text).toHaveClass('color-palette_success')

    rerender(<Text colorPalette='warning'>Warning Text</Text>)
    text = getByText('Warning Text')
    expect(text).toHaveClass('color-palette_warning')

    rerender(<Text colorPalette='danger'>Danger Text</Text>)
    text = getByText('Danger Text')
    expect(text).toHaveClass('color-palette_danger')
  })

  it('applies interactive styles', () => {
    const { getByText } = render(<Text interactive>Interactive Text</Text>)
    const text = getByText('Interactive Text')
    expect(text).toHaveClass('text--interactive_true')
  })

  it('applies line clamp prop', () => {
    const { getByText } = render(
      <Text lineClamp={2}>Multi-line text that should be clamped</Text>
    )
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
    expect(text).toHaveClass('text')
    expect(text).toHaveAttribute('title', 'tooltip')
    expect(text).toHaveAttribute('aria-label', 'Accessible text')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Text
        textStyle='heading.2'
        emphasis='strong'
        colorPalette='accent'
        interactive
        lineClamp={2}
        className='custom-class'
      >
        Styled Text
      </Text>
    )
    const text = getByText('Styled Text')
    expect(text).toHaveClass(
      'text',
      'text--emphasis_strong',
      'text--interactive_true',
      'textStyle_heading.2',
      'color-palette_accent',
      'lc_2',
      'custom-class'
    )
  })
})
