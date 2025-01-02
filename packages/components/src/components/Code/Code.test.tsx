import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code } from '.'

describe('Code', () => {
  it('renders with default props', () => {
    render(<Code>const x = 42;</Code>)
    const code = screen.getByText('const x = 42;')
    expect(code).toBeInTheDocument()
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code).toHaveClass(
      'textStyle_code',
      'bg-c_bg.subtle',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      'bd-c_border.subtlest'
    )
  })

  it('renders with different appearances', () => {
    const { rerender } = render(<Code appearance='outline'>outline code</Code>)
    let code = screen.getByText('outline code')
    expect(code).toHaveClass('bd-c_border.subtlest')

    rerender(<Code appearance='ghost'>ghost code</Code>)
    code = screen.getByText('ghost code')
    expect(code).toHaveClass('bd-c_transparent')
  })

  it('applies custom font size', () => {
    render(<Code fontSize='lg'>Large code</Code>)
    const code = screen.getByText('Large code')
    expect(code).toHaveClass('fs_lg')
  })

  it('inherits Text props', () => {
    render(<Code color='fg.accent'>Colored code</Code>)
    const code = screen.getByText('Colored code')
    expect(code).toHaveClass('c_fg.accent')
  })

  it('applies line clamp', () => {
    render(<Code lineClamp={2}>Clamped code</Code>)
    const code = screen.getByText('Clamped code')
    expect(code).toHaveClass('lc_2')
  })

  it('combines multiple props', () => {
    render(
      <Code appearance='ghost' fontSize='lg' color='fg.accent' className='custom-class'>
        Combined styles
      </Code>
    )
    const code = screen.getByText('Combined styles')
    expect(code).toHaveClass(
      'textStyle_code',
      'bg-c_bg.subtle',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      'bd-c_transparent',
      'fs_lg',
      'c_fg.accent',
      'custom-class'
    )
  })
})
