import { type ReactNode, StrictMode, useState } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from '@oztix/roadie-core/navigator'

import { Navigator } from '.'
import { Badge } from '../Badge'
import { Logo } from '../Logo'
import { renderPaneColumnsCss } from '../Pane/paneColumns'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand,
  withStubLink
} from './testUtils'
import {
  navigatorBrandClass,
  navigatorCapsuleClass,
  navigatorExpandToggleAnchorClass,
  navigatorGroupTitleClass,
  navigatorItemLabelClass,
  navigatorItemVariants,
  navigatorPrimaryBrandVariants,
  navigatorPrimaryClusterClass,
  navigatorPrimaryClusterContentClass,
  navigatorPrimaryFrameClass,
  navigatorPrimaryPinnedClass,
  navigatorPrimaryVerticalClass
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
  onValueChange,
  showMore,
  onShowMoreChange
}: {
  value?: string
  lowGroup?: boolean
  onValueChange?: (next: string) => void
  showMore?: boolean
  onShowMoreChange?: (next: boolean) => void
}) {
  return (
    <Navigator
      value={value}
      onValueChange={onValueChange}
      showMore={showMore}
      onShowMoreChange={onShowMoreChange}
    >
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
  it('keeps every capsule a solid raised surface, grouped, loose or pinned', async () => {
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
      expect(capsule).toHaveClass('emphasis-raised')
      expect(capsule).not.toHaveClass('is-translucent')
    }
  })

  it('puts brand on top, the cluster between, pinned at the bottom', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    const children = Array.from(region('frame').children).map((el) =>
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
      Array.from(region('frame').children).map((el) =>
        el.getAttribute('data-slot')
      )
    ).toEqual(['navigator-primary-cluster'])
    const layout = navigatorPrimaryFrameClass.split(' ')
    expect(layout).toEqual(expect.arrayContaining(['flex', 'flex-col']))
    expect(layout.some((name) => name.startsWith('grid-rows-'))).toBe(false)
    expect(navigatorPrimaryClusterClass.split(' ')).toContain('flex-1')
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

  it('lights More while the current destination is folded', async () => {
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

  it('scrolls an open More to the top when its tile is chosen again, and stays open', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const tile = within(region('cluster')).getByRole('button', { name: 'More' })
    await user.click(tile)
    const scrollTo = vi.fn()
    document.querySelector<HTMLElement>(
      '[data-slot="pane"][id] [data-slot="pane-viewport"]'
    )!.scrollTo = scrollTo

    await user.click(tile)

    expect(tile).toHaveAttribute('aria-expanded', 'true')
    expect(tile).toHaveAttribute('data-current')
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
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
    expect(
      document.querySelector('[data-slot="navigator-panes"]')
    ).toHaveAttribute('data-overflow')
    const b = within(region('cluster')).getByRole('link', { name: '/b' })
    await user.click(b)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).not.toHaveAttribute('data-current')
    expect(b).toHaveAttribute('data-current')
    expect(b).toHaveAttribute('aria-current', 'page')
    expect(
      document.querySelector('[data-slot="navigator-panes"]')
    ).not.toHaveAttribute('data-overflow')
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

  it('brings back the chosen destination’s own pane', async () => {
    function WithSecondary() {
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
              Secondary
              <Navigator.Secondary aria-label='Secondary pages'>
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
    render(<WithSecondary />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    await user.click(
      within(region('cluster')).getByRole('button', { name: 'More' })
    )
    expect(document.querySelector('[data-navigator-secondary]')).toBeNull()
    await user.click(
      within(region('cluster')).getByRole('link', { name: 'Secondary' })
    )
    expect(
      document.querySelector('[data-navigator-secondary="/s"]')
    ).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="navigator-panes"]')
    ).not.toHaveAttribute('data-overflow')
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
    expect(
      document.querySelector('[data-slot="navigator-panes"]')
    ).not.toHaveAttribute('data-overflow')

    await user.click(more)
    expect(more).toHaveAttribute('aria-expanded', 'true')
    const me = within(horizontal()).getByRole('link', { name: 'Me' })
    await user.click(me)
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(me).toHaveAttribute('data-current')
  })
})

describe('More from the app’s state', () => {
  const barMore = () =>
    within(horizontal()).getByRole('button', { name: 'More' })
  const moreRow = (name: string) =>
    within(overflowPane()).getByRole('link', { name })

  it('opens and closes with showMore alone', async () => {
    const { rerender } = render(withStubLink(<Six showMore={false} />))
    await flushViewportMeasurement()
    expect(barMore()).toHaveAttribute('aria-expanded', 'false')
    rerender(withStubLink(<Six showMore />))
    expect(barMore()).toHaveAttribute('aria-expanded', 'true')
    expect(overflowPane()).toHaveAttribute('data-stack-position', 'top')
    rerender(withStubLink(<Six showMore={false} />))
    expect(barMore()).toHaveAttribute('aria-expanded', 'false')
  })

  it('asks the app to open More, and waits for it', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    render(
      withStubLink(<Six showMore={false} onShowMoreChange={onShowMoreChange} />)
    )
    await flushViewportMeasurement()
    await user.click(barMore())
    expect(onShowMoreChange).toHaveBeenCalledExactlyOnceWith(true)
    expect(barMore()).toHaveAttribute('aria-expanded', 'false')
  })

  it('scrolls on a re-tap without asking to close', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    render(withStubLink(<Six showMore onShowMoreChange={onShowMoreChange} />))
    await flushViewportMeasurement()
    const scrollTo = vi.fn()
    overflowPane().querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!.scrollTo = scrollTo
    await user.click(barMore())
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(onShowMoreChange).not.toHaveBeenCalled()
    expect(barMore()).toHaveAttribute('aria-expanded', 'true')
  })

  it('asks to close on Escape', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    render(withStubLink(<Six showMore onShowMoreChange={onShowMoreChange} />))
    await flushViewportMeasurement()
    await user.keyboard('{Escape}')
    expect(onShowMoreChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('asks to close when the current item is chosen from More', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    render(
      withStubLink(
        <Six value='/e' showMore onShowMoreChange={onShowMoreChange} />
      )
    )
    await flushViewportMeasurement()
    await user.click(moreRow('/e'))
    expect(onShowMoreChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('leaves a routed choice to the route, which closes More as it commits', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    const { rerender } = render(
      withStubLink(<Six showMore onShowMoreChange={onShowMoreChange} />)
    )
    await flushViewportMeasurement()
    await user.click(moreRow('/e'))
    await user.click(within(horizontal()).getByRole('link', { name: '/b' }))
    expect(onShowMoreChange).not.toHaveBeenCalled()
    expect(barMore()).toHaveAttribute('aria-expanded', 'true')

    rerender(
      withStubLink(
        <Six value='/e' showMore={false} onShowMoreChange={onShowMoreChange} />
      )
    )
    expect(barMore()).toHaveAttribute('aria-expanded', 'false')
    expect(onShowMoreChange).not.toHaveBeenCalled()
  })

  it('asks to close when the value changes while the app keeps More open', async () => {
    const onShowMoreChange = vi.fn()
    const { rerender } = render(
      withStubLink(<Six showMore onShowMoreChange={onShowMoreChange} />)
    )
    await flushViewportMeasurement()
    rerender(
      withStubLink(
        <Six value='/b' showMore onShowMoreChange={onShowMoreChange} />
      )
    )
    expect(barMore()).toHaveAttribute('aria-expanded', 'false')
    expect(onShowMoreChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('stays open when the same update changes the value and opens More, e.g. Back', async () => {
    const onShowMoreChange = vi.fn()
    const { rerender } = render(
      withStubLink(
        <Six value='/e' showMore={false} onShowMoreChange={onShowMoreChange} />
      )
    )
    await flushViewportMeasurement()
    rerender(withStubLink(<Six showMore onShowMoreChange={onShowMoreChange} />))
    expect(barMore()).toHaveAttribute('aria-expanded', 'true')
    expect(onShowMoreChange).not.toHaveBeenCalled()
  })

  it('reports an uncontrolled More without needing showMore', async () => {
    const user = userEvent.setup()
    const onShowMoreChange = vi.fn()
    render(withStubLink(<Six onShowMoreChange={onShowMoreChange} />))
    await flushViewportMeasurement()
    await user.click(barMore())
    expect(barMore()).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(onShowMoreChange.mock.calls).toEqual([[true], [false]])
  })
})

describe('an item’s onSelect', () => {
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
                onSelect={() => clicked(v)}
              >
                {v}
              </Navigator.Item>
            ))}
            <Navigator.Item
              value='account'
              icon={<FakeIcon />}
              onSelect={() => clicked('account')}
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

function MoreWithSecondary({ expanded = false }: { expanded?: boolean }) {
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
          Secondary
          <Navigator.Secondary aria-label='Secondary pages'>
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
    expect(document.querySelector('[data-navigator-secondary]')).toBeNull()
  }

  const expectMoreClosed = () => {
    expect(
      within(region('cluster')).queryByRole('button', { name: 'More' })
    ).toBeNull()
    expect(document.querySelector('[aria-expanded="true"]')).toBeNull()
    expect(
      document.querySelector('[data-navigator-secondary="/s"]')
    ).toHaveAttribute('data-stack-position', 'top')
  }

  it('closes when expanding unfolds every item', async () => {
    const { rerender } = render(<MoreWithSecondary />)
    await flushViewportMeasurement()
    await openVerticalMore()
    rerender(<MoreWithSecondary expanded />)
    expectMoreClosed()
  })

  it('closes when the window grows until every item fits', async () => {
    render(<MoreWithSecondary />)
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

  it('draws the toggle icon bold at size-5, subtle', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('brand')).getByRole('button', {
      name: 'Expand sidebar'
    })
    const icon = toggle.querySelector('svg')!
    expect(icon).toHaveAttribute('data-slot', 'navigator-expand-toggle-icon')
    expect(icon).toHaveClass('size-5')
    expect(icon.querySelector('[opacity="0.2"]')).toBeNull()
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
      navigatorPrimaryVerticalClass,
      navigatorPrimaryFrameClass,
      navigatorPrimaryClusterContentClass,
      navigatorPrimaryPinnedClass,
      navigatorCapsuleClass,
      navigatorItemVariants(),
      navigatorItemLabelClass,
      navigatorGroupTitleClass,
      navigatorPrimaryBrandVariants({ toggle: true }),
      navigatorBrandClass,
      navigatorExpandToggleAnchorClass
    ].join(' ')
    expect(classes).toContain(
      'navigator-expanded:w-(--navigator-primary-expanded)'
    )
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

  it.each([
    ['Expand sidebar', false],
    ['Collapse sidebar', true]
  ])(
    'labels the toggle with a tooltip of its current label (%s)',
    async (label, defaultExpanded) => {
      const user = userEvent.setup()
      render(<Expandable defaultExpanded={defaultExpanded} />)
      await flushViewportMeasurement()
      const toggle = within(region('brand')).getByRole('button', {
        name: label
      })
      expect(toggle).toHaveAttribute('data-slot', 'navigator-expand-toggle')
      await user.hover(toggle)
      expect(
        await screen.findByText(
          label,
          { selector: '[data-slot="tooltip-popup"]' },
          { timeout: 2000 }
        )
      ).toBeInTheDocument()
    }
  )

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

  it('holds the cluster’s measurements while the navigation animates, then folds once', async () => {
    const transition = (type: string) => {
      const event = new Event(type, { bubbles: true })
      Object.defineProperty(event, 'propertyName', { value: 'width' })
      act(() => {
        region('frame').dispatchEvent(event)
      })
    }
    render(<Expandable expanded={false} />)
    await flushViewportMeasurement()
    region('brand').style.paddingBottom = '48px'
    reportClusterHeight(30 * 16)
    const tiles = () => within(region('cluster')).getAllByRole('link')
    expect(tiles()).toHaveLength(3)

    transition('transitionrun')
    reportClusterHeight(12 * 16)
    reportClusterHeight(9 * 16)
    expect(tiles()).toHaveLength(3)
    transition('transitionend')
    expect(tiles()).toHaveLength(1)
  })

  it('never renders the toggle on the phone bar', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    expect(
      within(horizontal()).queryByRole('button', { name: /sidebar/ })
    ).toBeNull()
  })
})

describe('expand motion', () => {
  type AnimateArgs = Parameters<Element['animate']>
  type FakeAnimation = {
    target: Element
    keyframes: AnimateArgs[0]
    options: Exclude<AnimateArgs[1], number | undefined>
    onfinish: (() => void) | null
    cancel: ReturnType<typeof vi.fn>
  }
  let animations: FakeAnimation[] = []

  let wasAnimate: typeof Element.prototype.animate
  beforeEach(() => {
    animations = []
    wasAnimate = Element.prototype.animate
    Element.prototype.animate = function (
      this: Element,
      keyframes: AnimateArgs[0],
      options?: AnimateArgs[1]
    ) {
      const animation: FakeAnimation = {
        target: this,
        keyframes,
        options: options as FakeAnimation['options'],
        onfinish: null,
        cancel: vi.fn()
      }
      animations.push(animation)
      return animation as unknown as Animation
    }
  })
  afterEach(() => {
    Element.prototype.animate = wasAnimate
  })

  const content = () =>
    document.querySelector<HTMLElement>('[data-slot="navigator-content"]')!
  const toggle = () =>
    region('frame').querySelector<HTMLElement>(
      '[data-slot="navigator-expand-toggle"]'
    )!

  // jsdom has no layout or stylesheet, so give the hook what the browser would.
  function laidOut({ duration = '400ms' }: { duration?: string } = {}) {
    const nav = vertical()
    nav.style.setProperty('--navigator-primary-collapsed', '5rem')
    nav.style.setProperty('--navigator-primary-expanded', '15rem')
    region('frame').style.transitionDuration = duration
    region('frame').style.transitionTimingFunction = 'ease-out'
  }

  it('translates the content while expanding, then widens the track once, at the end', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    laidOut()
    await user.click(toggle())

    expect(animations).toHaveLength(1)
    const expand = animations[0]!
    expect(expand.target).toBe(content())
    expect(expand.keyframes).toEqual({ translate: ['0px', '160px'] })
    expect(expand.options).toMatchObject({
      duration: 400,
      easing: 'ease-out',
      fill: 'forwards'
    })
    expect(vertical()).toHaveAttribute('data-expanded')
    expect(vertical()).toHaveAttribute('data-motion', 'expand')

    act(() => expand.onfinish?.())
    expect(vertical()).not.toHaveAttribute('data-motion')
    expect(expand.cancel).toHaveBeenCalled()
  })

  it('narrows the track at once and slides the content in while collapsing', async () => {
    const user = userEvent.setup()
    render(<Expandable defaultExpanded />)
    await flushViewportMeasurement()
    laidOut()
    await user.click(toggle())

    expect(animations).toHaveLength(1)
    expect(animations[0]!.keyframes).toEqual({ translate: ['160px', '0px'] })
    expect(vertical()).not.toHaveAttribute('data-expanded')
    expect(vertical()).not.toHaveAttribute('data-motion')
  })

  it('mirrors the travel right to left', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    laidOut()
    vertical().style.direction = 'rtl'
    await user.click(toggle())
    expect(animations[0]!.keyframes).toEqual({ translate: ['0px', '-160px'] })
  })

  it('reverses from where an interrupted motion reached', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    laidOut()
    await user.click(toggle())
    content().style.translate = '40px'
    await user.click(toggle())

    expect(animations[0]!.cancel).toHaveBeenCalled()
    expect(animations[1]!.keyframes).toEqual({ translate: ['40px', '0px'] })
    expect(animations[1]!.options.duration).toBe(100)
    expect(vertical()).not.toHaveAttribute('data-motion')
  })

  it('changes the track without motion when motion is reduced', async () => {
    const user = userEvent.setup()
    render(<Expandable />)
    await flushViewportMeasurement()
    laidOut({ duration: '0s' })
    await user.click(toggle())
    expect(animations).toHaveLength(0)
    expect(vertical()).toHaveAttribute('data-expanded')
    expect(vertical()).not.toHaveAttribute('data-motion')
  })

  it('changes the track without motion while the vertical navigation is hidden', async () => {
    const { rerender } = render(<Expandable expanded={false} />)
    await flushViewportMeasurement()
    laidOut()
    vertical().style.display = 'none'
    rerender(<Expandable expanded />)
    expect(animations).toHaveLength(0)
    expect(vertical()).not.toHaveAttribute('data-motion')
  })

  it('plays nothing on mount or when the document is read', async () => {
    document.documentElement.setAttribute('data-navigator-expanded', '')
    try {
      render(<Expandable expandedFromDocument />)
      await flushViewportMeasurement()
      expect(vertical()).toHaveAttribute('data-expanded')
      expect(animations).toHaveLength(0)
    } finally {
      document.documentElement.removeAttribute('data-navigator-expanded')
    }
  })
})

describe('default brand', () => {
  const scope = `:where(${NAVIGATOR_EXPANDED_SCOPE})`
  const logoPart = '[data-slot="logo-wordmark"], [data-slot="logo-product"]'

  function BrandNav({
    brand = <Navigator.Brand />,
    expanded = false
  }: {
    brand?: ReactNode
    expanded?: boolean
  }) {
    return (
      <Navigator value='/a' expanded={expanded}>
        <Navigator.Primary aria-label='Main'>
          {brand}
          <Navigator.ExpandToggle />
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            Alpha
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
  }

  const brandLink = () =>
    region('brand').querySelector<HTMLElement>('[data-slot="navigator-brand"]')!

  it('renders the Oztix logo, linking home and named by it', async () => {
    render(<BrandNav />)
    await flushViewportMeasurement()
    const link = within(region('brand')).getByRole('link', { name: 'Oztix' })
    expect(link).toBe(brandLink())
    expect(link).toHaveAttribute('href', '/')
    expect(link.querySelectorAll('[data-slot="logo"]')).toHaveLength(1)
    expect(link.querySelector('[data-slot="logo-mark"]')).not.toBeNull()
  })

  it('shows only the mark collapsed and opens the wordmark expanded, without display: none', async () => {
    const { rerender } = render(<BrandNav />)
    await flushViewportMeasurement()
    const wordmark = () =>
      brandLink().querySelector<HTMLElement>('[data-slot="logo-wordmark"]')!
    expect(brandLink()).toHaveClass(
      '[&>[data-slot=logo]]:mx-[calc((3rem-1em)/2)]',
      '[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:grid-cols-[0fr]',
      '[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:opacity-0',
      'navigator-expanded:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:grid-cols-[1fr]',
      'navigator-expanded:[&_:is([data-slot=logo-wordmark],[data-slot=logo-product])]:opacity-100'
    )
    expect(wordmark().matches(scope)).toBe(false)
    rerender(<BrandNav expanded />)
    expect(wordmark().matches(scope)).toBe(true)
    expect(brandLink().className).not.toMatch(/logo[^\s]*:hidden/)
    expect(wordmark().className).not.toMatch(/(^|\s)hidden/)
  })

  it('keeps a wordmark-only Logo visible collapsed, shrunk to the mark’s column', async () => {
    const markless =
      '[data-slot=logo]:not(:has([data-slot=logo-mark])) [data-slot=logo-wordmark]'
    const { rerender } = render(
      <BrandNav
        brand={
          <Navigator.Brand>
            <Logo variant='wordmark' />
          </Navigator.Brand>
        }
      />
    )
    await flushViewportMeasurement()
    const wordmark = () =>
      brandLink().querySelector<HTMLElement>('[data-slot="logo-wordmark"]')!
    expect(wordmark().matches(markless)).toBe(true)
    expect(brandLink()).toHaveClass(
      `[&_${markless.replaceAll(' ', '_')}]:opacity-100`,
      `[&_${markless.replaceAll(' ', '_')}]:h-[min(1em,calc(3rem*42/128))]`,
      `navigator-expanded:[&_${markless.replaceAll(' ', '_')}]:h-[1em]`
    )
    rerender(<BrandNav />)
    expect(wordmark().matches(markless)).toBe(false)
  })

  it('fades the wordmark on the labels’ timing as the navigation’s width opens it', () => {
    const labelTransitions =
      navigatorItemLabelClass.match(/opacity_var\([^\]]+/g)!
    const brand = navigatorBrandClass
    expect(labelTransitions).toHaveLength(2)
    for (const opacity of labelTransitions) {
      expect(brand).toContain(
        `[transition:grid-template-columns_var(--navigator-primary-motion),${opacity}]`
      )
    }
    expect(navigatorPrimaryFrameClass).toContain(
      'motion-safe:[transition:width_var(--navigator-primary-motion)]'
    )
  })

  it('takes a product logo in its place', async () => {
    render(
      <BrandNav
        brand={
          <Navigator.Brand>
            <Logo product='Studio' />
          </Navigator.Brand>
        }
      />
    )
    await flushViewportMeasurement()
    const link = within(region('brand')).getByRole('link', {
      name: 'Oztix Studio'
    })
    expect(link.querySelectorAll('[data-slot="logo"]')).toHaveLength(1)
    expect(link.querySelector(logoPart)).toHaveAttribute(
      'data-slot',
      'logo-product'
    )
  })

  it('renders custom children instead of the logo', async () => {
    render(<BrandNav brand={<Navigator.Brand>Acme</Navigator.Brand>} />)
    await flushViewportMeasurement()
    const link = within(region('brand')).getByRole('link', { name: 'Acme' })
    expect(link.querySelector('[data-slot="logo"]')).toBeNull()
  })

  it('counts a childless Brand as the brand', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<BrandNav />)
    await flushViewportMeasurement()
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('has no Navigator.Brand')
    )
  })

  it('paints the wordmark open before hydration from the document attribute', () => {
    document.documentElement.setAttribute('data-navigator-expanded', '')
    const host = document.createElement('div')
    host.innerHTML = renderToString(
      <Navigator value='/a' expandedFromDocument>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Brand />
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            Alpha
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content />
      </Navigator>
    )
    document.body.append(host)
    try {
      const wordmark = host.querySelector('[data-slot="logo-wordmark"]')!
      expect(wordmark.matches(scope)).toBe(true)
    } finally {
      host.remove()
      document.documentElement.removeAttribute('data-navigator-expanded')
    }
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
    const row = document.querySelector<HTMLElement>(
      '[data-slot="navigator-panes"]'
    )!
    expect(content.className).not.toMatch(physicalInset)
    expect(row.className).not.toMatch(physicalInset)
    const css = renderPaneColumnsCss()
    expect(css).toContain('--pane-stack-inset-start: 0px;')
    expect(css).toContain('inset-inline-start: var(--pane-stack-inset-start')
    expect(css).toContain('padding-inline-start: 0')
    expect(css).not.toMatch(/(padding|margin)-(left|right)|[\s;{](left|right):/)
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

describe('items without an icon', () => {
  const tree = (
    <Navigator value='/settings'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/home' href='/home' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item value='/about' href='/about'>
          about us
        </Navigator.Item>
        <Navigator.Group>
          <Navigator.Item value='/settings' href='/settings'>
            Settings
          </Navigator.Item>
          <Navigator.Item value='/billing' href='/billing'>
            Billing
          </Navigator.Item>
        </Navigator.Group>
      </Navigator.Primary>
    </Navigator>
  )

  const tile = (name: string) => within(vertical()).getByRole('link', { name })

  it('shows the label’s initial on the tile, hidden from assistive tech', async () => {
    render(tree)
    await flushViewportMeasurement()
    const initial = tile('about us').querySelector(
      '[data-slot="navigator-item-initial"]'
    )
    expect(initial).toHaveTextContent('A')
    expect(initial).toHaveAttribute('aria-hidden', 'true')
    expect(initial).toHaveClass('navigator-expanded:opacity-0')
    expect(
      tile('about us').querySelector('[data-slot="navigator-item-icon"]')
    ).toBeNull()
    expect(
      tile('Home').querySelector('[data-slot="navigator-item-initial"]')
    ).toBeNull()
  })

  it('gives the label the icon column, unless a capsule sibling has an icon', async () => {
    render(tree)
    await flushViewportMeasurement()
    const label = (name: string) =>
      tile(name).querySelector('[data-slot="navigator-item-label"]')!
    expect(label('Home')).toHaveClass('col-start-2', 'ms-3')
    expect(label('Settings')).toHaveClass('col-start-1', 'col-span-2', 'ms-0')
    expect(label('Settings')).not.toHaveClass('col-start-2')
    expect(label('about us')).toHaveClass(
      'col-start-1',
      'group-has-[[data-slot=navigator-item-icon]]/capsule:col-start-2'
    )
    for (const capsule of vertical().querySelectorAll(
      '[data-slot="navigator-capsule"]'
    )) {
      expect(capsule).toHaveClass('group/capsule')
    }
  })

  it('shows the initial on the phone bar tab', async () => {
    render(tree)
    await flushViewportMeasurement()
    const tab = within(horizontal()).getByRole('link', { name: 'Billing' })
    expect(
      tab.querySelector('[data-slot="navigator-tab-initial"]')
    ).toHaveTextContent('B')
    expect(tab.querySelector('[data-slot="navigator-tab-icon"]')).toBeNull()
  })
})
