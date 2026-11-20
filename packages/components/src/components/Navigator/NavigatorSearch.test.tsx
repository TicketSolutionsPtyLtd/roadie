import type { ReactNode } from 'react'

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { CommandPalette } from '../CommandPalette'
import { FakeIcon, flushViewportMeasurement, primaryOf } from './testUtils'

afterEach(() => vi.restoreAllMocks())

const palette = (
  <CommandPalette items={['Events']}>
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

function Nav({
  search = <Navigator.Search />,
  items = ['a', 'b'],
  onValueChange
}: {
  search?: ReactNode
  items?: string[]
  onValueChange?: (value: string) => void
}) {
  return (
    <Navigator value='a' onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
        {items.map((item) => (
          <Navigator.Item key={item} value={item}>
            {item.toUpperCase()}
          </Navigator.Item>
        ))}
        {search}
      </Navigator.Primary>
    </Navigator>
  )
}

const searchIn = (orientation: 'vertical' | 'horizontal') =>
  within(primaryOf(orientation)).queryByRole('button', { name: 'Search' })

describe('Navigator.Search', () => {
  it('renders nothing, and warns in development, with no palette to open', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Nav />)
    await flushViewportMeasurement()
    expect(searchIn('vertical')).toBeNull()
    expect(searchIn('horizontal')).toBeNull()
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Navigator.Search found no CommandPalette')
      )
    )
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('leaves no empty tile or tab behind, pinned or automatic, with no palette', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(<Nav />)
    await flushViewportMeasurement()
    expect(within(primaryOf('vertical')).getAllByRole('listitem')).toHaveLength(
      2
    )
    rerender(<Nav search={<Navigator.Search placement='automatic' />} />)
    await flushViewportMeasurement()
    expect(within(primaryOf('vertical')).getAllByRole('listitem')).toHaveLength(
      2
    )
    expect(searchIn('horizontal')).toBeNull()
  })

  it('finds a palette mounted after it, without warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <>
        <Nav />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    expect(searchIn('vertical')).toBeInTheDocument()
    expect(searchIn('horizontal')).toBeInTheDocument()
    await Promise.resolve()
    expect(warn).not.toHaveBeenCalled()
  })

  it("names the palette's shortcut in aria-keyshortcuts", async () => {
    render(
      <>
        <Nav />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    expect(searchIn('vertical')).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+K'
    )
    expect(searchIn('horizontal')).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+K'
    )
  })

  it("shows the palette's keys in the tile's tooltip", async () => {
    render(
      <>
        <Nav />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    searchIn('vertical')!.focus()
    const popup = await screen.findByText(
      'Search',
      { selector: '[data-slot="tooltip-popup"] *' },
      { timeout: 2000 }
    )
    const keys = popup
      .closest('[data-slot="tooltip-popup"]')!
      .querySelectorAll('kbd')
    expect([...keys].map((key) => key.textContent).join(' ')).toMatch(/K$/)
  })

  it("opens the palette from the phone bar's circle, without changing the value", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <>
        <Nav onValueChange={onValueChange} />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    await user.click(searchIn('horizontal')!)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("takes a label, and gives its icon Navigator's duotone", async () => {
    render(
      <>
        <Nav search={<Navigator.Search label='Find' icon={<FakeIcon />} />} />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    const tile = within(primaryOf('vertical')).getByRole('button', {
      name: 'Find'
    })
    expect(within(tile).getByTestId('fake-icon')).toHaveAttribute(
      'data-weight',
      'duotone'
    )
  })

  it('opens the palette from More, without changing the value', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <>
        <Nav
          items={['a', 'b', 'c', 'd', 'e']}
          search={<Navigator.Search placement='automatic' />}
          onValueChange={onValueChange}
        />
        {palette}
      </>
    )
    await flushViewportMeasurement()
    expect(searchIn('horizontal')).toBeNull()
    await user.click(
      within(primaryOf('horizontal')).getByRole('button', { name: 'More' })
    )
    const more = document.querySelector<HTMLElement>(
      '[data-slot="pane"][data-overflow]'
    )!
    const row = within(more).getByRole('button', { name: 'Search' })
    expect(row).toHaveAttribute('aria-keyshortcuts', 'Control+K')
    await user.click(row)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})
