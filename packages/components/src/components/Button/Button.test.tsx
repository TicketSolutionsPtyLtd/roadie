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
    expect(button).toHaveClass(
      'button',
      'button--emphasis_default',
      'button--size_md'
    )
  })

  it('renders with different emphasis', () => {
    const { rerender, getByText } = render(
      <Button emphasis='strong' colorPalette='accent'>
        Strong
      </Button>
    )
    let button = getByText('Strong')
    expect(button).toHaveClass(
      'button--emphasis_strong',
      'color-palette_accent'
    )

    rerender(<Button emphasis='default'>Default</Button>)
    button = getByText('Default')
    expect(button).toHaveClass('button--emphasis_default')

    rerender(<Button emphasis='subtle'>Subtle</Button>)
    button = getByText('Subtle')
    expect(button).toHaveClass('button--emphasis_subtle')

    rerender(<Button emphasis='subtler'>subtler</Button>)
    button = getByText('subtler')
    expect(button).toHaveClass('button--emphasis_subtler')
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Button size='sm'>Small</Button>)
    let button = getByText('Small')
    expect(button).toHaveClass('button--size_sm')

    rerender(<Button size='md'>Medium</Button>)
    button = getByText('Medium')
    expect(button).toHaveClass('button--size_md')

    rerender(<Button size='lg'>Large</Button>)
    button = getByText('Large')
    expect(button).toHaveClass('button--size_lg')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByText } = render(
      <Button emphasis='strong' colorPalette='accent'>
        Accent
      </Button>
    )
    let button = getByText('Accent')
    expect(button).toHaveClass('color-palette_accent')

    rerender(
      <Button emphasis='strong' colorPalette='success'>
        Success
      </Button>
    )
    button = getByText('Success')
    expect(button).toHaveClass('color-palette_success')

    rerender(
      <Button emphasis='strong' colorPalette='warning'>
        Warning
      </Button>
    )
    button = getByText('Warning')
    expect(button).toHaveClass('color-palette_warning')

    rerender(
      <Button emphasis='strong' colorPalette='danger'>
        Danger
      </Button>
    )
    button = getByText('Danger')
    expect(button).toHaveClass('color-palette_danger')
  })

  it('handles disabled state', () => {
    const { getByText } = render(<Button disabled>Disabled</Button>)
    const button = getByText('Disabled')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('button')
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button onClick={handleClick}>Click me</Button>
    )
    const button = getByText('Click me')

    await user.click(button)
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
    const button = getByText('Click me')

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { getByText } = render(
      <Button className='custom-class'>Custom</Button>
    )
    const button = getByText('Custom')
    expect(button).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    const { getByText } = render(
      <Button
        emphasis='strong'
        size='lg'
        colorPalette='accent'
        className='custom-class'
      >
        Combined
      </Button>
    )
    const button = getByText('Combined')
    expect(button).toHaveClass(
      'button',
      'button--emphasis_strong',
      'button--size_lg',
      'color-palette_accent',
      'custom-class'
    )
  })
})
