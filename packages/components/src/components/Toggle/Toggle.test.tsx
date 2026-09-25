import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Toggle } from '.'

describe('Toggle', () => {
  it('renders an unpressed button styled like Button', () => {
    render(<Toggle>Bold</Toggle>)
    const toggle = screen.getByRole('button', { name: 'Bold' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('data-slot', 'toggle')
    expect(toggle).toHaveClass('btn', 'is-interactive', 'btn-md')
    expect(toggle).toHaveClass(
      'not-data-[pressed]:emphasis-normal',
      'data-[pressed]:emphasis-strong'
    )
    expect(toggle).not.toHaveClass('intent-neutral')
  })

  it('toggles pressed on click and reports the change', async () => {
    const onPressedChange = vi.fn()
    const user = userEvent.setup()
    render(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>)
    const toggle = screen.getByRole('button', { name: 'Bold' })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveAttribute('data-pressed')
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything())
  })

  it('toggles with Space and Enter from the keyboard', async () => {
    const user = userEvent.setup()
    render(<Toggle>Bold</Toggle>)
    const toggle = screen.getByRole('button', { name: 'Bold' })
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('steps subtler up to subtle when pressed', () => {
    render(
      <Toggle emphasis='subtler' defaultPressed>
        Bold
      </Toggle>
    )
    const toggle = screen.getByRole('button', { name: 'Bold' })
    expect(toggle).toHaveClass(
      'not-data-[pressed]:emphasis-subtler',
      'data-[pressed]:emphasis-subtle'
    )
    expect(toggle).not.toHaveClass('data-[pressed]:emphasis-strong')
  })

  it('steps subtle up to strong when pressed', () => {
    render(<Toggle emphasis='subtle'>Bold</Toggle>)
    expect(screen.getByRole('button')).toHaveClass(
      'not-data-[pressed]:emphasis-subtle',
      'data-[pressed]:emphasis-strong'
    )
  })

  it('takes Button sizes and goes square with a lone icon', () => {
    const { rerender } = render(<Toggle size='sm'>Bold</Toggle>)
    expect(screen.getByRole('button')).toHaveClass('btn-sm')
    expect(screen.getByRole('button')).not.toHaveAttribute('data-icon-only')
    rerender(
      <Toggle aria-label='Favourite'>
        <svg />
      </Toggle>
    )
    const icon = screen.getByRole('button', { name: 'Favourite' })
    expect(icon).toHaveAttribute('data-icon-only')
    expect(icon).toHaveClass('btn-md', 'data-[icon-only]:btn-icon-md')
  })

  it('keeps text padding when a visible label has an aria-label', () => {
    render(<Toggle aria-label='Last 7 days'>7d</Toggle>)
    expect(
      screen.getByRole('button', { name: 'Last 7 days' })
    ).not.toHaveAttribute('data-icon-only')
  })

  it('applies an intent class', () => {
    render(<Toggle intent='danger'>Mute</Toggle>)
    expect(screen.getByRole('button')).toHaveClass('intent-danger')
  })

  it('respects controlled pressed', async () => {
    const user = userEvent.setup()
    render(<Toggle pressed={false}>Bold</Toggle>)
    const toggle = screen.getByRole('button')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup()
    render(<Toggle disabled>Bold</Toggle>)
    const toggle = screen.getByRole('button')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle).toHaveAttribute('data-disabled')
  })
})
