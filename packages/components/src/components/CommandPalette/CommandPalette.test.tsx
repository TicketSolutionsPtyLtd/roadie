import { useState } from 'react'

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CommandPalette } from '.'
import type { RoadieLinkComponent } from '../../providers/RoadieLinkContext'
import { RoadieLinkProvider } from '../../providers/RoadieLinkProvider'

type Command = {
  label: string
  href?: string
  keywords?: string[]
  onSelect?: () => void
}

const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a data-testid='stub-link' href={href} {...rest}>
    {children}
  </a>
)

function Palette({
  commands,
  defaultOpen = true
}: {
  commands: Command[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <>
      <button type='button' onClick={() => setOpen(true)}>
        Open palette
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} items={commands}>
        <CommandPalette.Input placeholder='Search pages and actions' />
        <CommandPalette.List>
          {(command: Command) => (
            <CommandPalette.Item
              key={command.label}
              value={command}
              href={command.href}
              onSelect={command.onSelect}
            >
              {command.label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
        <CommandPalette.Empty>No pages or actions match</CommandPalette.Empty>
      </CommandPalette>
    </>
  )
}

const options = () => screen.getAllByRole('option').map((o) => o.textContent)

describe('CommandPalette', () => {
  it('CommandPalette and CommandPalette.Root are the same component reference', () => {
    expect(CommandPalette).toBe(CommandPalette.Root)
  })

  it('opens as a dialog named for search, with the input focused', async () => {
    render(<Palette commands={[{ label: 'Events', href: '/events' }]} />)
    const dialog = await screen.findByRole('dialog', {
      name: 'Search and commands'
    })
    expect(dialog).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())
  })

  it('ranks a label start above a match inside a word', async () => {
    render(
      <Palette
        commands={[
          { label: 'Reorder seats', href: '/seats' },
          { label: 'Orders', href: '/orders' }
        ]}
      />
    )
    await userEvent.type(await screen.findByRole('combobox'), 'order')
    expect(options()).toEqual(['Orders', 'Reorder seats'])
  })

  it('matches keywords as well as labels', async () => {
    render(
      <Palette
        commands={[
          { label: 'Settings', href: '/settings', keywords: ['preferences'] },
          { label: 'Events', href: '/events' }
        ]}
      />
    )
    await userEvent.type(await screen.findByRole('combobox'), 'prefer')
    expect(options()).toEqual(['Settings'])
  })

  it('runs onSelect and closes when Enter picks the highlighted command', async () => {
    const invite = vi.fn()
    render(
      <Palette
        commands={[
          { label: 'Invite teammate', onSelect: invite },
          { label: 'New event', onSelect: vi.fn() }
        ]}
      />
    )
    await userEvent.type(await screen.findByRole('combobox'), 'invite')
    await userEvent.keyboard('{Enter}')
    expect(invite).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('moves the highlight with the arrow keys', async () => {
    const newEvent = vi.fn()
    render(
      <Palette
        commands={[
          { label: 'Invite teammate', onSelect: vi.fn() },
          { label: 'New event', onSelect: newEvent }
        ]}
      />
    )
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(input).toHaveFocus())
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(newEvent).toHaveBeenCalledTimes(1)
  })

  it('renders an href command as a link through the router Link', async () => {
    render(
      <RoadieLinkProvider Link={StubLink}>
        <Palette commands={[{ label: 'Orders', href: '/orders' }]} />
      </RoadieLinkProvider>
    )
    const option = await screen.findByRole('option', { name: 'Orders' })
    expect(option).toHaveAttribute('href', '/orders')
    expect(option).toHaveAttribute('data-testid', 'stub-link')
  })

  it('shows the empty state when nothing matches', async () => {
    render(<Palette commands={[{ label: 'Events', href: '/events' }]} />)
    await userEvent.type(await screen.findByRole('combobox'), 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No pages or actions match')).toBeVisible()
  })

  it('starts each opening with an empty search', async () => {
    render(<Palette commands={[{ label: 'Events', href: '/events' }]} />)
    await userEvent.type(await screen.findByRole('combobox'), 'zzz')
    await userEvent.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open palette' }))
    expect(await screen.findByRole('combobox')).toHaveValue('')
    expect(options()).toEqual(['Events'])
  })
})
