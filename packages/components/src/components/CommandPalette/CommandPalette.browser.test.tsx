import { useState } from 'react'

import { TicketIcon } from '@phosphor-icons/react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    'fits the type tabs, scrolls a long list, and shows the key footer only on %s with keys',
    async (_, width, height, footerShows) => {
      await page.viewport(width, height)
      const commands = Array.from({ length: 40 }, (_, index) => ({
        label: `Command ${index + 1}`
      }))
      render(
        <CommandPalette defaultOpen shortcut={false} items={commands}>
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
      expect(dialog.bottom).toBeLessThanOrEqual(height + 0.5)
      const list = document.querySelector('[data-slot="command-palette-list"]')!
      expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
      expect(box(list).bottom).toBeLessThanOrEqual(dialog.bottom + 0.5)
      const footer = document.querySelector<HTMLElement>(
        '[data-slot="command-palette-footer"]'
      )
      if (footerShows) {
        await expect.element(footer!).toBeVisible()
        expect(box(footer!).bottom).toBeCloseTo(dialog.bottom, 0)
      } else expect(footer).not.toBeVisible()
    }
  )

  it('keeps a short list right under the type tabs on a phone', async () => {
    await page.viewport(390, 844)
    render(
      <CommandPalette defaultOpen shortcut={false} items={COMMANDS}>
        <CommandPalette.Input />
        <CommandPalette.Scopes>
          <CommandPalette.Scope value='events'>Events</CommandPalette.Scope>
        </CommandPalette.Scopes>
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item key={command.label} value={command}>
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    await expect.element(page.getByRole('dialog')).toBeInViewport()
    const tabs = box(screen.getByRole('group', { name: 'Type' }))
    const list = box(
      document.querySelector('[data-slot="command-palette-list"]')!
    )
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    expect(list.top - tabs.bottom).toBeLessThan(rem)
  })

  it('enters the type tabs on the type the arrows chose', async () => {
    await page.viewport(1280, 800)
    render(
      <CommandPalette defaultOpen shortcut={false} items={COMMANDS}>
        <CommandPalette.Input />
        <CommandPalette.Scopes>
          <CommandPalette.Scope value='artifacts'>
            Artifacts
          </CommandPalette.Scope>
          <CommandPalette.Scope value='sessions'>Sessions</CommandPalette.Scope>
        </CommandPalette.Scopes>
      </CommandPalette>
    )
    await expect.element(page.getByRole('combobox')).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}{Tab}')
    await expect
      .element(page.getByRole('button', { name: 'Artifacts' }))
      .toHaveFocus()
  })

  it('changes a status through a page from the keyboard', async () => {
    await page.viewport(1280, 800)
    const onStatus = vi.fn()
    const statuses = ['Draft', 'On sale', 'Sold out']
    function StatusPalette() {
      const [open, setOpen] = useState(false)
      return (
        <main>
          <button type='button' onClick={() => setOpen(true)}>
            Search
          </button>
          <CommandPalette
            open={open}
            onOpenChange={setOpen}
            shortcut={false}
            items={[{ label: 'Change status…', page: 'status' }]}
          >
            <CommandPalette.Input />
            <CommandPalette.List>
              {(command: { label: string; page: string }) => (
                <CommandPalette.Item
                  key={command.label}
                  value={command}
                  page={command.page}
                >
                  {command.label}
                </CommandPalette.Item>
              )}
            </CommandPalette.List>
            <CommandPalette.Page
              value='status'
              label='Change status'
              items={statuses}
            >
              <CommandPalette.List>
                {(status: string) => (
                  <CommandPalette.Item
                    key={status}
                    value={status}
                    onSelect={() => onStatus(status)}
                  >
                    {status}
                  </CommandPalette.Item>
                )}
              </CommandPalette.List>
            </CommandPalette.Page>
          </CommandPalette>
        </main>
      )
    }
    render(<StatusPalette />)
    screen.getByRole('button', { name: 'Search' }).focus()
    await userEvent.keyboard('{Enter}')
    await expect.element(page.getByRole('combobox')).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect
      .element(page.getByRole('listbox', { name: 'Change status' }))
      .toBeVisible()
    await expect.element(page.getByRole('combobox')).toHaveValue('')
    await userEvent.keyboard('sold{Enter}')
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument()
    expect(onStatus).toHaveBeenCalledWith('Sold out')
  })

  describe.each([
    ['a phone', 390, 844],
    ['a desktop', 1280, 800]
  ])('server search on %s', (_, width, height) => {
    function ServerPalette({
      status,
      onRetry = () => {}
    }: {
      status: 'idle' | 'loading' | 'error'
      onRetry?: () => void
    }) {
      return (
        <main>
          <CommandPalette
            defaultOpen
            shortcut={false}
            items={[] as Command[]}
            filter={null}
            status={status}
          >
            <CommandPalette.Input />
            <CommandPalette.Status>Searching…</CommandPalette.Status>
            <CommandPalette.List>
              {(command: Command) => (
                <CommandPalette.Item key={command.label} value={command}>
                  {command.label}
                </CommandPalette.Item>
              )}
            </CommandPalette.List>
            <CommandPalette.Empty>No matches</CommandPalette.Empty>
            <CommandPalette.Error
              action={
                <button type='button' onClick={onRetry}>
                  Try again
                </button>
              }
            >
              We couldn't search
            </CommandPalette.Error>
          </CommandPalette>
        </main>
      )
    }

    const statusRow = () =>
      document.querySelector<HTMLElement>(
        '[data-slot="command-palette-status"]'
      )!

    it('takes no room for the status while idle', async () => {
      await page.viewport(width, height)
      render(<ServerPalette status='idle' />)
      await expect.element(page.getByText('No matches')).toBeVisible()
      expect(statusRow()).not.toBeVisible()
    })

    it('shows a 1rem spinner beside the loading text, inside the palette', async () => {
      await page.viewport(width, height)
      render(<ServerPalette status='loading' />)
      await expect.element(page.getByText('Searching…')).toBeVisible()
      const row = statusRow()
      const spinner = row.querySelector('svg')!
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      expect(box(spinner).width).toBeCloseTo(rem, 0)
      const middle = (rect: DOMRect) => rect.top + rect.height / 2
      expect(middle(box(spinner))).toBeCloseTo(middle(box(row)), 0)
      expect(box(spinner).right).toBeLessThan(box(row).right - 4 * rem)
      const dialog = box(screen.getByRole('dialog'))
      expect(box(row).left).toBeGreaterThanOrEqual(dialog.left)
      expect(box(row).right).toBeLessThanOrEqual(dialog.right + 0.5)
      await expect.element(row).toBeInViewport()
      await expectNoSeriousViolations()
    })

    it('shows the error with its retry in view, and the retry works', async () => {
      await page.viewport(width, height)
      const onRetry = vi.fn()
      render(<ServerPalette status='error' onRetry={onRetry} />)
      const retry = page.getByRole('button', { name: /Try again/ })
      await expect.element(retry).toBeInViewport()
      await expect
        .element(page.getByRole('heading', { name: /We couldn't search/ }))
        .toBeVisible()
      expect(
        document.querySelector('[data-slot="command-palette-list"]')
      ).not.toBeVisible()
      const error = document.querySelector('[data-slot="empty-state"]')!
      expect(box(error).width).toBeGreaterThan(
        box(screen.getByRole('dialog')).width / 2
      )
      await retry.click()
      expect(onRetry).toHaveBeenCalledTimes(1)
      await expectNoSeriousViolations()
    })
  })
})
