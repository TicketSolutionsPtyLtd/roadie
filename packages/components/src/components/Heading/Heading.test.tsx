import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Heading } from './index'

describe('Heading', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Heading>Hello World</Heading>)
    const heading = getByText('Hello World')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName.toLowerCase()).toBe('h2')
    expect(heading).toHaveClass('heading', 'heading--emphasis_default')
  })

  it('renders with different heading levels', () => {
    const levels: Array<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'> = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6'
    ]

    levels.forEach((level) => {
      const { rerender, getByText } = render(
        <Heading as={level}>{level} Heading</Heading>
      )
      const heading = getByText(`${level} Heading`)
      expect(heading).toBeInTheDocument()
      expect(heading.tagName.toLowerCase()).toBe(level)
      expect(heading).toHaveClass('heading')
      rerender(<></>)
    })
  })

  it('applies text style', () => {
    const { getByText } = render(
      <Heading textStyle='display.xl'>Large Heading</Heading>
    )
    const heading = getByText('Large Heading')
    expect(heading).toHaveClass('textStyle_display.xl')
  })

  it('inherits Text props', () => {
    const { getByTestId } = render(
      <Heading
        color='neutral.fg.subtle'
        data-testid='heading'
        title='tooltip'
        aria-label='Accessible heading'
      >
        Styled Heading
      </Heading>
    )
    const heading = getByTestId('heading')
    expect(heading).toHaveClass('heading', 'c_neutral.fg.subtle')
    expect(heading).toHaveAttribute('title', 'tooltip')
    expect(heading).toHaveAttribute('aria-label', 'Accessible heading')
  })

  it('applies line clamp', () => {
    const { getByText } = render(
      <Heading lineClamp={2}>Multi-line heading that should be clamped</Heading>
    )
    const heading = getByText('Multi-line heading that should be clamped')
    expect(heading).toHaveClass('lc_2')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Heading emphasis='default'>Default Heading</Heading>
    )
    let heading = getByText('Default Heading')
    expect(heading).toHaveClass('heading--emphasis_default')

    rerender(<Heading emphasis='strong'>Strong Heading</Heading>)
    heading = getByText('Strong Heading')
    expect(heading).toHaveClass('heading--emphasis_strong')

    rerender(<Heading emphasis='subtle'>Subtle Heading</Heading>)
    heading = getByText('Subtle Heading')
    expect(heading).toHaveClass('heading--emphasis_subtle')

    rerender(<Heading emphasis='subtler'>Subtler Heading</Heading>)
    heading = getByText('Subtler Heading')
    expect(heading).toHaveClass('heading--emphasis_subtler')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByText } = render(
      <Heading colorPalette='neutral'>Neutral Heading</Heading>
    )
    let heading = getByText('Neutral Heading')
    expect(heading).toBeInTheDocument()

    rerender(<Heading colorPalette='brand'>Brand Heading</Heading>)
    heading = getByText('Brand Heading')
    expect(heading).toBeInTheDocument()

    rerender(<Heading colorPalette='success'>Success Heading</Heading>)
    heading = getByText('Success Heading')
    expect(heading).toBeInTheDocument()
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Heading
        as='h1'
        textStyle='display.xl'
        emphasis='strong'
        colorPalette='brand'
        className='custom-class'
      >
        Combined styles
      </Heading>
    )
    const heading = getByText('Combined styles')
    expect(heading.tagName.toLowerCase()).toBe('h1')
    expect(heading).toHaveClass(
      'heading',
      'heading--emphasis_strong',
      'textStyle_display.xl',
      'color-palette_brand',
      'custom-class'
    )
  })
})
