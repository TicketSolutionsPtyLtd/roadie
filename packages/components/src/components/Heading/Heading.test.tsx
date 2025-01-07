import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Heading } from './index'

describe('Heading', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Heading>Hello World</Heading>)
    const heading = getByText('Hello World')
    expect(heading).toBeInTheDocument()
    expect(heading.tagName.toLowerCase()).toBe('h2')
    expect(heading).toHaveClass('textStyle_display.ui')
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
      expect(heading).toHaveClass('textStyle_display.ui')
      rerender(<></>)
    })
  })

  it('applies text style', () => {
    const { getByText } = render(
      <Heading textStyle='display.ui.1'>Large Heading</Heading>
    )
    const heading = getByText('Large Heading')
    expect(heading).toHaveClass('textStyle_display.ui.1')
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
    expect(heading).toHaveClass('textStyle_display.ui', 'c_neutral.fg.subtle')
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

  it('combines multiple props', () => {
    const { getByText } = render(
      <Heading
        as='h1'
        textStyle='display.ui.1'
        color='accent.fg'
        className='custom-class'
      >
        Combined styles
      </Heading>
    )
    const heading = getByText('Combined styles')
    expect(heading.tagName.toLowerCase()).toBe('h1')
    expect(heading).toHaveClass(
      'textStyle_display.ui.1',
      'c_accent.fg',
      'custom-class'
    )
  })
})
