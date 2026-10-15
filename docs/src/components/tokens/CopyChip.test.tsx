// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CopyChip } from './CopyChip'

afterEach(cleanup)

describe('CopyChip', () => {
  it('shows and announces a failure when nothing can copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn(() => false),
      configurable: true
    })
    render(<CopyChip value='--color-brand-5'>--color-brand-5</CopyChip>)

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy --color-brand-5' })
    )

    expect(await screen.findByText('Couldn’t copy')).toBeTruthy()
    expect(screen.getByText("Couldn't copy --color-brand-5")).toBeTruthy()
  })

  it('hands the confirmation to onCopy, with no text or announcement of its own', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true
    })
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn(() => false),
      configurable: true
    })
    const onCopy = vi.fn()
    const { container } = render(
      <CopyChip value='--color-brand-5' onCopy={onCopy}>
        --color-brand-5
      </CopyChip>
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Copy --color-brand-5' })
    )

    await vi.waitFor(() => expect(onCopy).toHaveBeenCalledWith(false))
    expect(screen.queryByText('Couldn’t copy')).toBeNull()
    expect(container.querySelector('[aria-live]')).toBeNull()
  })
})
