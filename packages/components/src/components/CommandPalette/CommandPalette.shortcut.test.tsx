import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommandPalette, type CommandPaletteProps } from '.'

function Palette(props: Partial<CommandPaletteProps>) {
  return (
    <CommandPalette items={['Events', 'Orders']} {...props}>
      <CommandPalette.Input />
      <CommandPalette.List>
        {(label: string) => (
          <CommandPalette.Item key={label} value={label}>
            {label}
          </CommandPalette.Item>
        )}
      </CommandPalette.List>
    </CommandPalette>
  )
}

const dialog = () => screen.queryByRole('dialog')

afterEach(() => vi.restoreAllMocks())

describe('CommandPalette shortcut', () => {
  it('opens with Ctrl+K off Apple platforms, and closes with it again', async () => {
    const onOpenChange = vi.fn()
    render(<Palette onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onOpenChange).toHaveBeenLastCalledWith(true, { reason: 'shortcut' })
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())
    await userEvent.keyboard('{Control>}k{/Control}')
    await waitFor(() => expect(dialog()).not.toBeInTheDocument())
  })

  it('takes another key list', async () => {
    render(<Palette shortcut={['mod', 'p']} />)
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(dialog()).not.toBeInTheDocument()
    await userEvent.keyboard('{Control>}p{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('ignores the key with another modifier held', async () => {
    render(<Palette />)
    await userEvent.keyboard('{Control>}{Shift>}k{/Shift}{/Control}')
    expect(dialog()).not.toBeInTheDocument()
  })

  it('binds nothing with shortcut={false}', async () => {
    render(<Palette shortcut={false} />)
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(dialog()).not.toBeInTheDocument()
  })

  it('leaves the key to a field that handled it first', async () => {
    render(
      <>
        <input
          aria-label='Link text'
          onKeyDown={(event) => {
            if (event.key === 'k' && event.ctrlKey) event.preventDefault()
          }}
        />
        <Palette />
      </>
    )
    await userEvent.click(screen.getByRole('textbox', { name: 'Link text' }))
    await userEvent.keyboard('{Control>}k{/Control}')
    expect(dialog()).not.toBeInTheDocument()
  })

  it('warns in development when a second palette mounts', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <>
        <Palette />
        <Palette />
      </>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('one CommandPalette per page a shortcut')
    )
  })
})

describe('CommandPalette.Trigger', () => {
  it('opens the palette and shows its shortcut', async () => {
    render(
      <>
        <CommandPalette.Trigger />
        <Palette />
      </>
    )
    const trigger = screen.getByRole('button', { name: 'Search' })
    expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K')
    expect(trigger.querySelector('kbd')).toBeInTheDocument()
    await userEvent.click(trigger)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('opens nothing, and warns, when no palette binds a shortcut', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <>
        <CommandPalette.Trigger />
        <Palette shortcut={false} />
      </>
    )
    const trigger = screen.getByRole('button', { name: 'Search' })
    expect(trigger).not.toHaveAttribute('aria-keyshortcuts')
    await userEvent.click(trigger)
    expect(dialog()).not.toBeInTheDocument()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no CommandPalette with a shortcut')
    )
  })
})
