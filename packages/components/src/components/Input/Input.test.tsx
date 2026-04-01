import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Input } from '.'

describe('Input', () => {
  it('renders with default props', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')!
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveClass('intent-neutral')
  })

  it('renders with different intents', () => {
    const { container, rerender } = render(<Input intent='accent' />)
    let input = container.querySelector('input')!
    expect(input).toHaveClass('intent-accent')

    rerender(<Input intent='danger' />)
    input = container.querySelector('input')!
    expect(input).toHaveClass('intent-danger')

    rerender(<Input intent='success' />)
    input = container.querySelector('input')!
    expect(input).toHaveClass('intent-success')
  })

  it('renders with different emphasis', () => {
    const { container, rerender } = render(<Input emphasis='default' />)
    let input = container.querySelector('input')!
    expect(input).toHaveClass('emphasis-sunken')

    rerender(<Input emphasis='subtle' />)
    input = container.querySelector('input')!
    expect(input).toHaveClass('emphasis-subtle-surface')
  })

  it('renders with different sizes', () => {
    const { container, rerender } = render(<Input size='sm' />)
    let input = container.querySelector('input')!
    expect(input).toHaveClass('h-8')

    rerender(<Input size='md' />)
    input = container.querySelector('input')!
    expect(input).toHaveClass('h-10')

    rerender(<Input size='lg' />)
    input = container.querySelector('input')!
    expect(input).toHaveClass('h-12')
  })

  it('handles disabled state', () => {
    const { container } = render(<Input disabled />)
    expect(container.querySelector('input')).toBeDisabled()
  })

  it('accepts user input', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<Input onChange={handleChange} />)
    const input = container.querySelector('input')!
    await user.type(input, 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(<Input className='custom-class' />)
    expect(container.querySelector('input')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Input placeholder='Enter text' name='test-input' />
    )
    const input = container.querySelector('input')!
    expect(input).toHaveAttribute('placeholder', 'Enter text')
    expect(input).toHaveAttribute('name', 'test-input')
  })
})
