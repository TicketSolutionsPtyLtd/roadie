import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Code } from './index'

describe('Code', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Code>const x = 42;</Code>)
    const code = getByText('const x = 42;')
    expect(code).toBeInTheDocument()
    expect(code.tagName.toLowerCase()).toBe('code')
    expect(code).toHaveClass('emphasis-normal')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Code emphasis='strong'>strong code</Code>
    )
    expect(getByText('strong code')).toHaveClass('emphasis-strong')

    rerender(<Code emphasis='subtle'>subtle code</Code>)
    expect(getByText('subtle code')).toHaveClass('emphasis-subtle')

    rerender(<Code emphasis='subtler'>subtler code</Code>)
    expect(getByText('subtler code')).toHaveClass('emphasis-subtler')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Code intent='accent'>accent code</Code>
    )
    expect(getByText('accent code')).toHaveClass('intent-accent')

    rerender(<Code intent='danger'>danger code</Code>)
    expect(getByText('danger code')).toHaveClass('intent-danger')
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <Code className='custom-class'>Styled code</Code>
    )
    expect(getByText('Styled code')).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Code emphasis='subtler' intent='accent' className='custom-class'>
        Combined styles
      </Code>
    )
    const code = getByText('Combined styles')
    expect(code).toHaveClass(
      'emphasis-subtler',
      'intent-accent',
      'custom-class'
    )
  })
})
