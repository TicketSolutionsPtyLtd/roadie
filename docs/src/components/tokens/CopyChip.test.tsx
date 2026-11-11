// @vitest-environment jsdom
import type { ReactNode } from 'react'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toast } from '@oztix/roadie-components/toast'

import { CopyChip } from './CopyChip'

afterEach(cleanup)

function WithToasts({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Viewport />
    </Toast.Provider>
  )
}

function setClipboard(writeText: (() => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText && { writeText: vi.fn(writeText) },
    configurable: true
  })
  Object.defineProperty(document, 'execCommand', {
    value: vi.fn(() => false),
    configurable: true
  })
}

const copyBrand5 = async () => {
  render(<CopyChip value='--color-brand-5'>--color-brand-5</CopyChip>, {
    wrapper: WithToasts
  })
  const button = screen.getByRole('button', { name: 'Copy --color-brand-5' })
  await act(async () => fireEvent.click(button))
}

describe('CopyChip', () => {
  it('confirms a copy in a toast that shows the value', async () => {
    setClipboard(() => Promise.resolve())

    await copyBrand5()

    await screen.findByText('Copied')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      '--color-brand-5'
    )
    expect(
      screen.getByText('--color-brand-5', { selector: 'code' })
    ).toBeTruthy()
  })

  it('says so in a toast when nothing can copy', async () => {
    setClipboard(undefined)

    await copyBrand5()

    await screen.findByText('Couldn’t copy')
  })
})
