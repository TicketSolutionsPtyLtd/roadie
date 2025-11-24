import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Mark } from './index'

describe('Mark', () => {
  it('renders with default props', () => {
    const { container } = render(<Mark>Marked text</Mark>)
    const mark = container.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark).toHaveTextContent('Marked text')
    expect(mark).toHaveClass('mark')
  })

  it('applies color palette when provided', () => {
    const { container } = render(
      <Mark colorPalette='information'>Marked text</Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_information')
  })

  it('applies custom color palette', () => {
    const { container } = render(
      <Mark colorPalette='success'>Marked text</Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_success')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Mark className='custom-class'>Marked text</Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveClass('mark', 'custom-class')
  })

  it('forwards additional HTML attributes', () => {
    const { container } = render(
      <Mark data-testid='mark' title='tooltip'>
        Marked text
      </Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toHaveAttribute('data-testid', 'mark')
    expect(mark).toHaveAttribute('title', 'tooltip')
  })

  it('renders with different color palettes', () => {
    const { rerender, container } = render(
      <Mark colorPalette='accent'>Accent</Mark>
    )
    let mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_accent')

    rerender(<Mark colorPalette='brand'>Brand</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_brand')

    rerender(<Mark colorPalette='warning'>Warning</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_warning')

    rerender(<Mark colorPalette='danger'>Danger</Mark>)
    mark = container.querySelector('mark')
    expect(mark).toHaveClass('color-palette_danger')
  })

  it('renders children correctly', () => {
    const { container } = render(
      <Mark>
        This is <strong>important</strong> text
      </Mark>
    )
    const mark = container.querySelector('mark')
    expect(mark).toBeInTheDocument()
    expect(mark?.textContent).toBe('This is important text')
    const strong = mark?.querySelector('strong')
    expect(strong).toHaveTextContent('important')
  })
})
