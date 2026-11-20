import { useState } from 'react'

import { TicketIcon } from '@phosphor-icons/react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { CommandPalette } from '.'
import {
  expectNoSeriousViolations,
  setUpCheckPage
} from '../../checks/testUtils'

setUpCheckPage()
afterEach(cleanup)

type Command = { label: string; href?: string }

const COMMANDS: Command[] = [
  { label: 'Events', href: '#events' },
  { label: 'Orders', href: '#orders' },
  { label: 'Settings', href: '#settings' }
]

function Palette() {
  const [open, setOpen] = useState(false)
  return (
    <main>
      <button type='button' onClick={() => setOpen(true)}>
        Search
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={COMMANDS}>
        <CommandPalette.Input placeholder='Search pages and actions' />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              href={command.href}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Empty>No pages or actions match</CommandPalette.Empty>
      </CommandPalette>
    </main>
  )
}

async function openPalette() {
  render(<Palette />)
  const opener = screen.getByRole('button', { name: 'Search' })
  // From the keyboard: Safari doesn't focus a button it clicks.
  opener.focus()
  await userEvent.keyboard('{Enter}')
  await expect.element(page.getByRole('dialog')).toBeInViewport()
  await expect.element(page.getByRole('combobox')).toHaveFocus()
  return opener
}

const box = (element: Element) => element.getBoundingClientRect()

describe('CommandPalette in a browser', () => {
  it.each([
    ['a phone', 390, 844],
    ['a desktop', 1280, 800]
  ])('keeps Tab inside the palette on %s', async (_, width, height) => {
    await page.viewport(width, height)
    await openPalette()
    const dialog = screen.getByRole('dialog')
    for (let step = 0; step < 4; step++) {
      await userEvent.keyboard('{Tab}')
      // WebKit lands on Base UI's focus guard, which sends focus back in.
      await expect
        .poll(() => dialog.contains(document.activeElement))
        .toBe(true)
    }
  })

  it('closes on Escape and gives focus back to what opened it', async () => {
    await page.viewport(1280, 800)
    const opener = await openPalette()
    await userEvent.keyboard('{Escape}')
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    await expect.element(opener).toHaveFocus()
  })

  it('leaves link commands out of the tab order', async () => {
    await page.viewport(1280, 800)
    await openPalette()
    await userEvent.keyboard('{Tab}')
    await expect
      .poll(() => document.activeElement?.getAttribute('role'))
      .not.toBe('option')
    expect(
      screen.getAllByRole('option').map((option) => option.tabIndex)
    ).toEqual([-1, -1, -1])
  })

  it('follows a link command picked with Enter', async () => {
    await page.viewport(1280, 800)
    location.hash = ''
    await openPalette()
    await userEvent.keyboard('ord{Enter}')
    await expect.poll(() => location.hash).toBe('#orders')
    location.hash = ''
  })

  it("opens with the platform's own modifier and K", async () => {
    await page.viewport(1280, 800)
    render(<Palette />)
    const mod = /^(Mac|iP)/.test(navigator.platform) ? 'Meta' : 'Control'
    await userEvent.keyboard(`{${mod}>}k{/${mod}}`)
    await expect.element(page.getByRole('dialog')).toBeInViewport()
    await expect.element(page.getByRole('combobox')).toHaveFocus()
  })

  it('fills a phone screen, with the input and Close in view', async () => {
    await page.viewport(390, 844)
    await openPalette()
    const dialog = box(screen.getByRole('dialog'))
    expect(dialog.width).toBeCloseTo(390, 0)
    expect(dialog.height).toBeCloseTo(844, 0)
    await expect.element(page.getByRole('combobox')).toBeInViewport()
    await expect
      .element(page.getByRole('button', { name: 'Close' }))
      .toBeInViewport()
  })

  it('floats as a panel on a desktop, with no Close button', async () => {
    await page.viewport(1280, 800)
    await openPalette()
    const popup = screen.getByRole('dialog')
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    // WebKit is still sliding the popup in when it reaches the viewport.
    await expect.poll(() => box(popup).top).toBeCloseTo(6 * rem, 0)
    expect(box(popup).width).toBeCloseTo(36 * rem, 0)
    const close = document.querySelector('[data-slot="command-palette-close"]')
    expect(close).not.toBeVisible()
  })

  it('drops the list, padding and all, when nothing matches', async () => {
    await page.viewport(1280, 800)
    await openPalette()
    await userEvent.keyboard('zzz')
    await expect
      .element(page.getByText('No pages or actions match'))
      .toBeVisible()
    const list = document.querySelector('[data-slot="command-palette-list"]')
    expect(list).toBeInTheDocument()
    expect(list).not.toBeVisible()
  })

  it('sizes an icon for you and keeps it out of the name', async () => {
    await page.viewport(1280, 800)
    render(
      <CommandPalette defaultOpen items={['Events']}>
        <CommandPalette.Input />
        <CommandPalette.List>
          {(label: string) => (
            <CommandPalette.Item
              key={label}
              value={label}
              icon={<TicketIcon weight='bold' aria-label='Ticket' />}
            >
              {label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    await expect
      .element(page.getByRole('option', { name: 'Events', exact: true }))
      .toBeVisible()
    const icon = box(screen.getByRole('option').querySelector('svg')!)
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(icon.width).toBeCloseTo(rem, 0)
    expect(icon.height).toBeCloseTo(rem, 0)
  })

  it('has no serious accessibility violations while open', async () => {
    await page.viewport(1280, 800)
    await openPalette()
    await expectNoSeriousViolations()
  })

  it.each([
    ['a desktop', 1280, 800, true],
    ['a phone', 390, 844, false]
  ])(
    'fits the type tabs, and shows the key footer only on %s with keys',
    async (_, width, height, footerShows) => {
      await page.viewport(width, height)
      render(
        <CommandPalette defaultOpen shortcut={false} items={COMMANDS}>
          <CommandPalette.Input />
          <CommandPalette.Scopes>
            <CommandPalette.Scope value='artifacts'>
              Artifacts
            </CommandPalette.Scope>
            <CommandPalette.Scope value='sessions'>
              Sessions
            </CommandPalette.Scope>
            <CommandPalette.Scope value='projects'>
              Projects
            </CommandPalette.Scope>
            <CommandPalette.Scope value='scheduled'>
              Scheduled
            </CommandPalette.Scope>
          </CommandPalette.Scopes>
          <CommandPalette.List>
            {(command: Command) => (
              <CommandPalette.Item key={command.label} value={command}>
                {command.label}
              </CommandPalette.Item>
            )}
          </CommandPalette.List>
          <CommandPalette.Footer>
            <CommandPalette.Hint shortcut={['escape']}>
              Close
            </CommandPalette.Hint>
          </CommandPalette.Footer>
        </CommandPalette>
      )
      await expect.element(page.getByRole('dialog')).toBeInViewport()
      const dialog = box(screen.getByRole('dialog'))
      const tabs = box(
        document.querySelector('[data-slot="command-palette-scopes"]')!
      )
      expect(tabs.right).toBeLessThanOrEqual(dialog.right + 0.5)
      const footer = document.querySelector(
        '[data-slot="command-palette-footer"]'
      )
      if (footerShows) {
        await expect.element(footer!).toBeVisible()
        expect(box(footer!).bottom).toBeCloseTo(dialog.bottom, 0)
      } else expect(footer).not.toBeVisible()
    }
  )
})
