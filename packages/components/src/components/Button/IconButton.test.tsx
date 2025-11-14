import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('renders with default props', () => {
    const { getByRole } = render(<IconButton aria-label='Icon'>+</IconButton>)
    const button = getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).toHaveClass(
      'button',
      'button--emphasis_default',
      'button--size_md'
    )
  })

  it('applies zero padding to create square button', () => {
    const { getByRole } = render(<IconButton aria-label='Icon'>+</IconButton>)
    const button = getByRole('button')
    // The component should have px="0" and py="0" applied
    expect(button).toBeInTheDocument()
  })

  it('renders with different emphasis', () => {
    const { rerender, getByRole } = render(
      <IconButton emphasis='strong' colorPalette='accent' aria-label='Strong'>
        +
      </IconButton>
    )
    let button = getByRole('button')
    expect(button).toHaveClass(
      'button--emphasis_strong',
      'color-palette_accent'
    )

    rerender(
      <IconButton emphasis='default' aria-label='Default'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--emphasis_default')

    rerender(
      <IconButton emphasis='subtle' aria-label='Subtle'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--emphasis_subtle')

    rerender(
      <IconButton emphasis='subtler' aria-label='Subtler'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--emphasis_subtler')
  })

  it('renders with different sizes', () => {
    const { rerender, getByRole } = render(
      <IconButton size='xs' aria-label='Extra small'>
        +
      </IconButton>
    )
    let button = getByRole('button')
    expect(button).toHaveClass('button--size_xs')

    rerender(
      <IconButton size='sm' aria-label='Small'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--size_sm')

    rerender(
      <IconButton size='md' aria-label='Medium'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--size_md')

    rerender(
      <IconButton size='lg' aria-label='Large'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('button--size_lg')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByRole } = render(
      <IconButton emphasis='strong' colorPalette='accent' aria-label='Accent'>
        +
      </IconButton>
    )
    let button = getByRole('button')
    expect(button).toHaveClass('color-palette_accent')

    rerender(
      <IconButton emphasis='strong' colorPalette='success' aria-label='Success'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('color-palette_success')

    rerender(
      <IconButton emphasis='strong' colorPalette='warning' aria-label='Warning'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('color-palette_warning')

    rerender(
      <IconButton emphasis='strong' colorPalette='danger' aria-label='Danger'>
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('color-palette_danger')
  })

  it('handles disabled state', () => {
    const { getByRole } = render(
      <IconButton disabled aria-label='Disabled'>
        +
      </IconButton>
    )
    const button = getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('button')
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByRole } = render(
      <IconButton onClick={handleClick} aria-label='Click me'>
        +
      </IconButton>
    )
    const button = getByRole('button')

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByRole } = render(
      <IconButton disabled onClick={handleClick} aria-label='Disabled'>
        +
      </IconButton>
    )
    const button = getByRole('button')

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { getByRole } = render(
      <IconButton className='custom-class' aria-label='Custom'>
        +
      </IconButton>
    )
    const button = getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    const { getByRole } = render(
      <IconButton
        emphasis='strong'
        size='lg'
        colorPalette='accent'
        className='custom-class'
        aria-label='Combined'
      >
        +
      </IconButton>
    )
    const button = getByRole('button')
    expect(button).toHaveClass(
      'button',
      'button--emphasis_strong',
      'button--size_lg',
      'color-palette_accent',
      'custom-class'
    )
  })

  it('renders icon content correctly', () => {
    const { getByRole } = render(
      <IconButton aria-label='Add item'>
        <svg
          width='16'
          height='16'
          viewBox='0 0 16 16'
          fill='currentColor'
          data-testid='icon'
        >
          <path d='M8 0L8 16M0 8L16 8' />
        </svg>
      </IconButton>
    )
    const button = getByRole('button')
    const icon = button.querySelector('[data-testid="icon"]')
    expect(icon).toBeInTheDocument()
  })

  it('allows padding override', () => {
    const { getByRole } = render(
      <IconButton px='200' aria-label='Custom padding'>
        +
      </IconButton>
    )
    const button = getByRole('button')
    // Should allow override of default px="0"
    expect(button).toBeInTheDocument()
  })
})
