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
    expect(toggle).toHaveClass('emphasis-normal')
    expect(toggle).toHaveClass('data-[pressed]:emphasis-strong')
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
      'emphasis-subtler',
      '[&.is-interactive[data-pressed]]:emphasis-subtle'
    )
    expect(toggle).not.toHaveClass('data-[pressed]:emphasis-strong')
  })

  it('steps subtle up to strong when pressed', () => {
    render(<Toggle emphasis='subtle'>Bold</Toggle>)
    expect(screen.getByRole('button')).toHaveClass(
      'emphasis-subtle',
      'data-[pressed]:emphasis-strong'
    )
  })

  it('takes Button sizes, including icon sizes', () => {
    const { rerender } = render(<Toggle size='sm'>Bold</Toggle>)
    expect(screen.getByRole('button')).toHaveClass('btn-sm')
    rerender(
      <Toggle size='icon-md' aria-label='Favourite'>
        <svg />
      </Toggle>
    )
    expect(screen.getByRole('button', { name: 'Favourite' })).toHaveClass(
      'btn-icon-md'
    )
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
