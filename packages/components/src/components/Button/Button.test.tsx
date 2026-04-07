import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '.'

describe('Button', () => {
  it('renders with default props', () => {
    const { getByText } = render(<Button>Click me</Button>)
    const button = getByText('Click me')
    expect(button).toBeInTheDocument()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).not.toHaveClass('intent-neutral')
    expect(button).toHaveClass('is-interactive')
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Button emphasis='strong' intent='accent'>
        Strong
      </Button>
    )
    let button = getByText('Strong')
    expect(button).toHaveClass('emphasis-strong', 'intent-accent')

    rerender(<Button emphasis='normal'>Default</Button>)
    button = getByText('Default')
    expect(button).toHaveClass('emphasis-normal')

    rerender(<Button emphasis='subtle'>Subtle</Button>)
    button = getByText('Subtle')
    expect(button).toHaveClass('emphasis-subtle')

    rerender(<Button emphasis='subtler'>Subtler</Button>)
    button = getByText('Subtler')
    expect(button).toHaveClass('emphasis-subtler')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Button size='sm'>Small</Button>)
    let button = getByText('Small')
    expect(button).toHaveClass('btn-sm')

    rerender(<Button size='md'>Medium</Button>)
    button = getByText('Medium')
    expect(button).toHaveClass('btn-md')

    rerender(<Button size='lg'>Large</Button>)
    button = getByText('Large')
    expect(button).toHaveClass('btn-lg')
  })

  it('renders with different intents', () => {
    const { rerender, getByText } = render(
      <Button intent='accent'>Accent</Button>
    )
    let button = getByText('Accent')
    expect(button).toHaveClass('intent-accent')

    rerender(<Button intent='success'>Success</Button>)
    button = getByText('Success')
    expect(button).toHaveClass('intent-success')

    rerender(<Button intent='danger'>Danger</Button>)
    button = getByText('Danger')
    expect(button).toHaveClass('intent-danger')
  })

  it('handles disabled state', () => {
    const { getByText } = render(<Button disabled>Disabled</Button>)
    const button = getByText('Disabled')
    expect(button).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button onClick={handleClick}>Click me</Button>
    )
    await user.click(getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button disabled onClick={handleClick}>
        Click me
      </Button>
    )
    await user.click(getByText('Click me'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <Button className='custom-class'>Custom</Button>
    )
    expect(getByText('Custom')).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Button
        emphasis='strong'
        size='lg'
        intent='accent'
        className='custom-class'
      >
        Combined
      </Button>
    )
    const button = getByText('Combined')
    expect(button).toHaveClass(
      'emphasis-strong',
      'intent-accent',
      'btn-lg',
      'custom-class'
    )
  })
})
