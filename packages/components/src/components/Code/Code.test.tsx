import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code } from './index'

describe('Code', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Code>const x = 42;</Code>)
    const code = getByText('const x = 42;')
    expect(code).toBeInTheDocument()
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code).toHaveClass('code', 'code--emphasis_default')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Code emphasis='strong'>strong code</Code>
    )
    let code = getByText('strong code')
    expect(code).toHaveClass('code--emphasis_strong')

    rerender(<Code emphasis='subtle'>subtle code</Code>)
    code = getByText('subtle code')
    expect(code).toHaveClass('code--emphasis_subtle')

    rerender(<Code emphasis='subtler'>subtler code</Code>)
    code = getByText('subtler code')
    expect(code).toHaveClass('code--emphasis_subtler')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByText } = render(
      <Code colorPalette='accent'>accent code</Code>
    )
    let code = getByText('accent code')
    expect(code).toBeInTheDocument()

    rerender(<Code colorPalette='success'>success code</Code>)
    code = getByText('success code')
    expect(code).toBeInTheDocument()

    rerender(<Code colorPalette='danger'>danger code</Code>)
    code = getByText('danger code')
    expect(code).toBeInTheDocument()
  })

  it('applies custom font size', () => {
    const { getByText } = render(<Code fontSize='lg'>Large code</Code>)
    const code = getByText('Large code')
    expect(code).toHaveClass('fs_lg')
  })

  it('inherits Text props', () => {
    const { getByText } = render(<Code color='accent.fg'>Colored code</Code>)
    const code = getByText('Colored code')
    expect(code).toHaveClass('c_accent.fg')
  })

  it('applies line clamp', () => {
    const { getByText } = render(<Code lineClamp={2}>Clamped code</Code>)
    const code = getByText('Clamped code')
    expect(code).toHaveClass('lc_2')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Code
        emphasis='subtler'
        colorPalette='accent'
        fontSize='lg'
        className='custom-class'
      >
        Combined styles
      </Code>
    )
    const code = getByText('Combined styles')
    expect(code).toHaveClass(
      'code',
      'code--emphasis_subtler',
      'color-palette_accent',
      'fs_lg',
      'custom-class'
    )
  })
})
