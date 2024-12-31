/// <reference types="@testing-library/jest-dom" />
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './index'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByText('Click me')
    expect(button).toBeInTheDocument()
    expect(button.tagName.toLowerCase()).toBe('button')
    expect(button).toHaveClass(
      'd_inline-flex',
      'ai_center',
      'jc_center',
      'bg-c_bg.subtle',
      'bdr_050',
      'fw_semibold',
      'ff_ui',
      'cursor_pointer',
      'bd_1px_solid',
      'trs_all_0.2s',
      'disabled:op_0.4',
      'disabled:cursor_not-allowed',
      'disabled:bg-c_bg.disabled',
      'disabled:c_fg.disabled',
      'focus:ring_none',
      'focusVisible:ring_2px_solid',
      'focusVisible:ring-c_border.focused',
      'bd-c_border.subtle',
      'c_fg.subtle',
      'hover:bg-c_bg.subtle.hovered',
      'active:bg-c_bg.subtle.pressed',
      'min-h_500',
      'fs_md',
      'md:fs_bpmd.md',
      'lg:fs_bplg.md',
      'px_200',
      'py_100'
    )
  })

  it('renders with different appearances', () => {
    const { rerender } = render(<Button appearance='solid'>Solid</Button>)
    let button = screen.getByText('Solid')
    expect(button).toHaveClass(
      'c_fg.subtle',
      'bd-c_border.subtle',
      'bg-c_bg.subtle',
      'hover:bg-c_bg.subtle.hovered',
      'active:bg-c_bg.subtle.pressed'
    )

    rerender(<Button appearance='outline'>Outline</Button>)
    button = screen.getByText('Outline')
    expect(button).toHaveClass(
      'bd_1px_solid',
      'bd-c_border.subtle',
      'c_fg.subtle',
      'hover:c_fg.default',
      'hover:bd-c_border.hovered',
      'hover:bg-c_bg.hovered',
      'active:c_fg.default',
      'active:bd-c_border.pressed',
      'active:bg-c_bg.pressed'
    )

    rerender(<Button appearance='ghost'>Ghost</Button>)
    button = screen.getByText('Ghost')
    expect(button).toHaveClass(
      'c_fg.subtle',
      'bd-c_transparent',
      'hover:c_fg.default',
      'hover:bg-c_bg.hovered',
      'active:c_fg.default',
      'active:bg-c_bg.pressed'
    )
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>)
    let button = screen.getByText('Small')
    expect(button).toHaveClass(
      'min-h_400',
      'fs_sm',
      'md:fs_bpmd.sm',
      'lg:fs_bplg.sm',
      'px_200',
      'py_075'
    )

    rerender(<Button size='md'>Medium</Button>)
    button = screen.getByText('Medium')
    expect(button).toHaveClass(
      'min-h_500',
      'fs_md',
      'md:fs_bpmd.md',
      'lg:fs_bplg.md',
      'px_200',
      'py_100'
    )

    rerender(<Button size='lg'>Large</Button>)
    button = screen.getByText('Large')
    expect(button).toHaveClass(
      'min-h_600',
      'fs_lg',
      'md:fs_bpmd.lg',
      'lg:fs_bplg.lg',
      'px_300',
      'py_150'
    )
  })

  it('renders with different colors', () => {
    const { rerender } = render(<Button color='subtle'>Subtle</Button>)
    let button = screen.getByText('Subtle')
    expect(button).toHaveClass('c_fg.subtle')

    rerender(
      <Button color='accent' appearance='solid'>
        Accent
      </Button>
    )
    button = screen.getByText('Accent')
    expect(button).toHaveClass(
      'bg-c_bg.accent.bold',
      'c_fg.accent.inverse',
      'bd-c_border.accent',
      'hover:bg-c_bg.accent.bold.hovered',
      'active:bg-c_bg.accent.bold.pressed'
    )

    rerender(
      <Button color='success' appearance='solid'>
        Success
      </Button>
    )
    button = screen.getByText('Success')
    expect(button).toHaveClass(
      'bg-c_bg.success.bold',
      'c_fg.success.inverse',
      'bd-c_border.success',
      'hover:bg-c_bg.success.bold.hovered',
      'active:bg-c_bg.success.bold.pressed'
    )

    rerender(
      <Button color='warning' appearance='solid'>
        Warning
      </Button>
    )
    button = screen.getByText('Warning')
    expect(button).toHaveClass(
      'bg-c_bg.warning.bold',
      'c_fg.warning.inverse',
      'bd-c_border.warning',
      'hover:bg-c_bg.warning.bold.hovered',
      'active:bg-c_bg.warning.bold.pressed'
    )

    rerender(
      <Button color='danger' appearance='solid'>
        Danger
      </Button>
    )
    button = screen.getByText('Danger')
    expect(button).toHaveClass(
      'bg-c_bg.danger.bold',
      'c_fg.danger.inverse',
      'bd-c_border.danger',
      'hover:bg-c_bg.danger.bold.hovered',
      'active:bg-c_bg.danger.bold.pressed'
    )
  })

  it('handles disabled state', () => {
    render(<Button isDisabled>Disabled</Button>)
    const button = screen.getByText('Disabled')
    expect(button).toBeDisabled()
    expect(button).toHaveClass(
      'disabled:op_0.4',
      'disabled:cursor_not-allowed',
      'disabled:bg-c_bg.disabled',
      'disabled:c_fg.disabled'
    )
  })

  it('calls onPress when clicked', async () => {
    const handlePress = vi.fn()
    const user = userEvent.setup()

    render(<Button onPress={handlePress}>Click me</Button>)
    const button = screen.getByText('Click me')

    await user.click(button)
    expect(handlePress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', async () => {
    const handlePress = vi.fn()
    const user = userEvent.setup()

    render(
      <Button isDisabled onPress={handlePress}>
        Click me
      </Button>
    )
    const button = screen.getByText('Click me')

    await user.click(button)
    expect(handlePress).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Button className='custom-class'>Custom</Button>)
    const button = screen.getByText('Custom')
    expect(button).toHaveClass('custom-class')
  })

  it('combines multiple props', () => {
    render(
      <Button
        appearance='solid'
        size='lg'
        color='accent'
        className='custom-class'
      >
        Combined
      </Button>
    )
    const button = screen.getByText('Combined')
    expect(button).toHaveClass(
      // Base classes
      'd_inline-flex',
      'ai_center',
      'jc_center',
      'bdr_050',
      'fw_semibold',
      'ff_ui',
      'cursor_pointer',
      'bd_1px_solid',
      'trs_all_0.2s',
      // Size classes
      'min-h_600',
      'fs_lg',
      'md:fs_bpmd.lg',
      'lg:fs_bplg.lg',
      'px_300',
      'py_150',
      // Color + Appearance classes
      'bg-c_bg.accent.bold',
      'c_fg.accent.inverse',
      'bd-c_border.accent',
      'hover:bg-c_bg.accent.bold.hovered',
      'active:bg-c_bg.accent.bold.pressed',
      // Custom class
      'custom-class'
    )
  })
})
