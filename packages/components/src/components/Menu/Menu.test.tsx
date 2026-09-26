import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Menu } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'

const popup = () => document.querySelector('[data-slot="menu-popup"]')
const positioner = () => document.querySelector('[data-slot="menu-positioner"]')

const waitForMenuToClose = () =>
  waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

function RowActions({ onEdit = () => {} }: { onEdit?: () => void }) {
  return (
    <Menu>
      <Menu.Trigger aria-label='More actions'>…</Menu.Trigger>
      <Menu.Content>
        <Menu.Item onClick={onEdit} icon={<svg data-testid='edit-icon' />}>
          Edit
        </Menu.Item>
        <Menu.Item shortcut='⌘D'>Duplicate</Menu.Item>
        <Menu.Separator />
        <Menu.Item intent='danger'>Cancel event</Menu.Item>
      </Menu.Content>
    </Menu>
  )
}

describe('Menu', () => {
  it('is the same reference as Menu.Root', () => {
    expect(Menu).toBe(Menu.Root)
  })

  it('opens from its trigger onto a floating surface', async () => {
    const user = userEvent.setup()
    render(<RowActions />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    expect(await screen.findByRole('menu')).toBe(popup())
    expect(popup()).toHaveClass(
      'emphasis-floating',
      'rounded-xl',
      'motion-scale'
    )
    expect(positioner()).toHaveClass('z-popover')
    expect(positioner()).toHaveAttribute('data-side', 'bottom')
    expect(positioner()).toHaveAttribute('data-align', 'start')
  })

  it('takes side and align directly on Content', async () => {
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content side='top' align='end'>
          <Menu.Item>Edit</Menu.Item>
        </Menu.Content>
      </Menu>
    )
    await screen.findByRole('menu')
    expect(positioner()).toHaveAttribute('data-side', 'top')
    expect(positioner()).toHaveAttribute('data-align', 'end')
  })

  it('runs an item and closes', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<RowActions onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledOnce()
    await waitForMenuToClose()
  })

  it('moves through items with the arrow keys', async () => {
    const user = userEvent.setup()
    render(<RowActions />)
    screen.getByRole('button', { name: 'More actions' }).focus()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
        'data-highlighted'
      )
    )
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveAttribute(
      'data-highlighted'
    )
    await user.keyboard('{Escape}')
    await waitForMenuToClose()
  })

  it('renders a leading icon and a trailing shortcut outside the name', async () => {
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content>
          <Menu.Item icon={<svg data-testid='icon' />} shortcut='⌘D'>
            Duplicate
          </Menu.Item>
        </Menu.Content>
      </Menu>
    )
    const item = await screen.findByRole('menuitem')
    const icon = item.querySelector('[data-slot="menu-item-icon"]')
    expect(icon).toContainElement(screen.getByTestId('icon'))
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    const shortcut = item.querySelector('[data-slot="menu-item-shortcut"]')
    expect(shortcut?.tagName).toBe('KBD')
    expect(shortcut).toHaveTextContent('⌘D')
    expect(item).toHaveClass('data-[highlighted]:focus-visible:bg-subtle')
  })

  it('colours a destructive item with its intent', async () => {
    const user = userEvent.setup()
    render(<RowActions />)
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    expect(
      await screen.findByRole('menuitem', { name: 'Cancel event' })
    ).toHaveClass('intent-danger')
    expect(
      screen.getByRole('menuitem', { name: 'Edit' }).className
    ).not.toMatch(/\bintent-/)
  })

  it('routes a link item through RoadieLinkProvider and closes', async () => {
    const user = userEvent.setup()
    const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
      <a
        data-testid='stub-link'
        href={href}
        {...rest}
        onClick={(event) => {
          rest.onClick?.(event)
          event.preventDefault()
        }}
      >
        {children}
      </a>
    )
    render(
      <RoadieLinkProvider Link={StubLink}>
        <Menu>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Content>
            <Menu.Item href='/events/123/edit'>Edit</Menu.Item>
            <Menu.Item href='https://example.com/e/123'>View on site</Menu.Item>
          </Menu.Content>
        </Menu>
      </RoadieLinkProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const edit = await screen.findByRole('menuitem', { name: 'Edit' })
    expect(edit).toHaveAttribute('data-testid', 'stub-link')
    expect(edit).toHaveAttribute('href', '/events/123/edit')
    const external = screen.getByRole('menuitem', { name: 'View on site' })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    await user.click(edit)
    await waitForMenuToClose()
  })

  it('drops the link from a disabled href item', async () => {
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content>
          <Menu.Item href='/events/123' disabled>
            View
          </Menu.Item>
        </Menu.Content>
      </Menu>
    )
    const view = await screen.findByRole('menuitem', { name: 'View' })
    expect(view).not.toHaveAttribute('href')
    expect(view).toHaveAttribute('aria-disabled', 'true')
  })

  it('toggles a checkbox item and shows its check', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Columns</Menu.Trigger>
        <Menu.Content>
          <Menu.Group>
            <Menu.GroupLabel>Show columns</Menu.GroupLabel>
            <Menu.CheckboxItem defaultChecked onCheckedChange={onCheckedChange}>
              Venue
            </Menu.CheckboxItem>
          </Menu.Group>
        </Menu.Content>
      </Menu>
    )
    const group = await screen.findByRole('group', { name: 'Show columns' })
    const venue = within(group).getByRole('menuitemcheckbox', {
      name: 'Venue'
    })
    expect(venue).toHaveAttribute('aria-checked', 'true')
    expect(
      venue.querySelector('[data-slot="menu-item-indicator"] svg')
    ).toBeInTheDocument()
    await user.click(venue)
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything())
    expect(venue).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('picks one radio item in a group', async () => {
    const user = userEvent.setup()
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Sort</Menu.Trigger>
        <Menu.Content>
          <Menu.RadioGroup defaultValue='date'>
            <Menu.RadioItem value='date'>Date</Menu.RadioItem>
            <Menu.RadioItem value='name'>Name</Menu.RadioItem>
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu>
    )
    const date = await screen.findByRole('menuitemradio', { name: 'Date' })
    const name = screen.getByRole('menuitemradio', { name: 'Name' })
    expect(date).toHaveAttribute('aria-checked', 'true')
    await user.click(name)
    expect(name).toHaveAttribute('aria-checked', 'true')
    expect(date).toHaveAttribute('aria-checked', 'false')
  })

  it('opens a submenu beside its trigger, aligned to the first row', async () => {
    const user = userEvent.setup()
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Edit</Menu.Item>
          <Menu.SubmenuRoot>
            <Menu.SubmenuTrigger>Move to</Menu.SubmenuTrigger>
            <Menu.Content>
              <Menu.Item>Drafts</Menu.Item>
            </Menu.Content>
          </Menu.SubmenuRoot>
        </Menu.Content>
      </Menu>
    )
    const trigger = await screen.findByRole('menuitem', { name: 'Move to' })
    expect(
      trigger.querySelector('[data-slot="menu-submenu-icon"]')
    ).toBeInTheDocument()
    await user.click(trigger)
    expect(
      await screen.findByRole('menuitem', { name: 'Drafts' })
    ).toBeInTheDocument()
    const positioners = document.querySelectorAll(
      '[data-slot="menu-positioner"]'
    )
    expect(positioners).toHaveLength(2)
    expect(positioners[1]).toHaveAttribute('data-side', 'inline-end')
  })

  it('slots its parts', async () => {
    render(
      <Menu defaultOpen>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Content>
          <Menu.Group>
            <Menu.GroupLabel>Event</Menu.GroupLabel>
            <Menu.Item>Edit</Menu.Item>
          </Menu.Group>
          <Menu.Separator />
        </Menu.Content>
      </Menu>
    )
    await screen.findByRole('menu')
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'data-slot',
      'menu-trigger'
    )
    for (const slot of ['menu-group', 'menu-group-label', 'menu-item']) {
      expect(
        document.querySelector(`[data-slot="${slot}"]`)
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('separator')).toHaveAttribute(
      'data-slot',
      'menu-separator'
    )
  })
})
