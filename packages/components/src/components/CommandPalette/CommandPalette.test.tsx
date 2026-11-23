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
  shortcut?: string[]
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
              shortcut={command.shortcut}
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

  it('tells onOpenChange whether a pick or Escape closed it', async () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <CommandPalette open onOpenChange={onOpenChange} items={['Events']}>
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
    await userEvent.click(await screen.findByRole('option', { name: 'Events' }))
    expect(onOpenChange).toHaveBeenLastCalledWith(false, {
      reason: 'item-press'
    })
    rerender(
      <CommandPalette open onOpenChange={onOpenChange} items={['Events']}>
        <CommandPalette.Input />
      </CommandPalette>
    )
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenLastCalledWith(false, {
      reason: 'escape-key'
    })
  })

  it('stays open after a command with closeOnSelect={false}', async () => {
    const onSelect = vi.fn()
    render(
      <CommandPalette defaultOpen items={['Copy link']}>
        <CommandPalette.Input />
        <CommandPalette.List>
          {(label: string) => (
            <CommandPalette.Item
              key={label}
              value={label}
              onSelect={onSelect}
              closeOnSelect={false}
            >
              {label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    await userEvent.click(
      await screen.findByRole('option', { name: 'Copy link' })
    )
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('types itemToStringValue with the commands inside groups', () => {
    const groups = [{ label: 'Go to', items: [{ title: 'Orders' }] }]
    const ok = (
      <CommandPalette
        items={groups}
        itemToStringValue={(command) => command.title}
      >
        <CommandPalette.Input />
      </CommandPalette>
    )
    const wrong = (
      // @ts-expect-error a group has no title; its commands do
      <CommandPalette items={groups} itemToStringValue={(group) => group.label}>
        <CommandPalette.Input />
      </CommandPalette>
    )
    expect([ok, wrong]).toHaveLength(2)
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

  it('draws a shortcut as keys, not as the text it was given', async () => {
    render(
      <Palette
        commands={[
          { label: 'New event', shortcut: ['mod', 'e'], onSelect: vi.fn() }
        ]}
      />
    )
    const option = await screen.findByRole('option', { name: /New event/ })
    expect(option).not.toHaveTextContent('mod')
    expect(option.querySelector('kbd')).toBeInTheDocument()
  })

  it('shows the empty state when nothing matches', async () => {
    render(<Palette commands={[{ label: 'Events', href: '/events' }]} />)
    await userEvent.type(await screen.findByRole('combobox'), 'zzz')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('No pages or actions match')).toBeVisible()
  })

  it('names the dialog with label and the input "Search" by default', async () => {
    render(
      <CommandPalette defaultOpen items={['Events']} label='Jump to'>
        <CommandPalette.Input />
      </CommandPalette>
    )
    expect(
      await screen.findByRole('dialog', { name: 'Jump to' })
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search' })).toBeInTheDocument()
  })

  it('matches and ranks by itemToStringValue when given', async () => {
    type Page = { id: string; name: string }
    render(
      <CommandPalette
        defaultOpen
        items={[
          { id: 'order-1', name: 'Reorder seats' },
          { id: 'o', name: 'Orders' }
        ]}
        itemToStringValue={(page: Page) => page.name}
      >
        <CommandPalette.Input />
        <CommandPalette.List>
          {(page: Page) => (
            <CommandPalette.Item key={page.name} value={page}>
              {page.name}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    await userEvent.type(await screen.findByRole('combobox'), 'order')
    expect(options()).toEqual(['Orders', 'Reorder seats'])
  })

  it.each([
    ['tr', ['Izmir office']],
    ['en', []]
  ])(
    'matches letters as the %s locale reads them',
    async (locale, expected) => {
      render(
        <CommandPalette defaultOpen items={['Izmir office']} locale={locale}>
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
      await userEvent.type(await screen.findByRole('combobox'), 'ız')
      expect(screen.queryAllByRole('option').map((o) => o.textContent)).toEqual(
        expected
      )
    }
  )

  it('stays open, with the search kept, when onClick prevents the default', async () => {
    const onSelect = vi.fn()
    render(
      <CommandPalette defaultOpen items={['Invite teammate']}>
        <CommandPalette.Input />
        <CommandPalette.List>
          {(label: string) => (
            <CommandPalette.Item
              key={label}
              value={label}
              onSelect={onSelect}
              onClick={(event) => event.preventDefault()}
            >
              {label}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    const input = await screen.findByRole('combobox')
    await userEvent.type(input, 'inv')
    await userEvent.keyboard('{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(input).toHaveValue('inv')
  })

  it('keeps the search in the input while a picked command closes', async () => {
    render(
      <Palette commands={[{ label: 'Invite teammate', onSelect: vi.fn() }]} />
    )
    const input = await screen.findByRole('combobox')
    await userEvent.type(input, 'inv')
    await userEvent.keyboard('{Enter}')
    expect(input).toHaveValue('inv')
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

describe('CommandPalette virtualized', () => {
  function Grouped({
    groups,
    virtualized = true
  }: {
    groups: { label: string; items: string[] }[]
    virtualized?: boolean
  }) {
    return (
      <CommandPalette
        defaultOpen
        shortcut={false}
        items={groups}
        virtualized={virtualized}
      >
        <CommandPalette.Input placeholder='Search' />
        <CommandPalette.List>
          {(group: { label: string; items: string[] }) => (
            <CommandPalette.Group key={group.label} items={group.items}>
              <CommandPalette.Collection>
                {(item: string) => (
                  <CommandPalette.Item key={item} value={item}>
                    {item}
                  </CommandPalette.Item>
                )}
              </CommandPalette.Collection>
            </CommandPalette.Group>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
  }

  it('warns once that it draws every command when the items are groups', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<Grouped groups={[{ label: 'Pages', items: ['Home', 'Events'] }]} />)
    await screen.findByRole('option', { name: 'Home' })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/virtualized.*groups/)
    warn.mockRestore()
  })

  it('stays quiet with groups when it is not virtualized', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Grouped
        groups={[{ label: 'Pages', items: ['Home', 'Events'] }]}
        virtualized={false}
      />
    )
    await screen.findByRole('option', { name: 'Home' })
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('stays quiet with flat items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <CommandPalette defaultOpen shortcut={false} items={['Home']} virtualized>
        <CommandPalette.Input placeholder='Search' />
        <CommandPalette.List>
          {(item: string) => (
            <CommandPalette.Item key={item} value={item}>
              {item}
            </CommandPalette.Item>
          )}
        </CommandPalette.List>
      </CommandPalette>
    )
    await screen.findByRole('combobox')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
