import { StrictMode, useState } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from '@oztix/roadie-core/navigator'

import { Navigator } from '.'
import { Badge } from '../Badge'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand,
  withStubLink
} from './testUtils'
import {
  navigatorBrandVariants,
  navigatorCapsuleVariants,
  navigatorExpandToggleAnchorVariants,
  navigatorGroupTitleVariants,
  navigatorItemLabelClass,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryClusterContentVariants,
  navigatorPrimaryClusterVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryVerticalVariants
} from './variants'

const vertical = () => primaryOf('vertical')
const horizontal = () => primaryOf('horizontal')
const region = (name: string) =>
  vertical().querySelector<HTMLElement>(
    `[data-slot="navigator-primary-${name}"]`
  )!

type ObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
) => void
const observers = new Map<Element, Set<ObserverCallback>>()
class StubResizeObserver {
  constructor(private callback: ObserverCallback) {}
  observe(target: Element) {
    const callbacks = observers.get(target) ?? new Set()
    callbacks.add(this.callback)
    observers.set(target, callbacks)
  }
  unobserve() {}
  disconnect() {}
}
const reportClusterHeight = (px: number) => {
  const viewport = region('cluster').querySelector(
    '[data-slot="navigator-primary-cluster-viewport"]'
  )!
  act(() => {
    for (const callback of observers.get(viewport) ?? []) {
      callback(
        [{ contentRect: { height: px } } as ResizeObserverEntry],
        {} as ResizeObserver
      )
    }
  })
}

beforeEach(() => {
  observers.clear()
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Six({
  value = '/a',
  lowGroup = false,
  onValueChange
}: {
  value?: string
  lowGroup?: boolean
  onValueChange?: (next: string) => void
}) {
  return (
    <Navigator value={value} onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Logo</Navigator.Brand>
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Group visibilityPriority={lowGroup ? 'low' : undefined}>
          <Navigator.GroupTitle>Extra</Navigator.GroupTitle>
          <Navigator.Item value='/e' href='/e' icon={<FakeIcon />}>
            /e
          </Navigator.Item>
          <Navigator.Item value='/f' href='/f' icon={<FakeIcon />}>
            /f
          </Navigator.Item>
        </Navigator.Group>
        <Navigator.Item
          value='/me'
          href='/me'
          icon={<FakeIcon />}
          placement='pinned'
        >
          Me
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

describe('vertical regions', () => {
  it('lets the page show through every capsule, grouped, loose or pinned', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const capsules = vertical().querySelectorAll(
      '[data-slot="navigator-capsule"]'
    )
    expect(
      region('pinned').querySelector('[data-slot="navigator-capsule"]')
    ).not.toBeNull()
    expect(capsules.length).toBeGreaterThanOrEqual(3)
    for (const capsule of capsules) {
      expect(capsule).toHaveClass('emphasis-raised', 'is-translucent')
    }
  })

  it('puts brand on top, the cluster between, pinned at the bottom', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const children = Array.from(vertical().children).map((el) =>
      el.getAttribute('data-slot')
    )
    expect(children).toEqual([
      'navigator-primary-brand',
      'navigator-primary-cluster',
      'navigator-primary-pinned'
    ])
    expect(within(region('brand')).getByText('Logo')).toBeInTheDocument()
    expect(
      within(region('pinned')).getByRole('link', { name: 'Me' })
    ).toBeInTheDocument()
    expect(
      within(region('cluster')).queryByRole('link', { name: 'Me' })
    ).toBeNull()
  })

  it('draws a capsule per group and one for each run of loose items', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(
      region('cluster').querySelectorAll('[data-slot="navigator-capsule"]')
    ).toHaveLength(2)
    expect(
      within(region('cluster')).getByRole('list', { name: 'Extra' })
    ).toBeInTheDocument()
  })

  it('shuts group titles while collapsed but keeps them readable', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const title = within(region('cluster')).getByRole('heading', {
      name: 'Extra'
    })
    expect(title).toHaveClass('grid-rows-[0fr]', 'opacity-0')
    expect(title).not.toHaveClass('sr-only')
    expect(vertical()).not.toHaveAttribute('data-expanded')
  })

  it('folds nothing until the cluster has been measured', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(
      within(region('cluster')).queryByRole('button', { name: 'More' })
    ).toBeNull()
  })
  it('renders only the regions it has, so no empty row adds a gutter', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      Array.from(vertical().children).map((el) => el.getAttribute('data-slot'))
    ).toEqual(['navigator-primary-cluster'])
    const layout = navigatorPrimaryVerticalVariants().split(' ')
    expect(layout).toEqual(expect.arrayContaining(['md:flex', 'flex-col']))
    expect(layout.some((name) => name.startsWith('grid-rows-'))).toBe(false)
    expect(navigatorPrimaryClusterVariants().split(' ')).toContain('flex-1')
  })

  it('keeps the press, colour and focus transitions of is-interactive on a tile', () => {
    const classes = navigatorItemVariants().split(' ')
    expect(classes).toContain('is-interactive')
    expect(classes.filter((name) => /(^|:)transition/.test(name))).toEqual([])
  })
})

describe('vertical capacity', () => {
  it('folds the lowest-ranked items into a More tile at the end of the cluster', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    // 12rem at 16px: two tiles + More fit (6.75 + 3.5 + 0.75 + 1 = 12).
    reportClusterHeight(192)
    const cluster = region('cluster')
    expect(within(cluster).getAllByRole('link')).toHaveLength(2)
    const more = within(cluster).getByRole('button', { name: 'More' })
    expect(within(more).getByText('More')).toHaveAttribute(
      'data-slot',
      'navigator-item-label'
    )
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const verticalRows = document.querySelector<HTMLElement>(
      '[data-slot="pane"][id] [data-slot="navigator-overflow-items"].max-md\\:hidden'
    )!
    expect(within(verticalRows).getAllByRole('link')).toHaveLength(4)
  })

  it('renders More duotone at size-6 on the tile, size-7 in the bar, and its rows at size-5', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    expect(
      within(horizontal())
        .getByRole('button', { name: 'More' })
        .querySelector('svg')
    ).toHaveClass('size-7')
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    const moreIcon = more.querySelector('svg')!
    expect(moreIcon).toHaveClass('size-6')
    // Phosphor draws duotone's second tone as a 0.2-opacity path.
    expect(moreIcon.querySelector('[opacity="0.2"]')).not.toBeNull()
    expect(moreIcon).not.toHaveClass('animate-pop-tap')
    await user.click(more)
    expect(more.querySelector('svg')).toHaveClass('animate-pop-tap')
    const rowIcons = document.querySelectorAll(
      '[data-slot="navigator-overflow-items"] [data-testid="fake-icon"]'
    )
    expect(rowIcons.length).toBeGreaterThan(0)
    for (const icon of rowIcons) {
      expect(icon).toHaveAttribute('data-weight', 'duotone')
      expect(icon).toHaveClass('size-5', 'text-subtle')
    }
  })

  it('removes a capsule whose items all fold', async () => {
    render(<Six lowGroup />)
    await flushViewportMeasurement()
    // Room for the four loose tiles and More: 13.25 + 3.5 + 0.75 + 1 = 18.5rem.
    reportClusterHeight(18.5 * 16)
    expect(
      within(region('cluster')).queryByRole('list', { name: 'Extra' })
    ).toBeNull()
  })

  it('lights More while the current section is folded', async () => {
    render(<Six value='/f' />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    expect(
      within(region('cluster')).getByRole('button', { name: 'More' })
    ).toHaveAttribute('data-current')
  })

  it('returns focus to the More tile when Escape closes More', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const tab = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(tab)
    await user.keyboard('{Escape}')
    expect(tab).toHaveFocus()

    const tile = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(tile)
    expect(tile).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(tile).toHaveAttribute('aria-expanded', 'false')
    expect(tile).toHaveFocus()
  })

  it('opens one menu from a row folded in both orientations', async () => {
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
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    // Four tiles and More: 13.25 + 3.5 + 0.75 + 1 = 18.5rem.
    reportClusterHeight(18.5 * 16)
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    const [horizontalRows, verticalRows] = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-slot="pane"][id] [data-slot="navigator-overflow-items"]'
      )
    )
    await user.click(
      within(verticalRows!).getByRole('button', { name: 'Account' })
    )
    await screen.findByRole('menu')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(
      within(horizontalRows!).getByRole('button', { name: 'Account' })
    ).toHaveAttribute('aria-expanded', 'false')
  })
  it('gives the pill back when an open menu’s tile folds away', async () => {
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
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    reportClusterHeight(1000)
    const a = within(region('cluster')).getByRole('link', { name: '/a' })
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'Account' })
    )
    await screen.findByRole('menu')
    expect(a).not.toHaveAttribute('data-current')

    reportClusterHeight(18.5 * 16)
    await flushViewportMeasurement()
    expect(
      within(region('cluster')).queryByRole('button', { name: 'Account' })
    ).toBeNull()
    expect(a).toHaveAttribute('data-current')
    expect(
      within(horizontal()).getByRole('link', { name: '/a' })
    ).toHaveAttribute('data-current')
  })

  it('puts the More capsule last in the cluster', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const content = region('cluster').querySelector(
      '[data-slot="navigator-primary-cluster-track"]'
    )!
    const last = [
      ...content.querySelectorAll<HTMLElement>(
        ':scope > [data-slot="navigator-capsule"]'
      )
    ].at(-1)!
    expect(
      within(last).getByRole('button', { name: 'More' })
    ).toBeInTheDocument()
  })

  it('takes the pill from a visible current tile while More is open', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const current = within(region('cluster')).getByRole('link', { name: '/a' })
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    expect(current).toHaveAttribute('data-current')
    expect(current).toHaveClass('intent-accent')
    await user.click(more)
    expect(more).toHaveAttribute('data-current')
    expect(more).toHaveClass('intent-accent')
    expect(current).not.toHaveAttribute('data-current')
    expect(current).not.toHaveClass('intent-accent')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('takes the pill from a current pinned tile while More is open', async () => {
    const user = userEvent.setup()
    render(<Six value='/me' />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const me = within(region('pinned')).getByRole('link', { name: 'Me' })
    expect(me).toHaveAttribute('data-current')
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    expect(me).not.toHaveAttribute('data-current')
    expect(me).not.toHaveClass('intent-accent')
    expect(me).toHaveAttribute('aria-current', 'page')
  })
})

function RoutedSix() {
  const [value, setValue] = useState('/a')
  return withStubLink(<Six value={value} onValueChange={setValue} />)
}

const overflowPane = () =>
  document.querySelector<HTMLElement>('[data-slot="pane"][id]')!

describe('choosing a primary item closes More', () => {
  it('moves the pill from the More tile to the chosen cluster item', async () => {
    const user = userEvent.setup()
    render(<RoutedSix />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(more)
    expect(overflowPane()).not.toHaveClass('lg:hidden')
    const b = within(region('cluster')).getByRole('link', { name: '/b' })
    await user.click(b)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).not.toHaveAttribute('data-current')
    expect(b).toHaveAttribute('data-current')
    expect(b).toHaveAttribute('aria-current', 'page')
    expect(overflowPane()).toHaveClass('lg:hidden')
  })

  it('closes More when the already-current item is chosen', async () => {
    const user = userEvent.setup()
    render(withStubLink(<Six />))
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(more)
    const a = within(region('cluster')).getByRole('link', { name: '/a' })
    await user.click(a)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(a).toHaveAttribute('data-current')
  })

  it('closes More when the pinned tile is chosen', async () => {
    const user = userEvent.setup()
    render(<RoutedSix />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(more)
    await user.click(within(region('pinned')).getByRole('link', { name: 'Me' }))
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(
      within(region('pinned')).getByRole('link', { name: 'Me' })
    ).toHaveAttribute('data-current')
  })

  it('closes More when the value changes from outside, e.g. Back', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(more)
    rerender(<Six value='/b' />)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(
      within(region('cluster')).getByRole('link', { name: '/b' })
    ).toHaveAttribute('data-current')
  })

  it('brings back the chosen section’s own pane', async () => {
    function Sectioned() {
      const [value, setValue] = useState('/a')
      return withStubLink(
        <Navigator value={value} onValueChange={setValue}>
          <Navigator.Primary aria-label='Main'>
            <Navigator.Brand>Logo</Navigator.Brand>
            <Navigator.Item
              value='/s'
              href='/s'
              icon={<FakeIcon />}
              visibilityPriority='high'
            >
              Section
              <Navigator.Secondary aria-label='Section pages'>
                <Navigator.Item value='/s/one' href='/s/one'>
                  One
                </Navigator.Item>
              </Navigator.Secondary>
            </Navigator.Item>
            {['/a', '/b', '/c', '/d', '/e'].map((v) => (
              <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
                {v}
              </Navigator.Item>
            ))}
          </Navigator.Primary>
          <Navigator.Content />
        </Navigator>
      )
    }
    const user = userEvent.setup()
    render(<Sectioned />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    expect(document.querySelector('[data-navigator-section]')).toBeNull()
    await user.click(
      within(region('cluster')).getByRole('link', { name: 'Section' })
    )
    expect(
      document.querySelector('[data-navigator-section="/s"]')
    ).toBeInTheDocument()
    expect(overflowPane()).toHaveClass('lg:hidden')
  })

  it('closes More when a bar tab or the pinned circle is tapped', async () => {
    const user = userEvent.setup()
    render(<RoutedSix />)
    await flushViewportMeasurement()
    const more = within(horizontal()).getByRole('button', { name: 'More' })
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const b = within(horizontal()).getByRole('link', { name: '/b' })
    await user.click(b)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(b).toHaveAttribute('data-current')
    expect(overflowPane()).toHaveClass('lg:hidden')

    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const me = within(horizontal()).getByRole('link', { name: 'Me' })
    await user.click(me)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(me).toHaveAttribute('data-current')
  })
})

describe('an item’s onClick', () => {
  it('fires from the tile, the bar, a More row and a menu trigger', async () => {
    const user = userEvent.setup()
    const clicked = vi.fn()
    render(
      withStubLink(
        <Navigator value='/a'>
          <Navigator.Primary aria-label='Main'>
            {testBrand}
            {['/a', '/b', '/c', '/d', '/e'].map((v) => (
              <Navigator.Item
                key={v}
                value={v}
                href={v}
                icon={<FakeIcon />}
                visibilityPriority={v === '/e' ? 'low' : undefined}
                onClick={() => clicked(v)}
              >
                {v}
              </Navigator.Item>
            ))}
            <Navigator.Item
              value='account'
              icon={<FakeIcon />}
              onClick={() => clicked('account')}
            >
              Account
              <Navigator.Menu>
                <Navigator.MenuItem>Sign out</Navigator.MenuItem>
              </Navigator.Menu>
            </Navigator.Item>
          </Navigator.Primary>
          <Navigator.Content />
        </Navigator>
      )
    )
    await flushViewportMeasurement()
    reportClusterHeight(1000)
    await user.click(
      within(region('cluster')).getByRole('link', { name: '/b' })
    )
    await user.click(within(horizontal()).getByRole('link', { name: '/c' }))
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    await user.click(
      within(overflowPane()).getAllByRole('link', { name: '/e' })[0]!
    )
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'Account' })
    )
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(clicked.mock.calls.map(([value]) => value)).toEqual([
      '/b',
      '/c',
      '/e',
      'account'
    ])
  })
})

function SectionedMore({ expanded = false }: { expanded?: boolean }) {
  return (
    <Navigator value='/s' expanded={expanded}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item
          value='/s'
          href='/s'
          icon={<FakeIcon />}
          visibilityPriority='high'
        >
          Section
          <Navigator.Secondary aria-label='Section pages'>
            <Navigator.Item value='/s/one' href='/s/one'>
              One
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        {['/a', '/b', '/c'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

describe('More with nothing left folded', () => {
  const openVerticalMore = async () => {
    const user = userEvent.setup()
    reportClusterHeight(192)
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    expect(document.querySelector('[data-navigator-section]')).toBeNull()
  }

  const expectMoreClosed = () => {
    expect(
      within(region('cluster')).queryByRole('button', { name: 'More' })
    ).toBeNull()
    expect(document.querySelector('[aria-expanded="true"]')).toBeNull()
    expect(
      document.querySelector('[data-navigator-section="/s"]')
    ).toHaveAttribute('data-stack-position', 'top')
  }

  it('closes when expanding unfolds every item', async () => {
    const { rerender } = render(<SectionedMore />)
    await flushViewportMeasurement()
    await openVerticalMore()
    rerender(<SectionedMore expanded />)
    expectMoreClosed()
  })

  it('closes when the window grows until every item fits', async () => {
    render(<SectionedMore />)
    await flushViewportMeasurement()
    await openVerticalMore()
    reportClusterHeight(1000)
    expectMoreClosed()
  })

  it('stays open when the vertical navigation hides and the bar still folds', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const user = userEvent.setup()
    const tile = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(tile)
    reportClusterHeight(0)
    expect(
      within(horizontal()).getByRole('button', { name: 'More' })
    ).toHaveAttribute('aria-expanded', 'true')
  })
})

function Expandable(props: {
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (next: boolean) => void
  expandedFromDocument?: boolean
}) {
  return (
    <Navigator value='/a' {...props}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Group>
          <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            Alpha
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b' icon={<FakeIcon />}>
            Beta
          </Navigator.Item>
          <Navigator.Item value='/c' href='/c' icon={<FakeIcon />}>
            Gamma
          </Navigator.Item>
        </Navigator.Group>
        <Navigator.ExpandToggle />
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

function BrandedExpandable({ expanded }: { expanded: boolean }) {
  return (
    <Navigator value='/a' expanded={expanded}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Logo</Navigator.Brand>
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
          Alpha
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content />
    </Navigator>
  )
}

describe('expanded vertical navigation', () => {
  it('toggles, uncontrolled, with a labelled button that controls the vertical navigation', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', vertical().id)
    await user.click(toggle)
    expect(vertical()).toHaveAttribute('data-expanded')
    expect(toggle).toHaveAccessibleName('Collapse sidebar')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('draws the toggle icon duotone at size-5, subtle', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    const icon = toggle.querySelector('svg')!
    expect(icon).toHaveClass('size-5')
    expect(icon.querySelector('[opacity="0.2"]')).not.toBeNull()
    expect(toggle).toHaveClass('text-subtle')
  })

  it('is controlled by expanded and reports changes', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    render(<Expandable expanded onExpandedChange={onExpandedChange} />)
    await flushViewportMeasurement()
    await user.click(
      within(region('brand')).getByRole('button', {
        name: 'Collapse sidebar'
      })
    )
    expect(onExpandedChange).toHaveBeenCalledWith(false)
    expect(vertical()).toHaveAttribute('data-expanded')
  })

  it('matches navigator-expanded inside the vertical navigation only while expanded', async () => {
    const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
    const { rerender } = render(<Expandable expanded />)
    await flushViewportMeasurement()
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(
      true
    )
    expect(within(region('cluster')).getByText('Docs').matches(scope)).toBe(
      true
    )
    rerender(<Expandable expanded={false} />)
    expect(vertical()).not.toHaveAttribute('data-expanded')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(
      false
    )
  })

  it('never expands a Navigator nested in an expanded one', async () => {
    const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
    render(
      <Navigator value='/a' expanded>
        <Navigator.Primary aria-label='Outer'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            Outer
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator value='/x'>
            <Navigator.Primary aria-label='Inner'>
              {testBrand}
              <Navigator.Item value='/x' href='/x'>
                Inner
              </Navigator.Item>
            </Navigator.Primary>
          </Navigator>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const inner = screen.getByRole('navigation', { name: 'Inner' })
    expect(within(inner).getByText('Inner').matches(scope)).toBe(false)
  })

  it('writes each expanded style once, through the variant', () => {
    const classes = [
      navigatorPrimaryVerticalVariants(),
      navigatorPrimaryClusterContentVariants(),
      navigatorPrimaryPinnedVariants(),
      navigatorCapsuleVariants(),
      navigatorItemVariants(),
      navigatorItemLabelClass,
      navigatorGroupTitleVariants(),
      navigatorPrimaryBrandVariants({ toggle: true }),
      navigatorBrandVariants(),
      navigatorExpandToggleAnchorVariants()
    ].join(' ')
    expect(classes).toContain('navigator-expanded:w-60')
    expect(classes).toContain('navigator-expanded:opacity-100')
    expect(classes).not.toMatch(/\[html\[|data-\[expanded|expanded=false/)
  })

  it('starts the brand on the icon column in both states', async () => {
    const { rerender } = render(<BrandedExpandable expanded={false} />)
    await flushViewportMeasurement()
    const brand = () =>
      region('brand').querySelector<HTMLElement>(
        '[data-slot="navigator-brand"]'
      )!
    for (const expanded of [false, true]) {
      rerender(<BrandedExpandable expanded={expanded} />)
      expect(brand()).toHaveClass(
        'ps-1',
        'grid-cols-[minmax(3rem,auto)]',
        'justify-items-start',
        '[&>:first-child]:justify-self-center'
      )
      expect(brand().className).not.toMatch(
        /justify-center|justify-items-center/
      )
    }
  })

  it('centres the cluster in both states', async () => {
    const { rerender } = render(<Expandable expanded={false} />)
    await flushViewportMeasurement()
    const content = () =>
      region('cluster').querySelector<HTMLElement>(
        '[data-slot="scroll-area-content"]'
      )!
    for (const expanded of [false, true]) {
      rerender(<Expandable expanded={expanded} />)
      expect(content()).toHaveClass('min-h-full', 'content-center')
      expect(content().className).not.toMatch(/content-start/)
    }
  })

  it('keeps a 3rem tile with a size-6 icon on its own column in both states', async () => {
    const { rerender } = render(<Expandable expanded={false} />)
    await flushViewportMeasurement()
    for (const expanded of [false, true]) {
      rerender(<Expandable expanded={expanded} />)
      const tile = within(region('cluster')).getByRole('link', {
        name: 'Alpha'
      })
      expect(tile.querySelector('svg')).toHaveClass('size-6')
      const classes = tile.className.split(' ')
      expect(classes).toEqual(
        expect.arrayContaining([
          'h-12',
          'w-full',
          'grid-cols-[1.5rem_minmax(0,1fr)_auto]'
        ])
      )
      // A gap beside the empty label column squeezed the icon to half width.
      expect(
        classes.some((name) => /(^|:)(scale-|gap-|size-)/.test(name))
      ).toBe(false)
    }
  })

  it('renders the toggle beside the brand wherever it is written', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.ExpandToggle />
          <Navigator.Brand>Logo</Navigator.Brand>
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            Alpha
          </Navigator.Item>
          <Navigator.Item
            value='/me'
            href='/me'
            icon={<FakeIcon />}
            placement='pinned'
          >
            Me
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    expect(toggle.closest('[data-slot="navigator-primary-brand"]')).toBe(
      region('brand')
    )
    expect(region('brand')).toHaveClass('pb-12', 'navigator-expanded:pe-15')
    expect(
      within(region('cluster')).queryByRole('button', { name: /sidebar/ })
    ).toBeNull()
    expect(within(region('pinned')).getAllByRole('listitem')).toHaveLength(1)
    expect(within(region('pinned')).queryByRole('button')).toBeNull()
  })

  it('keeps the toggle icon-only in both states', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    const label = () =>
      toggle.querySelector('[data-slot="navigator-expand-toggle-label"]')!
    expect(label()).toHaveClass('sr-only')
    await user.click(toggle)
    expect(toggle).toHaveAccessibleName('Collapse sidebar')
    expect(label()).toHaveClass('sr-only')
    expect(
      toggle.querySelector('[data-slot="navigator-item-label"]')
    ).toBeNull()
  })

  it('labels the toggle with a tooltip while expanded too', async () => {
    const user = userEvent.setup()
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    await user.hover(
      within(region('brand')).getByRole('button', { name: 'Collapse sidebar' })
    )
    expect(
      await screen.findByText(
        'Collapse sidebar',
        { selector: '[data-slot="tooltip-popup"]' },
        { timeout: 2000 }
      )
    ).toBeInTheDocument()
  })

  it('takes no placement on the toggle', () => {
    // @ts-expect-error the toggle always sits beside the brand
    ;<Navigator.ExpandToggle placement='pinned' />
  })

  it('folds nothing while expanded', async () => {
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    reportClusterHeight(40)
    expect(within(region('cluster')).getAllByRole('link')).toHaveLength(3)
    expect(
      within(region('cluster')).queryByRole('button', { name: 'More' })
    ).toBeNull()
  })

  it('folds once on collapse, against the height the cluster settles at', async () => {
    const { rerender } = render(<Expandable expanded />)
    await flushViewportMeasurement()
    reportClusterHeight(12 * 16)
    rerender(<Expandable expanded={false} />)
    const tiles = () => within(region('cluster')).getAllByRole('link')
    const more = () =>
      within(region('cluster')).queryByRole('button', { name: 'More' })
    // Collapsed, the toggle row takes 3rem: 9rem fits one tile and More.
    expect(tiles()).toHaveLength(1)
    expect(more()).not.toBeNull()

    // Mid-collapse the brand's padding is part-way to its resting 3rem.
    region('brand').style.paddingBottom = '24px'
    reportClusterHeight(10.5 * 16)
    expect(tiles()).toHaveLength(1)
    region('brand').style.paddingBottom = '48px'
    reportClusterHeight(9 * 16)
    expect(tiles()).toHaveLength(1)
    expect(more()).not.toBeNull()
  })

  it('never renders the toggle on the phone bar', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    expect(
      within(horizontal()).queryByRole('button', { name: /sidebar/ })
    ).toBeNull()
  })
})

describe('right to left', () => {
  const physicalInset = /(^|[\s:])-?(left|right|pl|pr|ml|mr)-/

  it('anchors the toggle to the brand’s inline end with logical insets', async () => {
    render(
      <div dir='rtl'>
        <Expandable />
      </div>
    )
    await flushViewportMeasurement()
    const anchor = region('brand').querySelector<HTMLElement>(
      '[data-slot="navigator-expand-toggle-anchor"]'
    )!
    expect(anchor).toHaveClass(
      'start-1/2',
      'navigator-expanded:start-[calc(100%-1rem)]',
      'rtl:translate-x-1/2',
      'rtl:navigator-expanded:translate-x-full'
    )
    expect(anchor.className).toContain('[transition:inset-inline-start_')
    expect(anchor.className).not.toMatch(physicalInset)
    expect(region('brand')).toHaveClass('navigator-expanded:pe-15')
  })

  it('drops the content gutter on the navigation’s side, not the left', async () => {
    render(
      <div dir='rtl'>
        <Expandable />
      </div>
    )
    await flushViewportMeasurement()
    const content = document.querySelector<HTMLElement>(
      '[data-slot="navigator-content"]'
    )!
    expect(content.className).toContain(
      'group-has-[[data-slot=navigator-primary][data-orientation=vertical]]/navigator:ps-0'
    )
    expect(content.className).not.toMatch(physicalInset)
  })
})

describe('expanded from the document', () => {
  const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
  const fromDocument =
    '[data-navigator-expanded] [data-slot=navigator-primary][data-orientation=vertical][data-from-document]'
  const markDocument = () =>
    document.documentElement.setAttribute('data-navigator-expanded', '')
  afterEach(() =>
    document.documentElement.removeAttribute('data-navigator-expanded')
  )

  it('styles the vertical navigation expanded from the document attribute alone', async () => {
    markDocument()
    render(<Expandable expandedFromDocument expanded={false} />)
    await flushViewportMeasurement()
    expect(vertical()).toHaveAttribute('data-from-document')
    expect(vertical().matches(fromDocument)).toBe(true)
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(
      true
    )
    expect(document.documentElement).toHaveAttribute('data-navigator-expanded')
  })

  it('never touches the painted attribute while mounting, in StrictMode', async () => {
    markDocument()
    const toggleAttribute = vi.spyOn(
      document.documentElement,
      'toggleAttribute'
    )
    const removeAttribute = vi.spyOn(
      document.documentElement,
      'removeAttribute'
    )
    render(
      <StrictMode>
        <Expandable expandedFromDocument />
      </StrictMode>
    )
    await flushViewportMeasurement()
    expect(toggleAttribute).not.toHaveBeenCalled()
    expect(removeAttribute).not.toHaveBeenCalled()
    expect(vertical()).toHaveAttribute('data-expanded')
  })

  it('treats the vertical navigation as expanded until the app changes expanded', async () => {
    markDocument()
    const { rerender } = render(
      <Expandable expandedFromDocument expanded={false} />
    )
    await flushViewportMeasurement()
    reportClusterHeight(40)
    expect(
      within(region('cluster')).queryByRole('button', { name: 'More' })
    ).toBeNull()
    rerender(<Expandable expandedFromDocument expanded />)
    rerender(<Expandable expandedFromDocument expanded={false} />)
    expect(vertical()).not.toHaveAttribute('data-expanded')
    expect(document.documentElement).not.toHaveAttribute(
      'data-navigator-expanded'
    )
  })

  it('keeps the attribute in sync after a toggle', async () => {
    const user = userEvent.setup()
    markDocument()
    render(<Expandable expandedFromDocument />)
    await flushViewportMeasurement()
    await user.click(
      within(region('brand')).getByRole('button', {
        name: 'Collapse sidebar'
      })
    )
    expect(document.documentElement).not.toHaveAttribute(
      'data-navigator-expanded'
    )
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(
      false
    )
    await user.click(
      within(region('brand')).getByRole('button', { name: 'Expand sidebar' })
    )
    expect(document.documentElement).toHaveAttribute('data-navigator-expanded')
  })

  it('names the toggle through CSS until the document is read', async () => {
    const labels = (root: Element) =>
      Array.from(
        root.querySelectorAll('[data-slot="navigator-expand-toggle-label"]'),
        (label) => [label.textContent, label.className]
      )
    const host = document.createElement('div')
    host.innerHTML = renderToString(<Expandable expandedFromDocument />)
    expect(labels(host)).toEqual([
      ['Expand sidebar', 'sr-only navigator-expanded:hidden'],
      ['Collapse sidebar', 'sr-only hidden navigator-expanded:inline']
    ])

    render(<Expandable expandedFromDocument />)
    await flushViewportMeasurement()
    expect(labels(region('brand'))).toEqual([['Expand sidebar', 'sr-only']])
  })

  it('ignores the document unless opted in', async () => {
    markDocument()
    render(<Expandable />)
    await flushViewportMeasurement()
    expect(vertical()).not.toHaveAttribute('data-from-document')
    expect(within(region('cluster')).getByText('Alpha').matches(scope)).toBe(
      false
    )
    expect(
      within(region('brand')).getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument()
  })
})

describe('collapsed labels', () => {
  it('labels a tile in an aria-hidden tooltip, inline-end, on focus', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    await user.tab()
    expect(
      within(region('brand')).getByRole('link', { name: 'Logo' })
    ).toHaveFocus()
    await user.tab()
    const tile = within(region('cluster')).getByRole('link', { name: '/a' })
    expect(tile).toHaveFocus()
    expect(tile).not.toHaveAttribute('aria-label')
    expect(tile).toHaveAttribute('data-slot', 'navigator-item')
    const popup = await screen.findByText(
      '/a',
      { selector: '[data-slot="tooltip-popup"]' },
      { timeout: 2000 }
    )
    expect(popup).toHaveAttribute('aria-hidden', 'true')
    expect(popup).toHaveClass('pointer-coarse:hidden')
    expect(popup.closest('[data-slot="tooltip-positioner"]')).toHaveAttribute(
      'data-side',
      'inline-end'
    )
  })

  it('labels the More tile', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    await user.hover(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    expect(
      await screen.findByText(
        'More',
        { selector: '[data-slot="tooltip-popup"]' },
        { timeout: 2000 }
      )
    ).toBeInTheDocument()
  })

  it('keeps the More tile tooltip shut while its pane is open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', {
      name: 'More'
    })
    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    await user.unhover(more)
    await user.hover(more)
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull()
    vi.useRealTimers()
  })

  it('labels the toggle with its current label', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    expect(toggle).toHaveAttribute('data-slot', 'navigator-expand-toggle')
    await user.hover(toggle)
    expect(
      await screen.findByText(
        'Expand sidebar',
        { selector: '[data-slot="tooltip-popup"]' },
        { timeout: 2000 }
      )
    ).toBeInTheDocument()
  })

  it('shows no tooltip while expanded', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    await user.hover(
      within(region('cluster')).getByRole('link', { name: 'Alpha' })
    )
    await act(() => vi.advanceTimersByTimeAsync(1500))
    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull()
    vi.useRealTimers()
  })

  it('never puts a tooltip on the phone bar', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const trigger = '[data-base-ui-tooltip-trigger]'
    expect(vertical().querySelector(trigger)).not.toBeNull()
    expect(horizontal().querySelector(trigger)).toBeNull()
  })
})

function WithBadge(props: { defaultExpanded?: boolean }) {
  return (
    <Navigator value='/a' {...props}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item
          value='/inbox'
          href='/inbox'
          icon={<FakeIcon />}
          badge={
            <Badge intent='danger' emphasis='strong' className='consumer-badge'>
              3 unread
            </Badge>
          }
        >
          Inbox
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

function PinnedMenuBadge() {
  return (
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item
          value='account'
          icon={<FakeIcon />}
          placement='pinned'
          badge={<Badge intent='danger'>Action needed</Badge>}
        >
          Account
          <Navigator.Menu>
            <Navigator.MenuItem href='/profile'>Profile</Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

const dotOf = (tile: HTMLElement) => tile.querySelector('[data-slot="badge"]')

describe('badges', () => {
  it('shrinks to a dot in the tile corner while collapsed, still announced', async () => {
    render(<WithBadge />)
    await flushViewportMeasurement()
    const tile = within(region('cluster')).getByRole('link', { name: /Inbox/ })
    expect(dotOf(tile)).toHaveClass(
      'size-2.5',
      'absolute',
      'end-1',
      'top-1',
      'consumer-badge'
    )
    expect(within(tile).getByText('3 unread')).toHaveClass('sr-only')
    expect(tile).toHaveAccessibleName('Inbox 3 unread')
  })

  it('trails the label at the small size when expanded, keeping its className', async () => {
    render(<WithBadge defaultExpanded />)
    await flushViewportMeasurement()
    const tile = within(region('cluster')).getByRole('link', { name: /Inbox/ })
    const badge = within(tile).getByText('3 unread')
    expect(badge).not.toHaveClass('sr-only')
    expect(badge).not.toHaveClass('absolute')
    expect(badge).toHaveClass('text-xs', 'px-2', 'consumer-badge')
    expect(badge).not.toHaveClass('text-sm')
    expect(badge.parentElement).toHaveAttribute(
      'data-slot',
      'navigator-item-trailing'
    )
    expect(tile).toHaveAccessibleName('Inbox 3 unread')
  })

  it('is a dot on the phone bar', async () => {
    render(<WithBadge />)
    await flushViewportMeasurement()
    const tab = within(horizontal()).getByRole('link', { name: /Inbox/ })
    expect(dotOf(tab)).toHaveClass('size-2.5', 'absolute', 'end-1', 'top-1')
    expect(tab).toHaveAccessibleName('Inbox 3 unread')
  })

  it('is a dot on a pinned menu tile and the bar circle', async () => {
    render(<PinnedMenuBadge />)
    await flushViewportMeasurement()
    const tile = within(region('pinned')).getByRole('button', {
      name: 'Account Action needed'
    })
    expect(dotOf(tile)).toHaveClass('absolute', 'end-1', 'top-1')
    const circle = horizontal().querySelector<HTMLElement>(
      '[data-slot="navigator-primary-circle"]'
    )!
    const tab = within(circle).getByRole('button', {
      name: 'Account Action needed'
    })
    expect(dotOf(tab)).toHaveClass('absolute', 'end-1', 'top-1')
  })

  it('types badge as a Badge element', () => {
    // @ts-expect-error a string can't be given hideLabel
    ;<Navigator.Item value='/x' badge='3'>
      X
    </Navigator.Item>
  })

  it('shows a folded item as trailing content in the More pane, not sr-only', async () => {
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
          <Navigator.Item
            value='/inbox'
            href='/inbox'
            visibilityPriority='low'
            badge={
              <Badge intent='danger' emphasis='strong'>
                3 unread
              </Badge>
            }
          >
            Inbox
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const row = within(pane).getByRole('link', { name: /Inbox/ })
    expect(within(row).getByText('3 unread')).not.toHaveClass('sr-only')
    expect(within(row).getByText('3 unread')).toHaveClass('text-sm')
    expect(row).toHaveAccessibleName(/3 unread/)
  })

  it('shows a folded menu-owning item as trailing content in the More pane', async () => {
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
          <Navigator.Item
            value='account'
            visibilityPriority='low'
            badge={
              <Badge intent='danger' emphasis='strong'>
                3 unread
              </Badge>
            }
          >
            Account
            <Navigator.Menu>
              <Navigator.MenuItem>Sign out</Navigator.MenuItem>
            </Navigator.Menu>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(within(horizontal()).getByRole('button', { name: 'More' }))
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const row = within(pane).getByRole('button', { name: /Account/ })
    expect(within(row).getByText('3 unread')).not.toHaveClass('sr-only')
    expect(row).toHaveAccessibleName(/3 unread/)
  })
})
