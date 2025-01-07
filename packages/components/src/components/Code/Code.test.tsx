import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code } from './index'

describe('Code', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Code>const x = 42;</Code>)
    const code = getByText('const x = 42;')
    expect(code).toBeInTheDocument()
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code).toHaveClass(
      'bg-c_neutral.surface.subtle',
      'textStyle_code',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      'bd-c_neutral.border'
    )
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Code emphasis='strong'>strong code</Code>
    )
    let code = getByText('strong code')
    expect(code).toHaveClass(
      'bd-c_neutral.border.strong',
      'bg-c_neutral.surface.strong'
    )

    rerender(<Code emphasis='subtle'>subtle code</Code>)
    code = getByText('subtle code')
    expect(code).toHaveClass('bd-c_neutral.border.subtle')

    rerender(<Code emphasis='muted'>muted code</Code>)
    code = getByText('muted code')
    expect(code).toHaveClass('bd-c_transparent')
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
        emphasis='muted'
        fontSize='lg'
        color='accent.fg'
        className='custom-class'
      >
        Combined styles
      </Code>
    )
    const code = getByText('Combined styles')
    expect(code).toHaveClass(
      'bg-c_neutral.surface.subtle',
      'textStyle_code',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      'bd-c_transparent',
      'fs_lg',
      'c_accent.fg',
      'custom-class'
    )
  })
})
