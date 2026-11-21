import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '.'

function Page() {
  return (
    <>
      <CommandPalette.Trigger />
      <CommandPalette items={['Events', 'Orders']}>
        <CommandPalette.Input />
        <CommandPalette.List>
          {(label: string) => (
            <CommandPalette.Item key={label} value={label}>
              {label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    </>
  )
}

function usePointer(kind: 'coarse' | 'fine') {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === `(pointer: ${kind})`,
        media: query,
        addEventListener() {},
        removeEventListener() {}
      }) as unknown as MediaQueryList
  )
}

const trigger = () => screen.getByRole('button', { name: 'Search' })

afterEach(() => vi.restoreAllMocks())

describe('CommandPalette on a touch screen', () => {
  it('focuses a text field within the tap, so iOS raises the keyboard', () => {
    usePointer('coarse')
    render(<Page />)
    fireEvent.click(trigger())
    expect(document.activeElement).toBeInstanceOf(HTMLInputElement)
  })

  it('leaves no stand-in field behind, and returns focus to the trigger on close', async () => {
    usePointer('coarse')
    render(<Page />)
    trigger().focus()
    fireEvent.click(trigger())
    const input = await screen.findByRole('combobox')
    await vi.waitFor(() => expect(input).toHaveFocus())
    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => expect(trigger()).toHaveFocus())
    expect(document.querySelectorAll('input')).toHaveLength(0)
  })

  it('takes no stand-in field with a mouse', () => {
    usePointer('fine')
    render(<Page />)
    fireEvent.click(trigger())
    expect(document.activeElement).not.toBeInstanceOf(HTMLInputElement)
  })
})
