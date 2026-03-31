import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { IconButton } from './IconButton'

describe('IconButton', () => {
  it('renders with default icon size', () => {
    const { getByRole } = render(<IconButton aria-label="Icon">+</IconButton>)
    const button = getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).toHaveClass('size-10') // icon-md default
  })

  it('renders with different emphasis', () => {
    const { rerender, getByRole } = render(
      <IconButton emphasis="strong" intent="accent" aria-label="Strong">
        +
      </IconButton>
    )
    let button = getByRole('button')
    expect(button).toHaveClass('emphasis-strong', 'intent-accent')

    rerender(
      <IconButton emphasis="subtle" aria-label="Subtle">
        +
      </IconButton>
    )
    button = getByRole('button')
    expect(button).toHaveClass('emphasis-subtle')
  })

  it('renders with different intents', () => {
    const { rerender, getByRole } = render(
      <IconButton intent="accent" aria-label="Accent">
        +
      </IconButton>
    )
    expect(getByRole('button')).toHaveClass('intent-accent')

    rerender(
      <IconButton intent="danger" aria-label="Danger">
        +
      </IconButton>
    )
    expect(getByRole('button')).toHaveClass('intent-danger')
  })

  it('handles disabled state', () => {
    const { getByRole } = render(
      <IconButton disabled aria-label="Disabled">
        +
      </IconButton>
    )
    expect(getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByRole } = render(
      <IconButton onClick={handleClick} aria-label="Click me">
        +
      </IconButton>
    )
    await user.click(getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    const { getByRole } = render(
      <IconButton disabled onClick={handleClick} aria-label="Disabled">
        +
      </IconButton>
    )
    await user.click(getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders icon content correctly', () => {
    const { getByRole } = render(
      <IconButton aria-label="Add item">
        <svg data-testid="icon" viewBox="0 0 16 16">
          <path d="M8 0L8 16M0 8L16 8" />
        </svg>
      </IconButton>
    )
    const icon = getByRole('button').querySelector('[data-testid="icon"]')
    expect(icon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { getByRole } = render(
      <IconButton className="custom-class" aria-label="Custom">
        +
      </IconButton>
    )
    expect(getByRole('button')).toHaveClass('custom-class')
  })
})
