import type { ReactElement } from 'react'

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { Badge } from '../Badge'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand
} from './testUtils'

// Base UI unmounts the popup after its exit transition, a tick after close.
const waitForMenuToClose = () =>
  waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())

const vertical = () => primaryOf('vertical')
const horizontal = () => primaryOf('horizontal')

function Tree({
  value = '/home',
  signOut = () => {},
  menuLabel
}: {
  value?: string
  signOut?: () => void
  menuLabel?: string
}) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/home' href='/home' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item value='account' icon={<FakeIcon />} placement='pinned'>
          Account
          <Navigator.Menu aria-label={menuLabel}>
            <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            <Navigator.MenuItem onSelect={signOut}>Sign out</Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('Navigator.Menu', () => {
  it('opens a menu anchored inline-end of the vertical tile', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(vertical()).getByRole('button', { name: 'Account' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(menu.closest('[data-side]')).toHaveAttribute(
      'data-side',
      'inline-end'
    )
  })

  it('opens from the keyboard with the tooltip merged onto the tile', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(vertical()).getByRole('button', { name: 'Account' })
    expect(trigger).toHaveAttribute('data-slot', 'navigator-item')
    expect(trigger).toHaveAttribute('data-base-ui-tooltip-trigger')
    trigger.focus()
    await user.keyboard('{Enter}')
    const menu = await screen.findByRole('menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', menu.id)
  })

  it('names the menu after its item, unless it declares its own', async () => {
    const user = userEvent.setup()
    const openMenu = async (ui: ReactElement) => {
      const { unmount } = render(ui)
      await flushViewportMeasurement()
      await user.click(
        within(vertical()).getByRole('button', { name: 'Account' })
      )
      const menu = await screen.findByRole('menu')
      return { menu, unmount }
    }
    const byItem = await openMenu(<Tree />)
    expect(byItem.menu).toHaveAccessibleName('Account')
    byItem.unmount()
    const declared = await openMenu(<Tree menuLabel='Your account' />)
    expect(declared.menu).toHaveAccessibleName('Your account')
  })

  it('moves with the arrow keys and typeahead', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'data-highlighted'
    )
    await user.keyboard('s')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveAttribute(
      'data-highlighted'
    )
  })

  it('closes on Escape and returns focus to its tile', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(vertical()).getByRole('button', { name: 'Account' })
    await user.click(trigger)
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    await waitForMenuToClose()
    expect(trigger).toHaveFocus()
  })

  it('runs onSelect and closes', async () => {
    const user = userEvent.setup()
    const signOut = vi.fn()
    render(<Tree signOut={signOut} />)
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledOnce()
    await waitForMenuToClose()
  })

  it('routes an href item through the provider as a link, and closes on follow', async () => {
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
        onSelect={(event) => {
          rest.onSelect?.(event)
          event.preventDefault()
        }}
      >
        {children}
      </a>
    )
    render(
      <RoadieLinkProvider Link={StubLink}>
        <Tree />
      </RoadieLinkProvider>
    )
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    const profile = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(profile).toHaveAttribute('data-testid', 'stub-link')
    expect(profile).toHaveAttribute('href', '/profile')
    await user.click(profile)
    await waitForMenuToClose()
  })

  it('slots its rendered parts', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/home'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='account'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem icon={<FakeIcon />}>
                Sign out
              </Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    const menu = await screen.findByRole('menu')
    expect(menu).toHaveAttribute('data-slot', 'navigator-menu')
    expect(menu).toHaveClass('emphasis-floating', 'is-translucent')
    const item = within(menu).getByRole('menuitem', { name: 'Sign out' })
    expect(item).toHaveAttribute('data-slot', 'navigator-menu-item')
    const iconTile = item.querySelector(
      '[data-slot="navigator-menu-item-icon"]'
    )
    expect(iconTile).toBeInTheDocument()
    expect(iconTile).toHaveClass('size-6', 'emphasis-subtle')
    expect(
      item.querySelector('[data-slot="navigator-menu-item-label"]')
    ).toHaveTextContent('Sign out')
  })

  it('never lights from the route on the tile, the bar or in More', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='me/billing/2024'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/home' href='/home'>
            Home
          </Navigator.Item>
          <Navigator.Item value='me' placement='pinned'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
          <Navigator.Item value='me/billing' placement='pinned'>
            Billing
            <Navigator.Menu>
              <Navigator.MenuItem>Invoices</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const tile = within(vertical()).getByRole('button', { name: 'Account' })
    expect(tile).not.toHaveAttribute('aria-current')
    expect(tile).not.toHaveAttribute('data-current')
    const circle = within(horizontal()).getByRole('button', { name: 'Account' })
    expect(circle).not.toHaveAttribute('aria-current')
    expect(circle).not.toHaveAttribute('data-current')
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    expect(more).not.toHaveAttribute('aria-current')
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const row = within(pane).getByRole('button', { name: 'Billing' })
    expect(row).not.toHaveAttribute('aria-current')
  })

  it('reads active only while open, and the route tile yields', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(vertical()).getByRole('button', { name: 'Account' })
    const home = within(vertical()).getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('data-current')
    await user.click(trigger)
    await screen.findByRole('menu')
    expect(trigger).toHaveAttribute('data-current')
    expect(trigger).not.toHaveAttribute('aria-current')
    expect(home).not.toHaveAttribute('data-current')
    expect(home).toHaveAttribute('aria-current', 'page')
    await user.keyboard('{Escape}')
    expect(trigger).not.toHaveAttribute('data-current')
    expect(home).toHaveAttribute('data-current')
  })

  it('opens above its tab on the phone bar, and only that copy', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    const circle = within(horizontal()).getByRole('button', { name: 'Account' })
    expect(
      circle.closest('[data-slot="navigator-primary-circle"]')
    ).toBeInTheDocument()
    await user.click(circle)
    expect(await screen.findAllByRole('menu')).toHaveLength(1)
    expect(circle).toHaveAttribute('aria-expanded', 'true')
    expect(circle).toHaveAttribute('data-current')
    expect(circle).not.toHaveAttribute('aria-current')
    const home = within(horizontal()).getByRole('link', { name: 'Home' })
    expect(home).toHaveAttribute('aria-current', 'page')
    expect(home).not.toHaveAttribute('data-current')
    expect(horizontal().querySelectorAll('[aria-current]')).toHaveLength(1)
    expect(screen.getByRole('menu').closest('[data-side]')).toHaveAttribute(
      'data-side',
      'top'
    )
    expect(
      within(vertical()).getByRole('button', { name: 'Account' })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it("closes More when a tab's menu opens", async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='high'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    await user.click(
      within(horizontal()).getByRole('button', { name: 'Account' })
    )
    await screen.findByRole('menu')
    expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps More announcing a folded current page while a menu is open', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/e'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='high'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = horizontal()
    const more = within(bar).getByRole('button', { name: 'More' })
    expect(more).toHaveAttribute('aria-current', 'true')
    await user.click(within(bar).getByRole('button', { name: 'Account' }))
    await screen.findByRole('menu')
    expect(more).not.toHaveAttribute('data-current')
    expect(more).toHaveAttribute('aria-current', 'true')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('opens a folded menu below its row in the More pane', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const row = within(pane).getByRole('button', { name: 'Account' })
    expect(
      row.querySelector('[data-slot="list-item-content"]')
    ).toBeInTheDocument()
    expect(
      row.querySelector('[data-slot="list-item-title"]')
    ).toHaveTextContent('Account')
    expect(row.querySelector('[data-slot="list-item-chevron"]')).toBeNull()
    await user.click(row)
    expect(
      (await screen.findByRole('menu')).closest('[data-side]')
    ).toHaveAttribute('data-side', 'bottom')
    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(row).not.toHaveAttribute('aria-current')
  })

  it('closes More when an item is chosen from a More row', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    await user.click(within(pane).getByRole('button', { name: 'Account' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await waitForMenuToClose()
    expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes only the topmost layer on each Escape', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const row = within(pane).getByRole('button', { name: 'Account' })
    await user.click(row)
    await screen.findByRole('menu')

    await user.keyboard('{Escape}')
    await waitForMenuToClose()
    expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(row).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveFocus()
  })

  it('leaves More open when Escape closes a menu from outside it', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    await user.click(within(pane).getByRole('button', { name: 'Account' }))
    await screen.findByRole('menu')

    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitForMenuToClose()
    expect(more).toHaveAttribute('aria-expanded', 'true')
  })

  it("keeps a tile's tooltip shut while its menu is open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Tree />)
    await flushViewportMeasurement()
    const trigger = within(vertical()).getByRole('button', { name: 'Account' })
    await user.click(trigger)
    await screen.findByRole('menu')
    await user.unhover(trigger)
    await user.hover(trigger)
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull()
    vi.useRealTimers()
  })
})

describe('Navigator.MenuItem description', () => {
  it('renders the description beneath the label and describes the item by it', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/home'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='account'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem description='luke@example.com'>
                Profile
              </Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    const item = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(item).toHaveAccessibleName('Profile')
    expect(item).toHaveAccessibleDescription('luke@example.com')
    expect(
      item.querySelector('[data-slot="navigator-menu-item-description"]')
    ).toHaveTextContent('luke@example.com')
  })

  it('has no description slot or aria-describedby when none is given', async () => {
    const user = userEvent.setup()
    render(<Tree />)
    await flushViewportMeasurement()
    await user.click(
      within(vertical()).getByRole('button', { name: 'Account' })
    )
    const item = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(item).not.toHaveAttribute('aria-describedby')
    expect(
      item.querySelector('[data-slot="navigator-menu-item-description"]')
    ).toBeNull()
  })

  it('carries the description through a folded menu row', async () => {
    const user = userEvent.setup()
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account' visibilityPriority='low'>
            Account
            <Navigator.Menu>
              <Navigator.MenuItem description='luke@example.com'>
                Profile
              </Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    await user.click(within(pane).getByRole('button', { name: 'Account' }))
    const item = await screen.findByRole('menuitem', { name: 'Profile' })
    expect(item).toHaveAccessibleDescription('luke@example.com')
  })
})

describe('folded rows stay current', () => {
  function Folded({ count, seen }: { count: number; seen: number[] }) {
    return (
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Item
          value='/inbox'
          href='/inbox'
          badge={<Badge>{count}</Badge>}
        >
          Inbox
        </Navigator.Item>
        <Navigator.Item value='account' visibilityPriority='low'>
          Account
          <Navigator.Menu>
            <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
            <Navigator.MenuItem onSelect={() => seen.push(count)}>
              Sign out
            </Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
    )
  }

  const app = (count: number, seen: number[]) => (
    <Navigator value='/a'>{Folded({ count, seen })}</Navigator>
  )

  const morePane = () =>
    document.querySelector<HTMLElement>(
      '[data-slot="navigator-overflow-items"]:not(.max-md\\:hidden)'
    )!

  it("updates a folded item's badge", async () => {
    const user = userEvent.setup()
    const { rerender } = render(app(1, []))
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    const inbox = within(morePane()).getByRole('link', { name: /Inbox/ })
    expect(inbox).toHaveTextContent('1')
    rerender(app(7, []))
    await flushViewportMeasurement()
    expect(
      within(morePane()).getByRole('link', { name: /Inbox/ })
    ).toHaveTextContent('7')
  })

  it("calls a folded menu item's current onSelect", async () => {
    const user = userEvent.setup()
    const seen: number[] = []
    const { rerender } = render(app(0, seen))
    await flushViewportMeasurement()
    rerender(app(1, seen))
    rerender(app(2, seen))
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    await user.click(
      within(morePane()).getByRole('button', { name: 'Account' })
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))
    await waitForMenuToClose()
    expect(seen).toEqual([2])
  })
})
