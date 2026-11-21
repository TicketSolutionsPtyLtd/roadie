import { type ReactElement, type ReactNode, isValidElement } from 'react'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Navigator, type NavigatorCommandGroup, useNavigatorCommands } from '.'
import type { RoadieLinkComponent } from '../../providers/RoadieLinkContext'
import { RoadieLinkProvider } from '../../providers/RoadieLinkProvider'
import { CommandPalette } from '../CommandPalette'
import { Pane } from '../Pane'
import { FakeIcon, flushViewportMeasurement, testBrand } from './testUtils'

const TicketIcon = () => <FakeIcon />
const CartIcon = () => <FakeIcon />

function Organiser({ children }: { children: ReactNode }) {
  return (
    <Navigator value='/events/all'>
      <Navigator.Primary aria-label='Organiser'>
        {testBrand}
        <Navigator.Item value='/events' href='/events' icon={<TicketIcon />}>
          Events
          <Navigator.Secondary aria-label='Event views'>
            <Navigator.Group>
              <Navigator.GroupTitle>Views</Navigator.GroupTitle>
              <Navigator.Item value='/events/all' href='/events/all'>
                All events
              </Navigator.Item>
            </Navigator.Group>
            <Navigator.Group>
              <Navigator.GroupTitle>Your views</Navigator.GroupTitle>
              <Navigator.Item value='/events/perth' href='/events/perth'>
                Perth gigs
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/orders' href='/orders' icon={<CartIcon />}>
          Orders
        </Navigator.Item>
        <Navigator.Item value='help' onSelect={() => {}}>
          Help
        </Navigator.Item>
      </Navigator.Primary>
      <Pane>{children}</Pane>
    </Navigator>
  )
}

function Probe({ log }: { log: NavigatorCommandGroup[][] }) {
  log.push(useNavigatorCommands())
  return null
}

const iconOf = (node: unknown) =>
  isValidElement(node)
    ? {
        type: node.type,
        weight: (node as ReactElement<{ weight?: string }>).props.weight
      }
    : node

describe('useNavigatorCommands', () => {
  it("lists Navigator's destinations, their pages and saved views as link commands", async () => {
    const log: NavigatorCommandGroup[][] = []
    render(
      <Organiser>
        <Probe log={log} />
      </Organiser>
    )
    await flushViewportMeasurement()
    const groups = log.at(-1)!
    const shape = groups.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ ...item, icon: iconOf(item.icon) }))
    }))
    expect(shape).toEqual([
      {
        label: undefined,
        items: [
          {
            value: '/events',
            label: 'Events',
            href: '/events',
            icon: { type: TicketIcon, weight: 'bold' }
          },
          {
            value: '/orders',
            label: 'Orders',
            href: '/orders',
            icon: { type: CartIcon, weight: 'bold' }
          }
        ]
      },
      {
        label: 'Events',
        items: [
          {
            value: '/events/all',
            label: 'All events',
            href: '/events/all',
            icon: { type: TicketIcon, weight: 'bold' },
            keywords: ['Views']
          },
          {
            value: '/events/perth',
            label: 'Perth gigs',
            href: '/events/perth',
            icon: { type: TicketIcon, weight: 'bold' },
            keywords: ['Your views']
          }
        ]
      }
    ])
  })

  it('returns no commands outside a Navigator', () => {
    const log: NavigatorCommandGroup[][] = []
    render(<Probe log={log} />)
    expect(log.at(-1)).toEqual([])
  })

  it('fills a CommandPalette, where picking a command follows its link', async () => {
    const followed: string[] = []
    const RecordingLink: RoadieLinkComponent = ({
      href,
      children,
      ...rest
    }) => (
      <a
        href={href}
        {...rest}
        onClick={(event) => {
          rest.onClick?.(event)
          event.preventDefault()
          followed.push(href)
        }}
      >
        {children}
      </a>
    )
    function Search() {
      const groups = useNavigatorCommands()
      return (
        <CommandPalette defaultOpen shortcut={false} items={groups}>
          <CommandPalette.Input placeholder='Search pages' />
          <CommandPalette.List>
            {(group: NavigatorCommandGroup) => (
              <CommandPalette.Group
                key={group.label ?? 'pages'}
                items={group.items}
              >
                {group.label ? (
                  <CommandPalette.GroupLabel>
                    {group.label}
                  </CommandPalette.GroupLabel>
                ) : null}
                <CommandPalette.Collection>
                  {(command: NavigatorCommandGroup['items'][number]) => (
                    <CommandPalette.Item
                      key={command.value}
                      value={command}
                      href={command.href}
                      icon={command.icon}
                    >
                      {command.label}
                    </CommandPalette.Item>
                  )}
                </CommandPalette.Collection>
              </CommandPalette.Group>
            )}
          </CommandPalette.List>
        </CommandPalette>
      )
    }
    const user = userEvent.setup()
    render(
      <RoadieLinkProvider Link={RecordingLink}>
        <Organiser>
          <Search />
        </Organiser>
      </RoadieLinkProvider>
    )
    await flushViewportMeasurement()
    const dialog = await screen.findByRole('dialog', {
      name: 'Search and commands'
    })
    expect(
      Array.from(
        dialog.querySelectorAll('[role="option"]'),
        (o) => o.textContent
      )
    ).toEqual(['Events', 'Orders', 'All events', 'Perth gigs'])
    const perth = screen.getByRole('option', { name: 'Perth gigs' })
    expect(perth).toHaveAttribute('href', '/events/perth')
    await user.click(perth)
    expect(followed).toEqual(['/events/perth'])
  })
})
