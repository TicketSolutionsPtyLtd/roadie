import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Textarea } from '.'

describe('Textarea', () => {
  it('renders with default props', () => {
    const { container } = render(<Textarea />)
    const textarea = container.querySelector('textarea')!
    expect(textarea).toBeInTheDocument()
    expect(textarea).not.toHaveClass('intent-neutral')
  })

  it('renders with different intents', () => {
    const { container, rerender } = render(<Textarea intent='accent' />)
    let textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('intent-accent')

    rerender(<Textarea intent='danger' />)
    textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('intent-danger')

    rerender(<Textarea intent='success' />)
    textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('intent-success')
  })

  it('renders with different emphasis', () => {
    const { container, rerender } = render(<Textarea emphasis='normal' />)
    let textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('emphasis-sunken')

    rerender(<Textarea emphasis='subtle' />)
    textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('bg-subtle')
  })

  it('renders with different sizes', () => {
    const { container, rerender } = render(<Textarea size='sm' />)
    let textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('text-base')

    rerender(<Textarea size='md' />)
    textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('text-base')

    rerender(<Textarea size='lg' />)
    textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('text-base')
  })

  it('handles disabled state', () => {
    const { container } = render(<Textarea disabled />)
    expect(container.querySelector('textarea')).toBeDisabled()
  })

  it('accepts user input', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    const { container } = render(<Textarea onChange={handleChange} />)
    const textarea = container.querySelector('textarea')!
    await user.type(textarea, 'hello')
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(<Textarea className='custom-class' />)
    expect(container.querySelector('textarea')).toHaveClass('custom-class')
  })

  it('forwards HTML attributes', () => {
    const { container } = render(
      <Textarea placeholder='Enter text' name='test-textarea' rows={5} />
    )
    const textarea = container.querySelector('textarea')!
    expect(textarea).toHaveAttribute('placeholder', 'Enter text')
    expect(textarea).toHaveAttribute('name', 'test-textarea')
    expect(textarea).toHaveAttribute('rows', '5')
  })

  it('applies autoResize classes', () => {
    const { container } = render(<Textarea autoResize />)
    const textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('resize-none')
    expect(textarea).toHaveClass('min-h-20')
    expect(textarea).not.toHaveClass('resize-y')
  })

  it('has resize-y by default without autoResize', () => {
    const { container } = render(<Textarea />)
    const textarea = container.querySelector('textarea')!
    expect(textarea).toHaveClass('resize-y')
  })
})
