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
      'd_inline-flex',
      'ai_center',
      'jc_center',
      'bg-c_colorPalette.surface.subtle',
      'bdr_050',
      'fw_medium',
      'ff_ui',
      'cursor_pointer',
      'bd-w_1px',
      'border-style_solid',
      'trs_all_0.2s',
      'disabled:op_0.4',
      'disabled:cursor_not-allowed',
      'disabled:c_colorPalette.fg.subtle',
      'focusVisible:ring-c_colorPalette.border.strong',
      'focusVisible:ring-w_2px',
      'focusVisible:outline-style_solid',
      'focusVisible:ring-o_2px',
      'bd-c_colorPalette.border',
      'c_colorPalette.fg',
      'hover:c_colorPalette.fg.hover',
      'hover:bd-c_colorPalette.border.hover',
      'hover:bg-c_colorPalette.surface.subtle.hover',
      'active:c_colorPalette.fg.active',
      'active:bd-c_colorPalette.border.active',
      'active:bg-c_colorPalette.surface.subtle.active',
      'min-h_500',
      'fs_md',
      'px_200',
      'py_100',
      'color-palette_neutral'
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
      'c_colorPalette.fg.inverted',
      'bg-c_colorPalette.solid.strong',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'color-palette_accent'
    )

    rerender(<Button emphasis='default'>Default</Button>)
    button = getByText('Default')
    expect(button).toHaveClass(
      'bd-c_colorPalette.border',
      'bg-c_colorPalette.surface.subtle',
      'c_colorPalette.fg',
      'hover:c_colorPalette.fg.hover',
      'hover:bd-c_colorPalette.border.hover',
      'hover:bg-c_colorPalette.surface.subtle.hover',
      'active:c_colorPalette.fg.active',
      'active:bd-c_colorPalette.border.active',
      'active:bg-c_colorPalette.surface.subtle.active',
      'color-palette_neutral'
    )

    rerender(<Button emphasis='subtle'>Subtle</Button>)
    button = getByText('Subtle')
    expect(button).toHaveClass(
      'bg-c_colorPalette.solid.subtle',
      'c_colorPalette.fg',
      'hover:c_colorPalette.fg.hover',
      'hover:bg-c_colorPalette.solid.subtle.hover',
      'active:c_colorPalette.fg.active',
      'active:bg-c_colorPalette.solid.subtle.active',
      'color-palette_neutral'
    )

    rerender(<Button emphasis='muted'>Muted</Button>)
    button = getByText('Muted')
    expect(button).toHaveClass(
      'c_colorPalette.fg',
      'hover:c_colorPalette.fg.hover',
      'hover:bg-c_colorPalette.solid.subtle.hover',
      'active:c_colorPalette.fg.active',
      'active:bg-c_colorPalette.solid.subtle.active',
      'color-palette_neutral'
    )
  })

  it('renders with different sizes', () => {
    const { rerender, getByText } = render(<Button size='sm'>Small</Button>)
    let button = getByText('Small')
    expect(button).toHaveClass('min-h_400', 'fs_sm', 'px_200', 'py_075')

    rerender(<Button size='md'>Medium</Button>)
    button = getByText('Medium')
    expect(button).toHaveClass('min-h_500', 'fs_md', 'px_200', 'py_100')

    rerender(<Button size='lg'>Large</Button>)
    button = getByText('Large')
    expect(button).toHaveClass('min-h_600', 'fs_lg', 'px_300', 'py_150')
  })

  it('renders with different color palettes', () => {
    const { rerender, getByText } = render(
      <Button emphasis='strong' colorPalette='accent'>
        Accent
      </Button>
    )
    let button = getByText('Accent')
    expect(button).toHaveClass(
      'c_colorPalette.fg.inverted',
      'bg-c_colorPalette.solid.strong',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'color-palette_accent'
    )

    rerender(
      <Button emphasis='strong' colorPalette='success'>
        Success
      </Button>
    )
    button = getByText('Success')
    expect(button).toHaveClass(
      'c_colorPalette.fg.inverted',
      'bg-c_colorPalette.solid.strong',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'color-palette_success'
    )

    rerender(
      <Button emphasis='strong' colorPalette='warning'>
        Warning
      </Button>
    )
    button = getByText('Warning')
    expect(button).toHaveClass(
      'c_colorPalette.fg.inverted',
      'bg-c_colorPalette.solid.strong',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'color-palette_warning'
    )

    rerender(
      <Button emphasis='strong' colorPalette='danger'>
        Danger
      </Button>
    )
    button = getByText('Danger')
    expect(button).toHaveClass(
      'c_colorPalette.fg.inverted',
      'bg-c_colorPalette.solid.strong',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'color-palette_danger'
    )
  })

  it('handles disabled state', () => {
    const { getByText } = render(<Button isDisabled>Disabled</Button>)
    const button = getByText('Disabled')
    expect(button).toBeDisabled()
    expect(button).toHaveClass(
      'disabled:op_0.4',
      'disabled:cursor_not-allowed',
      'disabled:c_colorPalette.fg.subtle'
    )
  })

  it('calls onPress when clicked', async () => {
    const handlePress = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button onPress={handlePress}>Click me</Button>
    )
    const button = getByText('Click me')

    await user.click(button)
    expect(handlePress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', async () => {
    const handlePress = vi.fn()
    const user = userEvent.setup()

    const { getByText } = render(
      <Button isDisabled onPress={handlePress}>
        Click me
      </Button>
    )
    const button = getByText('Click me')

    await user.click(button)
    expect(handlePress).not.toHaveBeenCalled()
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
      'd_inline-flex',
      'ai_center',
      'jc_center',
      'bg-c_colorPalette.solid.strong',
      'bdr_050',
      'fw_medium',
      'ff_ui',
      'cursor_pointer',
      'bd-w_1px',
      'border-style_solid',
      'bd-c_transparent',
      'trs_all_0.2s',
      'c_colorPalette.fg.inverted',
      'hover:c_colorPalette.fg.inverted.hover',
      'hover:bg-c_colorPalette.solid.strong.hover',
      'active:c_colorPalette.fg.inverted.active',
      'active:bg-c_colorPalette.solid.strong.active',
      'disabled:op_0.4',
      'disabled:cursor_not-allowed',
      'disabled:c_colorPalette.fg.subtle',
      'focusVisible:ring-c_colorPalette.border.strong',
      'focusVisible:ring-w_2px',
      'focusVisible:outline-style_solid',
      'focusVisible:ring-o_2px',
      'color-palette_accent',
      'min-h_600',
      'fs_lg',
      'px_300',
      'py_150',
      'custom-class'
    )
  })
})
