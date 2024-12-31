/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code } from './index'

describe('Code', () => {
  it('renders with default props', () => {
    render(<Code>const x = 42;</Code>)
    const code = screen.getByText('const x = 42;')
    expect(code).toBeInTheDocument()
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code).toHaveClass(
      // Text component base classes
      'textStyle_code',
      // Code specific classes
      'bg-c_bg.subtle',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      'bd-c_border.subtlest',
      'fs_sm'
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
    render(<Code fontSize='lg'>large code</Code>)
    const code = screen.getByText('large code')
    expect(code).toHaveClass('fs_lg')
  })

  it('inherits Text props', () => {
    render(
      <Code color='fg.subtle' data-testid='code' title='tooltip' aria-label='Accessible code'>
        styled code
      </Code>
    )
    const code = screen.getByTestId('code')
    expect(code).toHaveClass('c_fg.subtle')
    expect(code).toHaveAttribute('title', 'tooltip')
    expect(code).toHaveAttribute('aria-label', 'Accessible code')
  })

  it('applies line clamp', () => {
    render(
      <Code lineClamp={2}>
        const multiLine = ` This is a long piece of code that should be clamped `;
      </Code>
    )
    const code = screen.getByText(/const multiLine/)
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
      // Base classes
      'textStyle_code',
      'bg-c_bg.subtle',
      'px_050',
      'bdr_050',
      'bd_1px_solid',
      // Appearance
      'bd-c_transparent',
      // Font size
      'fs_lg',
      // Color
      'c_fg.accent',
      // Custom class
      'custom-class'
    )
  })
})
