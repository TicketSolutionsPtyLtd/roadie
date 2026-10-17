// @vitest-environment jsdom
import type { ReactNode } from 'react'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Toast } from '@oztix/roadie-components/toast'

import { BrandSwatchCard } from './BrandSwatchCard'

const colour = {
  name: 'House blue',
  token: '--color-brand-blue-5',
  hex: '#c2dffb',
  cmyk: '21, 5, 0, 0',
  derived: false
}

function WithToasts({ children }: { children: ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Viewport />
    </Toast.Provider>
  )
}

function renderCard(card = colour) {
  return render(<BrandSwatchCard colour={card} />, { wrapper: WithToasts })
}

function setClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    configurable: true
  })
}

async function toastWith(title: string) {
  const toast = (await screen.findByText(title)).closest<HTMLElement>(
    '[data-slot="toast"]'
  )
  if (!toast) throw new Error(`No toast titled ${title}`)
  return toast
}

afterEach(cleanup)

describe('BrandSwatchCard', () => {
  it.each([['--color-brand-blue-5'], ['#c2dffb'], ['21, 5, 0, 0']])(
    'copies %s from a focusable button and confirms it in a toast',
    async (value) => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      setClipboard({ writeText })
      renderCard()

      // A native button, so Enter and Space activate it with no key handling.
      const button = screen.getByRole('button', { name: `Copy ${value}` })
      expect(button.getAttribute('type')).toBe('button')
      fireEvent.click(button)

      expect(writeText).toHaveBeenCalledWith(value)
      const toast = await toastWith('Copied')
      expect(toast.querySelector('code')?.textContent).toBe(value)
      expect(
        toast.querySelector<HTMLElement>('[aria-hidden]')?.style.backgroundColor
      ).toBe('rgb(194, 223, 251)')
    }
  )

  it('shows the value in a danger toast when nothing can copy', async () => {
    setClipboard(undefined)
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn(() => false),
      configurable: true
    })
    renderCard()

    fireEvent.click(screen.getByRole('button', { name: 'Copy #c2dffb' }))

    const toast = await toastWith('Couldn’t copy')
    expect(toast.querySelector('code')?.textContent).toBe('#c2dffb')
    expect(toast.classList).toContain('intent-danger')
  })

  it('labels a converted print value as derived, for sight and screen readers', () => {
    renderCard({ ...colour, derived: true })
    expect(screen.getByText('derived')).toBeTruthy()
    expect(screen.getByText('(derived)', { exact: false })).toBeTruthy()
  })

  it('leaves a brand print value unmarked', () => {
    renderCard()
    expect(screen.queryByText('derived', { exact: false })).toBeNull()
  })

  it('pairs each label with its value', () => {
    renderCard()
    const pairs = screen
      .getAllByRole('term')
      .map((term) => [
        term.textContent,
        term.nextElementSibling?.querySelector('code')?.textContent
      ])
    expect(pairs).toEqual([
      ['Token', '--color-brand-blue-5'],
      ['Hex', '#c2dffb'],
      ['CMYK', '21, 5, 0, 0']
    ])
  })
})
