import { type ReactNode, use } from 'react'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { Pane } from '../Pane'
import { NavigatorContext } from './NavigatorContext'
import {
  FakeIcon,
  flushViewportMeasurement,
  primaryOf,
  testBrand
} from './testUtils'
import {
  navigatorContentVariants,
  navigatorIndicatorVariants,
  navigatorPrimaryClusterTrackVariants,
  navigatorPrimaryPinnedVariants,
  navigatorPrimaryTrackVariants
} from './variants'

describe('Navigator', () => {
  it('is the same reference as Navigator.Root', () => {
    expect(Navigator).toBe(Navigator.Root)
  })
})

describe('one primary navigation, two orientations', () => {
  it('renders navigator-primary vertically and horizontally', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const navs = Array.from(
      container.querySelectorAll('[data-slot="navigator-primary"]')
    )
    expect(navs.map((nav) => nav.getAttribute('data-orientation'))).toEqual([
      'vertical',
      'horizontal'
    ])
    expect(navs[0]).toHaveAccessibleName('Main')
    expect(navs[1]).toHaveAccessibleName('Main tabs')
  })
})

describe('pane stack', () => {
  const panes = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks the list as top when no deeper pane is current', async () => {
    render(
      <Navigator value='/components'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
  })

  it('moves the top to the detail pane when it becomes current', async () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'behind')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
  })

  it('leaves an inspector out of the stack entirely', async () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Pane role='inspector'>On this page</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'behind')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[2]).not.toHaveAttribute('data-stack-position')
  })

  // An inspector cannot hold the top, so a leading one must not consume the
  // slot — the lone real pane would be marked covered and the screen would go
  // blank below lg.
  it('keeps a real pane on top when an inspector is declared first', async () => {
    render(
      <Navigator value='/components'>
        <Navigator.Content>
          <Pane role='inspector'>On this page</Pane>
          <Pane role='list'>List</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(panes()[0]).not.toHaveAttribute('data-stack-position')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
  })

  // Every pane registers and stays mounted regardless of position — nothing
  // about a pane's parent element type changes as the stack moves, so there is
  // no remount to lose scroll position over.
  it('keeps a pane mounted when the top of the stack moves past it', async () => {
    const tree = (current: boolean) => (
      <Navigator value={current ? '/components/button' : '/components'}>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current={current}>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(tree(false))
    await flushViewportMeasurement()
    const before = panes()[0]

    rerender(tree(true))
    await flushViewportMeasurement()

    expect(panes()[0]).toBe(before)
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'behind')
  })

  // `positionOf` already nulls out an inspector via `derivePositions`. Chrome
  // and `primaryNav` must read the same "who is top" answer, not a second,
  // independent one — a raw `deriveTopIndex` fallback to index 0 would grant
  // an inspector-only stack live chrome even though no pane there qualifies.
  it('grants no live chrome or primaryNav to an inspector-only stack', async () => {
    render(
      <Navigator value='/foundations'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='inspector' primaryNav='hidden'>
            <Pane.Header>
              <Pane.Title>Inspector</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    // The tab bar reads the top pane's `primaryNav` off context; an
    // inspector's `hidden` declaration must not reach it since no pane there
    // is eligible to be top.
    expect(document.querySelector('[data-slot="pane"]')).toHaveAttribute(
      'data-primary-nav',
      'hidden'
    )
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-hidden', 'false')
  })

  // Regression guard: a mixed stack already resolved this correctly before
  // the fix (`deriveTopIndex` itself has always skipped an inspector) — this
  // pins that a single shared "who is top" answer keeps it that way.
  it('still never lets an inspector take chrome when real panes are present', async () => {
    const frames: ((time: number) => void)[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      frames.push(callback)
    )
    const scroll = async (viewport: HTMLElement) => {
      Object.defineProperty(viewport, 'scrollTop', {
        value: 80,
        writable: true
      })
      fireEvent.scroll(viewport)
      await act(async () => frames.splice(0).forEach((frame) => frame(0)))
    }
    const bar = () =>
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    render(
      <Navigator value='/foundations'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='inspector'>
            <Pane.Header>
              <Pane.Title>Inspector</Pane.Title>
            </Pane.Header>
          </Pane>
          <Pane role='list' current>
            <Pane.Header>
              <Pane.Title>List</Pane.Title>
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const [inspector, list] = document.querySelectorAll<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )
    await scroll(inspector!)
    expect(bar()).toHaveAttribute('data-collapsed', 'false')
    await scroll(list!)
    expect(bar()).toHaveAttribute('data-collapsed', 'true')
  })

  // jsdom has no layout; this pins the class the geometry depends on.
  it('clips its box below lg, where panes stack and can translate past it', async () => {
    render(
      <Navigator value='/components'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const content = document.querySelector('[data-slot="navigator-content"]')
    expect(content).toHaveClass('max-lg:overflow-hidden')
  })
})

describe('primaryNav', () => {
  // Captures rAF callbacks instead of scheduling them, so a burst can be
  // counted before anything runs and then flushed inside `act`.
  const captureFrames = () => {
    const frames: ((time: number) => void)[] = []
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => frames.push(callback))
    return {
      raf,
      flush: () => act(async () => frames.splice(0).forEach((f) => f(0)))
    }
  }

  // Restores the rAF spies even when an expectation throws mid-test — a leaked
  // mock would silently break every later test in the file.
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to auto', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(document.querySelector('[data-slot="pane"]')).toHaveAttribute(
      'data-primary-nav',
      'auto'
    )
  })

  it('hides the tab bar while a hidden pane is on top', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-hidden', 'true')
  })

  it('leaves the bar alone when the hidden pane is not on top', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-hidden', 'false')
  })

  it('drops the tab-bar clearance padding on a hidden pane', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector('[data-slot="pane-viewport"]')?.className
    ).not.toContain('max-md:pb-24')
  })

  it('keeps the tab-bar clearance padding on a visible pane', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current primaryNav='visible'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelector('[data-slot="pane-viewport"]')?.className
    ).toContain('max-md:pb-24')
  })

  it('takes a hidden tab bar out of the accessibility tree', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current primaryNav='hidden'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    expect(screen.queryByRole('navigation', { name: 'Main tabs' })).toBeNull()
    // Still in the DOM, so the return from the pushed screen can animate.
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('inert')
  })

  it('leaves a shown tab bar in the accessibility tree', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      screen.getByRole('navigation', { name: 'Main tabs' })
    ).toBeInTheDocument()
  })

  it('keeps the bar expanded while the top pane declares it visible', async () => {
    const { flush } = captureFrames()
    const { container } = render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current primaryNav='visible'>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    // The *top* pane is the one scrolled — the only pane whose scroll reaches
    // the bar at all. It declared `visible`, so scrolling it must not collapse.
    const top = document.querySelectorAll<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )[1]!
    Object.defineProperty(top, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(top)
    await flush()

    expect(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-collapsed', 'false')
  })

  it('ignores a scroll on a pane the stack has covered', async () => {
    const { flush } = captureFrames()
    const { container } = render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    const covered = document.querySelectorAll<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )[0]!
    Object.defineProperty(covered, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(covered)
    await flush()

    expect(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-collapsed', 'false')
  })

  it('cancels a pending frame when the pane unmounts', async () => {
    const { raf } = captureFrames()
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    const { unmount } = render(
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    raf.mockClear()
    fireEvent.scroll(viewport)
    const handle = raf.mock.results[0]?.value as number

    unmount()
    expect(cancel).toHaveBeenCalledWith(handle)
  })

  it('coalesces a burst of scroll events into one update', async () => {
    const frames: ((time: number) => void)[] = []
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => frames.push(callback))

    const { container } = render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )!
    Object.defineProperty(viewport, 'scrollTop', { value: 80, writable: true })
    raf.mockClear()
    frames.length = 0

    fireEvent.scroll(viewport)
    fireEvent.scroll(viewport)
    fireEvent.scroll(viewport)
    expect(raf).toHaveBeenCalledTimes(1)

    await act(async () => {
      frames.forEach((frame) => frame(0))
    })
    expect(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-collapsed', 'true')
  })
})

describe('Navigator vertical form', () => {
  it('marks the active destination with aria-current', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const closestItem = (label: string) =>
      screen.getAllByText(label)[0]?.closest('[data-slot="navigator-item"]')

    expect(closestItem('Tickets')).toHaveAttribute('aria-current', 'page')
    expect(closestItem('Discover')).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('renders both orientations so CSS can choose', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="vertical"]'
      )
    ).toBeTruthy()
    expect(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('routes an item with an href through an anchor', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets' href='/tickets'>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(screen.getAllByRole('link', { name: 'Tickets' })[0]).toHaveAttribute(
      'href',
      '/tickets'
    )
    await flushViewportMeasurement()
  })

  it('tints the current tile with the accent and leaves the inactive one subtle', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const verticalItem = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="navigator-item"]'))
        .find((el) =>
          el?.closest(
            '[data-slot="navigator-primary"][data-orientation="vertical"]'
          )
        )

    expect(verticalItem('Tickets')).toHaveClass('intent-accent', 'text-subtle')
    expect(verticalItem('Discover')).toHaveClass('text-subtle')
    expect(verticalItem('Discover')).not.toHaveClass('intent-accent')
    await flushViewportMeasurement()
  })
})

describe('destination visuals', () => {
  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  const tree = (value = '/a') => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
          A
        </Navigator.Item>
        <Navigator.Item value='/b' href='/b' icon={<FakeIcon />}>
          B
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
    </Navigator>
  )

  it('renders every destination icon duotone, size-6 on tiles and size-7 in the bar', async () => {
    render(tree())
    await flushViewportMeasurement()
    for (const [orientation, size] of [
      ['vertical', 'size-6'],
      ['horizontal', 'size-7']
    ] as const) {
      const icons = primaryOf(orientation).querySelectorAll(
        '[data-testid="fake-icon"]'
      )
      expect(icons).toHaveLength(3)
      for (const icon of icons) {
        expect(icon).toHaveAttribute('data-weight', 'duotone')
        expect(icon).toHaveClass(size)
      }
    }
  })

  it('colours the active destination through intent-accent, never a raw step', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const active = container.querySelectorAll(
      '[data-slot="navigator-item"][data-current]'
    )
    expect(active.length).toBe(2)
    for (const item of active) {
      expect(item).toHaveClass('intent-accent', 'text-subtle')
      expect(item.className).not.toMatch(/accent-\d+/)
    }
  })

  it('bounces the icon as a vertical tile becomes active', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const verticalIcon = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="vertical"] [data-current] [data-testid="fake-icon"]'
    )
    expect(verticalIcon).toHaveClass('animate-pop-tap')
  })

  it('keeps the tab bar icon-only, with the name inside the link', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const tab = within(horizontalOf(container)!).getByRole('link', {
      name: 'A'
    })
    expect(tab).not.toHaveAttribute('aria-label')
    expect(within(tab).getByText('A')).toHaveClass('sr-only')
  })

  it('renders section-pane rows duotone at size-5', async () => {
    render(
      <Navigator value='/c'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/c' href='/c'>
            C
            <Navigator.Secondary aria-label='C pages'>
              <Navigator.Item value='/c/x' href='/c/x' icon={<FakeIcon />}>
                X
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail'>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const icon = document.querySelector(
      '[data-slot="navigator-secondary-items"] [data-testid="fake-icon"]'
    )
    expect(icon).toHaveAttribute('data-weight', 'duotone')
    expect(icon).toHaveClass('size-5', 'text-subtle')
  })

  it('gives idle vertical tiles a hover surface, and the current tile none', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()
    const tile = (name: string) =>
      within(
        container.querySelector<HTMLElement>(
          '[data-slot="navigator-primary"][data-orientation="vertical"]'
        )!
      ).getByRole('link', { name })
    expect(tile('A')).toHaveAttribute('data-current')
    expect(tile('A')).not.toHaveClass('hover:bg-subtle')
    expect(tile('B')).toHaveClass('hover:bg-subtle')
  })
})

describe('Navigator routeless primary', () => {
  const verticalItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) =>
        el?.closest(
          '[data-slot="navigator-primary"][data-orientation="vertical"]'
        )
      )

  it('delegates to the first secondary child when it has no href of its own', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/layout'
                href='/foundations/layout'
              >
                Layout
              </Navigator.Item>
              <Navigator.Item
                value='/foundations/colors'
                href='/foundations/colors'
              >
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const section = verticalItem('Foundations')
    expect(section?.tagName).toBe('A')
    expect(section).toHaveAttribute('href', '/foundations/layout')
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })

  it('links to itself when it has its own href', async () => {
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='components' href='/components'>
            Components
            <Navigator.Secondary aria-label='Components pages'>
              <Navigator.Item
                value='/components/button'
                href='/components/button'
              >
                Button
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const section = verticalItem('Components')
    expect(section?.tagName).toBe('A')
    expect(section).toHaveAttribute('href', '/components')
    await flushViewportMeasurement()
  })

  it('renders a button when it has no href and no secondary', async () => {
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='appearance'>Appearance</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(verticalItem('Appearance')?.tagName).toBe('BUTTON')
    await flushViewportMeasurement()
  })

  it('lights the routeless section and marks its landing row in the section pane', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/foundations/layout'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/layout'
                href='/foundations/layout'
              >
                Layout
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const section = verticalItem('Foundations')
    expect(section).toHaveClass('intent-accent')
    expect(section).toHaveAttribute('aria-current', 'true')

    const pane = document.querySelector<HTMLElement>(
      '[data-navigator-section="foundations"]'
    )!
    expect(within(pane).getByRole('link', { name: 'Layout' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })
})

describe('Navigator.Brand', () => {
  it('renders in the brand region above the cluster without becoming a destination', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Brand>Roadie</Navigator.Brand>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const vertical = primaryOf('vertical')
    const region = vertical.querySelector(
      '[data-slot="navigator-primary-brand"]'
    )
    const brand = region?.querySelector('[data-slot="navigator-brand"]')
    expect(brand).toHaveTextContent('Roadie')
    expect(vertical.firstElementChild).toBe(region)
    expect(
      vertical.querySelector(
        '[data-slot="navigator-primary-cluster"] [data-slot="navigator-brand"]'
      )
    ).toBeNull()
  })

  it('leaves item and tab counts unchanged when a Brand is present', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Brand>Roadie</Navigator.Brand>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      ) as HTMLElement
    )
    expect(bar.getAllByRole('button')).toHaveLength(2)
    const vertical = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="vertical"]'
    )
    expect(
      vertical?.querySelectorAll('[data-slot="navigator-item"]')
    ).toHaveLength(2)
    await flushViewportMeasurement()
  })

  const brandTree = (brand: ReactNode) => (
    <Navigator value='tickets'>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        {brand}
        <Navigator.Item value='tickets'>Tickets</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
  const brandLink = (name: string) =>
    within(primaryOf('vertical')).getByRole('link', { name })

  it('links home by default, named by its text', async () => {
    render(brandTree(<Navigator.Brand>Roadie</Navigator.Brand>))
    await flushViewportMeasurement()
    const link = brandLink('Roadie')
    expect(link).toHaveAttribute('href', '/')
    expect(link).toHaveAttribute('data-slot', 'navigator-brand')
    expect(link).toHaveClass('is-interactive')
  })

  it('takes its name from a logo’s label', async () => {
    render(
      brandTree(
        <Navigator.Brand>
          <svg role='img' aria-label='Oztix' data-slot='logo' />
          <span aria-hidden data-slot='wordmark'>
            Oztix
          </span>
        </Navigator.Brand>
      )
    )
    await flushViewportMeasurement()
    expect(brandLink('Oztix')).toHaveAttribute('href', '/')
  })

  it('links wherever href points', async () => {
    render(brandTree(<Navigator.Brand href='/home'>Roadie</Navigator.Brand>))
    await flushViewportMeasurement()
    expect(brandLink('Roadie')).toHaveAttribute('href', '/home')
  })

  it('routes through RoadieLinkProvider', async () => {
    const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
      <a data-testid='stub-link' href={href} {...rest}>
        {children}
      </a>
    )
    render(
      <RoadieLinkProvider Link={StubLink}>
        {brandTree(<Navigator.Brand>Roadie</Navigator.Brand>)}
      </RoadieLinkProvider>
    )
    await flushViewportMeasurement()
    expect(brandLink('Roadie')).toHaveAttribute('data-testid', 'stub-link')
  })

  it('does not warn about a stray child', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Brand>Roadie</Navigator.Brand>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
    await flushViewportMeasurement()
  })
})

describe('Navigator active-state split', () => {
  const verticalItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) =>
        el?.closest(
          '[data-slot="navigator-primary"][data-orientation="vertical"]'
        )
      )

  const sectionTree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('tints the branch-active section like the current page but never claims the page', async () => {
    render(sectionTree('button'))
    const section = verticalItem('Components')
    expect(section).toHaveClass('intent-accent')
    expect(section).toHaveAttribute('aria-current', 'true')
    await flushViewportMeasurement()
  })
})

describe('overflow state', () => {
  it('publishes the folded items and the open flag on context', async () => {
    const seen: { open: boolean; horizontal: number; vertical: number }[] = []
    function Probe() {
      const { overflowOpen, overflowItems } = use(NavigatorContext)
      seen.push({
        open: overflowOpen,
        horizontal: overflowItems.horizontal.length,
        vertical: overflowItems.vertical.length
      })
      return null
    }
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((value) => (
            <Navigator.Item key={value} value={value} href={value}>
              {value}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Probe />
      </Navigator>
    )
    await flushViewportMeasurement()

    const last = seen.at(-1)!
    expect(last.open).toBe(false)
    // Six items, four tabs kept, two folded.
    expect(last.horizontal).toBe(2)
    expect(last.vertical).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(seen.at(-1)!.open).toBe(true)
  })
})

describe('Navigator mobile tab bar', () => {
  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  const sixItemsAndPinned = (
    <Navigator value='events'>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='a'>A</Navigator.Item>
        <Navigator.Item value='b'>B</Navigator.Item>
        <Navigator.Item value='c'>C</Navigator.Item>
        <Navigator.Item value='d'>D</Navigator.Item>
        <Navigator.Item value='e'>E</Navigator.Item>
        <Navigator.Item value='f'>F</Navigator.Item>
        <Navigator.Item value='account' placement='pinned'>
          Account
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('names the horizontal navigation distinctly from the vertical', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeTruthy()
    expect(
      screen.getByRole('navigation', { name: 'Primary tabs' })
    ).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('floats the tab bar over full-height content on mobile only', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = horizontalOf(container)
    expect(bar).toHaveClass('max-md:absolute')
    expect(bar).toHaveClass('md:hidden')
    await flushViewportMeasurement()
  })

  it('renders one tab per declared item when nothing folds', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.getAllByRole('button')).toHaveLength(2)
    expect(bar.getByText('Discover')).toBeTruthy()
    expect(bar.getByText('Tickets')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('marks the active tab with aria-current', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.getByRole('button', { name: 'Tickets' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(bar.getByRole('button', { name: 'Discover' })).not.toHaveAttribute(
      'aria-current'
    )
    await flushViewportMeasurement()
  })

  // The tab is the section, not the page — the pane's list row is the page,
  // and two elements announcing "current page" is one too many.
  it('marks a tab active through a sub-page as the current section', async () => {
    const { container } = render(
      <Navigator value='/foundations/layout'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='/discover' href='/discover'>
            Discover
          </Navigator.Item>
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.getByRole('link', { name: 'Foundations' })).toHaveAttribute(
      'aria-current',
      'true'
    )
    await flushViewportMeasurement()
  })

  it('folds the tail into a final More tab', async () => {
    const { container } = render(sixItemsAndPinned)
    const track = horizontalOf(container)!.querySelector<HTMLElement>(
      '[data-slot="navigator-primary-track"]'
    )!
    const bar = within(track)
    expect(bar.getAllByRole('button')).toHaveLength(4)
    expect(bar.queryByText('D')).toBeNull()
    expect(bar.getByRole('button', { name: 'More' })).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('gives the generated More tab an icon like every other tab', async () => {
    const { container } = render(sixItemsAndPinned)
    const bar = within(horizontalOf(container) as HTMLElement)
    const more = bar.getByRole('button', { name: 'More' })
    expect(more.querySelector('svg')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('omits the final tab when there is nothing to put in it', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.queryByRole('button', { name: 'More' })).toBeNull()
    expect(bar.getAllByRole('button')).toHaveLength(2)
    await flushViewportMeasurement()
  })

  it('routes a tab with an href through an anchor', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets' href='/tickets'>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.getByRole('link', { name: 'Tickets' })).toHaveAttribute(
      'href',
      '/tickets'
    )
    await flushViewportMeasurement()
  })

  it('marks the disclosure current without claiming it is the page', async () => {
    const { container } = render(
      <Navigator value='e'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
          <Navigator.Item value='account' placement='pinned'>
            Account
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    expect(bar.getByRole('button', { name: 'More' })).toHaveAttribute(
      'aria-current',
      'true'
    )
    await flushViewportMeasurement()
  })

  it('hands currency to the open disclosure and reclaims it on close', async () => {
    const { container } = render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(horizontalOf(container) as HTMLElement)
    const routeTab = bar.getByRole('button', { name: 'A' })
    const disclosure = bar.getByRole('button', { name: 'More' })

    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(disclosure).not.toHaveAttribute('aria-current')

    // Opening the pane selects the disclosure so exactly one tab reads active.
    await userEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-current', 'true')
    expect(routeTab).not.toHaveAttribute('aria-current')

    await userEvent.click(disclosure)
    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(disclosure).not.toHaveAttribute('aria-current')
  })

  it('with the overflow open, exactly one tab bar element carries aria-current', async () => {
    const { container } = render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = horizontalOf(container) as HTMLElement
    const disclosure = within(bar).getByRole('button', { name: 'More' })

    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(disclosure)
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(disclosure)
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('floats the first pinned item in a circle outside the tabs', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d'].map((v) => (
            <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item
            value='/me'
            href='/me'
            icon={<FakeIcon />}
            placement='pinned'
          >
            Me
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = horizontalOf(container)!
    const track = bar.querySelector('[data-slot="navigator-primary-track"]')!
    expect(within(track as HTMLElement).queryByText('Me')).toBeNull()
    expect(within(track as HTMLElement).queryByText('More')).toBeNull()
    const circle = bar.querySelector('[data-slot="navigator-primary-circle"]')!
    expect(
      within(circle as HTMLElement).getByRole('link', { name: 'Me' })
    ).toBeInTheDocument()
  })

  it('sets the pinned circle apart from the tabs by a gap', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            A
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
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = horizontalOf(container)!
    const parts = [...bar.children].map((child) =>
      child.getAttribute('data-slot')
    )
    expect(parts).toEqual([
      'navigator-primary-lane',
      'navigator-primary-circle'
    ])
    expect(bar).toHaveClass('grid-cols-[minmax(0,1fr)_auto]', 'gap-3')
    expect(bar.style.getPropertyValue('--navigator-primary-slots')).toBe('4')
  })

  it('gives the tabs the whole bar, with no gap, without a pinned item', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a' icon={<FakeIcon />}>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = horizontalOf(container)!
    expect(bar.children).toHaveLength(1)
    expect(bar.firstElementChild).toHaveAttribute(
      'data-slot',
      'navigator-primary-lane'
    )
    expect(bar).not.toHaveClass('gap-3')
    expect(bar.className).not.toMatch(/grid-cols-/)
    expect(bar.style.getPropertyValue('--navigator-primary-slots')).toBe('5')
  })

  it('renders pinned items at the bottom of the vertical navigation', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/me' href='/me' placement='pinned'>
            Me
          </Navigator.Item>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const vertical = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="vertical"]'
    )!
    const pinned = vertical.querySelector(
      '[data-slot="navigator-primary-pinned"]'
    )!
    expect(within(pinned as HTMLElement).getByText('Me')).toBeInTheDocument()
    expect(within(pinned as HTMLElement).queryByText('A')).toBeNull()
    warn.mockRestore()
  })
})

describe('Navigator.OverflowPane', () => {
  const overflowNav = (value: string, extra?: ReactNode) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
          <Navigator.Item key={v} value={v} href={v}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
        {extra}
      </Navigator.Content>
    </Navigator>
  )

  const panes = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  it('is a list pane that leads the columns from lg', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = document.querySelector('[data-slot="pane"][id]')!
    expect(more).toHaveClass('lg:-order-1')
    expect(more).not.toHaveClass('md:hidden')
  })

  it('hides from lg while closed, so one list pane shows at a time', async () => {
    const user = userEvent.setup()
    const { container } = render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = document.querySelector('[data-slot="pane"][id]')!
    expect(more).toHaveClass('lg:hidden')
    await user.click(
      within(horizontalOf(container)!).getByRole('button', { name: 'More' })
    )
    expect(more).not.toHaveClass('lg:hidden')
  })

  it('titles the generated pane in its header, like a section pane', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    expect(within(more).getByRole('heading', { name: 'More' })).toHaveAttribute(
      'data-slot',
      'pane-title'
    )
  })

  it('moves focus to the More pane title on open, and back on Escape', async () => {
    const user = userEvent.setup()
    const { container } = render(overflowNav('/a'))
    await flushViewportMeasurement()
    const more = within(horizontalOf(container)!).getByRole('button', {
      name: 'More'
    })
    await user.click(more)
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    expect(within(pane).getByRole('heading', { name: 'More' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(more).toHaveFocus()
  })

  it('focuses the More pane only once it is the top of the stack', async () => {
    const user = userEvent.setup()
    const { container } = render(overflowNav('/a'))
    await flushViewportMeasurement()
    const pane = document.querySelector('[data-slot="pane"][id]') as HTMLElement
    const positionsAtFocus: (string | null)[] = []
    pane.addEventListener('focusin', () =>
      positionsAtFocus.push(pane.getAttribute('data-stack-position'))
    )
    await user.click(
      within(horizontalOf(container)!).getByRole('button', { name: 'More' })
    )
    expect(positionsAtFocus).toEqual(['top'])
  })

  it('focuses a declared OverflowPane with no title itself', async () => {
    const user = userEvent.setup()
    const { container } = render(
      overflowNav(
        '/a',
        <Navigator.OverflowPane aria-label='More'>
          <Navigator.OverflowItems />
        </Navigator.OverflowPane>
      )
    )
    await flushViewportMeasurement()
    await user.click(
      within(horizontalOf(container)!).getByRole('button', { name: 'More' })
    )
    expect(document.querySelector('[data-slot="pane"][id]')).toHaveFocus()
  })

  it("renders the bar's folded rows below md only", async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const lists = document.querySelectorAll(
      '[data-slot="pane"][id] [data-slot="navigator-overflow-items"]'
    )
    expect(lists[0]).toHaveClass('md:hidden')
  })

  it('renders a generated overflow pane when none is declared', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    // Two panes: the detail on top, and the generated overflow queued after it.
    expect(panes()).toHaveLength(2)
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
  })

  it('takes the top of the stack when opened', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
    expect(panes()[0]).toHaveAttribute('data-stack-position', 'behind')
  })

  it('keeps the primary nav visible while it is top', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-primary-nav', 'visible')
  })

  it('titles the generated overflow like any other pane', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    expect(
      within(panes()[1] as HTMLElement).getByRole('heading', { name: 'More' })
    ).toBeTruthy()
  })

  const groupedOverflowNav = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Group>
          <Navigator.GroupTitle>Settings</Navigator.GroupTitle>
          <Navigator.Item value='/e' href='/e'>
            /e
          </Navigator.Item>
          <Navigator.Item value='/f' href='/f'>
            /f
          </Navigator.Item>
        </Navigator.Group>
        <Navigator.Item value='/account' placement='pinned' href='/account'>
          Account
        </Navigator.Item>
        <Navigator.Item value='/help' placement='pinned' href='/help'>
          Help
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('keeps a folded group as a titled section of the overflow', async () => {
    render(groupedOverflowNav('/a'))
    await flushViewportMeasurement()
    const overflow = within(panes()[1] as HTMLElement)
    const settings = within(overflow.getByRole('list', { name: 'Settings' }))
    expect(settings.getByRole('link', { name: '/e' })).toBeTruthy()
    expect(settings.getByRole('link', { name: '/f' })).toBeTruthy()
    expect(settings.queryByRole('link', { name: 'Help' })).toBeNull()
    expect(overflow.getByRole('link', { name: 'Help' })).toBeTruthy()
    expect(overflow.queryByRole('link', { name: 'Account' })).toBeNull()
  })

  it('marks an overflow row active through a sub-page as the current section', async () => {
    render(groupedOverflowNav('/e/deep'))
    await flushViewportMeasurement()
    const overflow = within(panes()[1] as HTMLElement)
    expect(overflow.getByRole('link', { name: '/e' })).toHaveAttribute(
      'aria-current',
      'true'
    )
  })

  it('lists the folded items, and selecting one closes it', async () => {
    const onValueChange = vi.fn()
    render(
      <Navigator value='/a' onValueChange={onValueChange}>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    const row = within(overflow as HTMLElement).getByRole('link', {
      name: '/e'
    })
    await userEvent.click(row)
    expect(onValueChange).toHaveBeenCalledWith('/e')
    expect(document.querySelectorAll('[data-slot="pane"]')[1]).toHaveAttribute(
      'data-stack-position',
      'ahead'
    )
  })

  it('renders consumer content around the generated list', async () => {
    render(
      overflowNav(
        '/a',
        <Navigator.OverflowPane>
          <Pane.Header>
            <Pane.Title>Menu</Pane.Title>
          </Pane.Header>
          <p>Promo</p>
          <Navigator.OverflowItems />
        </Navigator.OverflowPane>
      )
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    expect(
      within(overflow as HTMLElement).getByText('Promo')
    ).toBeInTheDocument()
    expect(
      within(overflow as HTMLElement).getByRole('link', { name: '/e' })
    ).toBeInTheDocument()
    // Declared, so no second generated pane.
    expect(document.querySelectorAll('[data-slot="pane"]')).toHaveLength(2)
  })

  // Stands in for a Next.js parallel-route slot node, which a children scan can't see through.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  it('recognises a Navigator.OverflowPane declared behind a wrapper', async () => {
    render(
      overflowNav(
        '/a',
        <Slot>
          <Navigator.OverflowPane>
            <p>Promo</p>
            <Navigator.OverflowItems />
          </Navigator.OverflowPane>
        </Slot>
      )
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    // Settled state: exactly one overflow pane, and it's the wrapped one
    // (it has the consumer's promo content) — not a second, generated pane
    // sharing its DOM id.
    expect(document.querySelectorAll('[data-slot="pane"]')).toHaveLength(2)
    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    expect(
      within(overflow as HTMLElement).getByText('Promo')
    ).toBeInTheDocument()

    const disclosure = screen.getByRole('button', { name: /More/ })
    const controlsId = disclosure.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.querySelectorAll(`[id="${controlsId}"]`)).toHaveLength(1)
  })

  it('warns when items fold with no Navigator.Content to host them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('Navigator.Content'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('gives a folded destination aria-current=page, matching both orientations', async () => {
    render(overflowNav('/e'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    const row = within(overflow as HTMLElement).getByRole('link', {
      name: '/e'
    })
    expect(row).toHaveAttribute('aria-current', 'page')
  })

  it('warns in dev when two Navigator.OverflowPane are declared, sharing one DOM id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      overflowNav(
        '/a',
        <>
          <Navigator.OverflowPane>
            <Navigator.OverflowItems />
          </Navigator.OverflowPane>
          <Navigator.OverflowPane>
            <Navigator.OverflowItems />
          </Navigator.OverflowPane>
        </>
      )
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) =>
        String(c[0]).includes('Navigator.OverflowPane')
      )
    ).toBe(true)
    warn.mockRestore()
  })

  it('lists folded items and extra pinned items together, excluding kept tabs', async () => {
    render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
          <Navigator.Item value='account' placement='pinned'>
            Account
          </Navigator.Item>
          <Navigator.Item value='help' placement='pinned'>
            Help
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: 'More' }))

    const overflow = within(panes()[1] as HTMLElement)
    expect(overflow.getByText('E')).toBeTruthy()
    expect(overflow.getByText('F')).toBeTruthy()
    expect(overflow.getByText('Help')).toBeTruthy()
    expect(overflow.queryByText('Account')).toBeNull()
    expect(overflow.queryByText('A')).toBeNull()
  })

  it('generates no overflow pane when nothing folds', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    // Just the declared detail pane — no fallback overflow pane generated.
    expect(panes()).toHaveLength(1)
  })

  it("points the disclosure's aria-controls at a real, resolvable overflow pane id", async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const disclosure = screen.getByRole('button', { name: /More/ })

    expect(disclosure).not.toHaveAttribute('aria-controls')
    await userEvent.click(disclosure)
    const controlsId = disclosure.getAttribute('aria-controls')
    expect(controlsId).toBeTruthy()
    expect(document.getElementById(controlsId!)).toBe(panes()[1])
  })

  it('dismisses the open pane when another tab is tapped', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    const tabBar = within(screen.getByRole('navigation', { name: 'Main tabs' }))
    await userEvent.click(tabBar.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')

    await userEvent.click(tabBar.getByRole('link', { name: '/b' }))
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
    expect(tabBar.getByRole('button', { name: /More/ })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('dismisses the open pane on Escape', async () => {
    render(overflowNav('/a'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')

    await userEvent.keyboard('{Escape}')
    expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
  })

  describe('switches without sliding', () => {
    const frames: ((time: number) => void)[] = []
    const flushFrame = () =>
      act(() => {
        for (const callback of frames.splice(0)) callback(0)
      })
    const content = () =>
      document.querySelector<HTMLElement>('[data-slot="navigator-content"]')!

    beforeEach(() => {
      frames.length = 0
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
        frames.push(callback)
      )
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('holds pane transitions off for two frames as More opens and closes from the bar', async () => {
      render(overflowNav('/a'))
      await flushViewportMeasurement()
      expect(content()).not.toHaveAttribute('data-instant')
      const tabBar = within(
        screen.getByRole('navigation', { name: 'Main tabs' })
      )
      fireEvent.click(tabBar.getByRole('button', { name: /More/ }))
      expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
      expect(content()).toHaveAttribute('data-instant')
      flushFrame()
      expect(content()).toHaveAttribute('data-instant')
      flushFrame()
      expect(content()).not.toHaveAttribute('data-instant')

      fireEvent.click(tabBar.getByRole('button', { name: /More/ }))
      expect(panes()[1]).toHaveAttribute('data-stack-position', 'ahead')
      expect(content()).toHaveAttribute('data-instant')
      flushFrame()
      flushFrame()
      expect(content()).not.toHaveAttribute('data-instant')
    })

    it('keeps the slide for a push within the stack', async () => {
      const tree = (current: boolean) => (
        <Navigator value='/a'>
          <Navigator.Content>
            <Pane role='list'>List</Pane>
            <Pane role='detail' current={current}>
              Detail
            </Pane>
          </Navigator.Content>
        </Navigator>
      )
      const { rerender } = render(tree(false))
      await flushViewportMeasurement()
      rerender(tree(true))
      expect(panes()[1]).toHaveAttribute('data-stack-position', 'top')
      expect(content()).not.toHaveAttribute('data-instant')
    })

    it('turns off every pane transition while set', () => {
      expect(navigatorContentVariants().split(' ')).toContain(
        'data-instant:[&_[data-slot=pane]]:transition-none'
      )
    })
  })

  // Retired, not restored: the pinned outside-click dismissal assumed a
  // floating popup with an "outside" to click. A full-screen pane has none —
  // Escape (above) is the only dismissal left.
})

describe('Navigator sliding indicator', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='discover'>Discover</Navigator.Item>
        <Navigator.Item value='tickets'>Tickets</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders a decorative indicator in the tab bar', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="horizontal"] [data-slot="navigator-indicator"]'
    )

    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
    await flushViewportMeasurement()
  })

  it('keeps the indicator out of the accessibility tree', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-indicator"]'
    )!

    expect(indicator.tagName).toBe('SPAN')
    expect(indicator).not.toHaveAttribute('aria-current')
    expect(indicator).not.toHaveAttribute('data-slot', 'navigator-item')
    await flushViewportMeasurement()
  })

  it('carries the tab bar active surface on the indicator, not the tab', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="horizontal"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator.className).toContain('bg-[var(--intent-bg-subtle)]')
    await flushViewportMeasurement()
  })

  // jsdom reports zero rects, so the indicator can never measure a real box.
  it('stays unready and unsettled while nothing can be measured', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="horizontal"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator).toHaveAttribute('data-ready', 'false')
    expect(indicator).toHaveAttribute('data-settled', 'false')
    expect(indicator.className).toContain('opacity-0')
    await flushViewportMeasurement()
  })

  it('renders a sliding indicator in the vertical navigation', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-primary"][data-orientation="vertical"] [data-slot="navigator-indicator"]'
    )

    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
    expect(indicator?.className).toContain('bg-[var(--intent-bg-subtle)]')
    await flushViewportMeasurement()
  })

  const transitionClasses = (classes: string) =>
    classes.split(' ').filter((name) => /(^|:)\[?transition/.test(name))

  it.each(['vertical', 'horizontal'] as const)(
    'transitions the %s pill on translate/opacity only, never left/top/width/height',
    (surface) => {
      const classes = navigatorIndicatorVariants({ surface, visible: true })
      expect(transitionClasses(classes)).toEqual([
        'motion-safe:transition-opacity',
        'motion-safe:data-[settled=true]:[transition-property:opacity,translate]',
        'motion-reduce:transition-none'
      ])
      expect(classes).toContain('intent-accent')
    }
  )

  // The first box after none must not slide: it appears in place and fades in.
  it('gates the translate transition on data-settled, not data-ready', () => {
    const classes = navigatorIndicatorVariants({
      surface: 'vertical',
      visible: true
    })
    const translating = transitionClasses(classes).filter((name) =>
      name.includes('translate')
    )
    expect(translating).toEqual([
      'motion-safe:data-[settled=true]:[transition-property:opacity,translate]'
    ])
  })
})

describe('Navigator.Secondary', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='events' href='/events'>
          Events
          <Navigator.Secondary
            aria-label='Events sections'
            className='custom-secondary'
          >
            <Navigator.Item value='all'>All events</Navigator.Item>
            <Navigator.Item value='drafts'>Drafts</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='insights'>Insights</Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const sectionPane = () =>
    document.querySelector<HTMLElement>('[data-navigator-section]')

  it('renders its children in the section pane when its parent item is active', async () => {
    render(tree('events'))
    await flushViewportMeasurement()
    expect(
      within(
        within(sectionPane()!).getByRole('navigation', {
          name: 'Events sections'
        })
      )
        .getAllByRole('button')
        .map((el) => el.textContent)
    ).toEqual(['All events', 'Drafts'])
  })

  it('renders nothing when its parent item is not active', async () => {
    render(tree('insights'))
    await flushViewportMeasurement()
    expect(screen.queryByText('All events')).toBeNull()
  })

  it('is a labelled navigation landmark', async () => {
    render(tree('events'))
    await flushViewportMeasurement()
    expect(
      screen.getByRole('navigation', { name: 'Events sections' })
    ).toBeInTheDocument()
  })

  it('forwards className to the section navigation', async () => {
    render(tree('events'))
    await flushViewportMeasurement()
    expect(
      screen.getByRole('navigation', { name: 'Events sections' })
    ).toHaveClass('custom-secondary')
  })

  it('marks the active secondary destination with aria-current', async () => {
    render(tree('drafts'))
    await flushViewportMeasurement()
    const sectionNav = within(
      screen.getByRole('navigation', { name: 'Events sections' })
    )
    expect(sectionNav.getByRole('button', { name: 'Drafts' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(
      sectionNav.getByRole('button', { name: 'All events' })
    ).not.toHaveAttribute('aria-current')
  })

  it('selects a sub-page through onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <Navigator value='all' onValueChange={onValueChange}>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
              <Navigator.Item value='drafts'>Drafts</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    await user.click(
      within(sectionPane()!).getByRole('button', { name: 'Drafts' })
    )
    expect(onValueChange).toHaveBeenCalledWith('drafts')
  })

  const groupedTree = (
    <Navigator value='/components/button'>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components'>
            <Navigator.Group>
              <Navigator.GroupTitle>Actions</Navigator.GroupTitle>
              <Navigator.Item
                value='/components/button'
                href='/components/button'
              >
                Button
              </Navigator.Item>
            </Navigator.Group>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('finds items nested inside a group when collecting descendants', async () => {
    render(groupedTree)
    await flushViewportMeasurement()
    // The section is branch-active only if the walk saw the grouped child.
    expect(
      within(primaryOf('vertical')).getByRole('link', { name: 'Components' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      within(sectionPane()!).getByRole('link', { name: 'Button' })
    ).toHaveAttribute('aria-current', 'page')
  })

  it('renders a group label in the section pane', async () => {
    render(groupedTree)
    await flushViewportMeasurement()
    expect(within(sectionPane()!).getByText('Actions')).toBeVisible()
  })
})

describe('vertical list semantics', () => {
  it('wraps loose primary items in a list', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            B
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const vertical = document.querySelector(
      '[data-slot="navigator-primary"][data-orientation="vertical"]'
    )!
    const list = vertical.querySelector('[data-slot="navigator-capsule"]')!
    expect(list.tagName).toBe('UL')
    expect(list.children).toHaveLength(2)
    expect(Array.from(list.children).every((li) => li.tagName === 'LI')).toBe(
      true
    )
  })
})

describe('Navigator.Group', () => {
  const groupTree = (title: ReactNode = 'Formats') => (
    <Navigator value='/events/live'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Group>
          <Navigator.GroupTitle>{title}</Navigator.GroupTitle>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Live formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Group>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('renders a titled group without a key warning', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(groupTree())
    await flushViewportMeasurement()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('associates its list with its title in the vertical navigation', async () => {
    render(groupTree())
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats', level: 2 })
    const list = document.querySelector('[data-slot="navigator-capsule"]')
    expect(list).not.toBeNull()
    expect(list).toHaveAttribute('aria-labelledby', title.id)
    expect(title.id).not.toBe('')
  })

  it('renders the title and the list as siblings, not nested', async () => {
    render(groupTree())
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats' })
    const list = document.querySelector('[data-slot="navigator-capsule"]')
    expect(list?.contains(title)).toBe(false)
    expect(title.nextElementSibling).toBe(list)
  })

  it('honours render on the title', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Group>
            <Navigator.GroupTitle render={(p) => <h3 {...p} />}>
              Formats
            </Navigator.GroupTitle>
            <Navigator.Item value='/events' href='/events'>
              Events
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      screen.getByRole('heading', { name: 'Formats', level: 3 })
    ).toBeInTheDocument()
  })
})

describe('Navigator.Primary group descent', () => {
  it('includes an item inside a Navigator.Group in the tab bar', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Group>
            <Navigator.GroupTitle>Section</Navigator.GroupTitle>
            <Navigator.Item value='/a' href='/a'>
              A
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const tabBar = document.querySelector(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    ) as HTMLElement
    expect(within(tabBar).getByRole('link', { name: 'A' })).toBeInTheDocument()
  })

  it('lifts the active secondary of an item inside a Navigator.Group', async () => {
    render(
      <Navigator value='/a/sub'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Group>
            <Navigator.GroupTitle>Section</Navigator.GroupTitle>
            <Navigator.Item value='/a' href='/a'>
              A
              <Navigator.Secondary aria-label='A sections'>
                <Navigator.Item value='/a/sub' href='/a/sub'>
                  Sub
                </Navigator.Item>
              </Navigator.Secondary>
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const pane = document.querySelector<HTMLElement>(
      '[data-navigator-section="/a"]'
    )!
    expect(within(pane).getByRole('link', { name: 'Sub' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })
})

describe('Navigator.Menu + Navigator.Secondary precedence', () => {
  const verticalOf = (container: HTMLElement) =>
    within(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="vertical"]'
      ) as HTMLElement
    )
  const horizontalOf = (container: HTMLElement) =>
    within(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      ) as HTMLElement
    )

  const withBoth = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/a'>
          A
          <Navigator.Secondary aria-label='A sections'>
            <Navigator.Item value='/a/sub' href='/a/sub'>
              Sub
            </Navigator.Item>
          </Navigator.Secondary>
          <Navigator.Menu aria-label='Menu'>
            <Navigator.MenuItem>Menu</Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('renders as a section, not a menu, when both are declared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(withBoth('/a'))
    await flushViewportMeasurement()
    // A routeless section links to its first sub-page, so no menu took over the row.
    const row = verticalOf(container).getByRole('link', { name: 'A' })
    expect(row).toHaveAttribute('href', '/a/sub')
    expect(row).not.toHaveAttribute('aria-haspopup')
    expect(verticalOf(container).queryByText('Menu')).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })

  it('keeps the declared sub-pages reachable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(withBoth('/a/sub'))
    await flushViewportMeasurement()
    expect(
      within(
        document.querySelector<HTMLElement>('[data-navigator-section="/a"]')!
      ).getByRole('link', { name: 'Sub' })
    ).toBeInTheDocument()
    expect(
      horizontalOf(container).getByRole('link', { name: 'A' })
    ).toHaveAttribute('href', '/a/sub')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('its own route'))
    warn.mockRestore()
  })

  it('warns once, naming the item, that the Menu is ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(withBoth('/a'))
    await flushViewportMeasurement()
    const menuWarnings = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((message) => message.includes('The Menu is ignored'))
    expect(menuWarnings).toHaveLength(1)
    expect(menuWarnings[0]).toContain("value='/a'")
    warn.mockRestore()
  })
})

describe('Navigator descendant-aware active matching', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='foundations' href='/foundations'>
          Foundations
          <Navigator.Secondary aria-label='Foundations pages'>
            <Navigator.Item value='layout'>Layout</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const verticalItem = (label: string) =>
    within(primaryOf('vertical'))
      .getByText(label)
      .closest('[data-slot="navigator-item"]')
  const sectionRow = (label: string) =>
    within(
      document.querySelector<HTMLElement>('[data-navigator-section]')!
    ).getByRole('button', { name: label })

  it('marks a section branch-active when a Secondary descendant is current', async () => {
    render(tree('button'))
    await flushViewportMeasurement()
    expect(verticalItem('Components')).toHaveClass('intent-accent')
    expect(verticalItem('Foundations')).not.toHaveClass('intent-accent')
    expect(
      screen.getByRole('navigation', { name: 'Components pages' })
    ).toBeInTheDocument()
  })

  it('keeps a section reading current on a sub-route no Secondary declares', async () => {
    render(tree('components/settings'))
    await flushViewportMeasurement()
    const section = verticalItem('Components')
    // `data-current` is what the sliding pill measures.
    expect(section).toHaveAttribute('data-current')
    expect(section).toHaveAttribute('aria-current', 'true')
  })

  it('keeps the pill on the section while a sub-page is current', async () => {
    render(tree('button'))
    await flushViewportMeasurement()
    expect(verticalItem('Components')).toHaveAttribute('data-current')
    expect(verticalItem('Foundations')).not.toHaveAttribute('data-current')
  })

  it('gives aria-current=page to the exact descendant, not the branch section', async () => {
    render(tree('button'))
    await flushViewportMeasurement()
    expect(sectionRow('Button')).toHaveAttribute('aria-current', 'page')
    expect(verticalItem('Components')).toHaveAttribute('aria-current', 'true')
  })

  it('marks the section mobile tab active when a descendant is current', async () => {
    render(tree('button'))
    await flushViewportMeasurement()
    const bar = within(primaryOf('horizontal'))
    expect(bar.getByRole('link', { name: 'Components' })).toHaveClass(
      'intent-accent'
    )
    expect(bar.getByRole('link', { name: 'Foundations' })).not.toHaveClass(
      'intent-accent'
    )
  })

  it('leaves a sibling section whose subtree lacks the active value inactive', async () => {
    render(tree('button'))
    await flushViewportMeasurement()
    expect(verticalItem('Foundations')).not.toHaveAttribute('aria-current')
    expect(
      screen.queryByRole('navigation', { name: 'Foundations pages' })
    ).toBeNull()
    expect(screen.queryByText('Layout')).toBeNull()
  })
})

describe('Navigator route-prefix section matching', () => {
  const paneSectionTree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='list'>List</Pane>
        <Pane role='detail' current>
          Doc
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const verticalItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) =>
        el?.closest(
          '[data-slot="navigator-primary"][data-orientation="vertical"]'
        )
      )

  it('keeps an undeclared sub-route branch-active on its section', async () => {
    render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()

    expect(verticalItem('Components')).toHaveClass('intent-accent')
    expect(verticalItem('Tokens')).not.toHaveClass('intent-accent')
  })

  it('marks the section tab active on an undeclared sub-route', async () => {
    const { container } = render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()
    const bar = within(
      container.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      ) as HTMLElement
    )

    expect(bar.getByRole('link', { name: 'Components' })).toHaveClass(
      'intent-accent'
    )
  })

  // Branch-active is not exact currency: the section is where you are, not
  // the page you are on.
  it('announces the section as current, never as the page, on a sub-route', async () => {
    render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()

    expect(verticalItem('Components')).toHaveAttribute('aria-current', 'true')
  })

  const verticalSectionTree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/foundations' href='/foundations'>
          Foundations
          <Navigator.Secondary aria-label='Foundations pages'>
            <Navigator.Item
              value='/foundations/layout'
              href='/foundations/layout'
            >
              Layout
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Doc
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('opens the section pane on an undeclared sub-route too', async () => {
    render(verticalSectionTree('/foundations/undeclared'))
    await flushViewportMeasurement()

    expect(verticalItem('Foundations')).toHaveClass('intent-accent')
    expect(
      document.querySelector('[data-navigator-section="/foundations"]')
    ).not.toBeNull()
  })

  it('does not match a sibling whose value is only a string prefix', async () => {
    render(verticalSectionTree('/tokens-legacy'))
    await flushViewportMeasurement()

    expect(verticalItem('Tokens')).not.toHaveClass('intent-accent')
  })
})

describe('Navigator.Primary direct-children warning', () => {
  it('warns when there is no Navigator.Brand', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Navigator.Primary has no Navigator.Brand')
    )
    warn.mockRestore()
    await flushViewportMeasurement()
  })

  it('does not count a Brand hidden in a Fragment', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <>
            <Navigator.Brand>Roadie</Navigator.Brand>
          </>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Navigator.Primary has no Navigator.Brand')
    )
    warn.mockRestore()
    await flushViewportMeasurement()
  })

  it('warns when a non-Item element sits at a direct-child position', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <div>Not an item</div>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Navigator.Primary only recognises Navigator.Item, Navigator.Group, Navigator.Brand and Navigator.ExpandToggle'
      )
    )
    warn.mockRestore()
    await flushViewportMeasurement()
  })

  it('stays quiet for Item children with a pinned item last', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          {testBrand}
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
          <Navigator.Item value='account' placement='pinned'>
            Account
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
    await flushViewportMeasurement()
  })

  it('warns when a pinned item is written before the cluster', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/me' href='/me' placement='pinned'>
            Me
          </Navigator.Item>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Write pinned items last')
    )
    warn.mockRestore()
  })

  it("warns when an item's placement differs from its group's", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Group>
            <Navigator.Item value='/a' href='/a' placement='pinned'>
              A
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("The group's placement wins")
    )
    warn.mockRestore()
  })
})

describe('Navigator collapsed edge circles', () => {
  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  // The pane's scroll container is ScrollArea's viewport, not the <section>.
  const scrollerOf = (root: Document | HTMLElement) =>
    root.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

  // A/B/C plus a pinned Account circle.
  const barTree = (active: string, onValueChange = vi.fn()) => (
    <Navigator value={active} onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='a'>A</Navigator.Item>
        <Navigator.Item value='b'>B</Navigator.Item>
        <Navigator.Item value='c'>C</Navigator.Item>
        <Navigator.Item value='account' placement='pinned'>
          Account
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='list'>Content</Pane>
      </Navigator.Content>
    </Navigator>
  )

  // A/B/C/D plus More, so the right circle is a track tab.
  const moreTree = (active: string, withPinned = false) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        {['a', 'b', 'c', 'd', 'e', 'f'].map((v) => (
          <Navigator.Item key={v} value={v}>
            {v.toUpperCase()}
          </Navigator.Item>
        ))}
        {withPinned ? (
          <Navigator.Item value='account' placement='pinned'>
            Account
          </Navigator.Item>
        ) : null}
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='list'>Content</Pane>
      </Navigator.Content>
    </Navigator>
  )

  const pinnedCircleOf = (container: HTMLElement) =>
    horizontalOf(container)!.querySelector<HTMLElement>(
      '[data-slot="navigator-primary-circle"]'
    )!

  // `Pane` coalesces scroll reports through a rAF, so the bar state lands a
  // frame after the event rather than synchronously.
  const settleFrame = () =>
    act(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
    )

  const scrollTo = async (pane: HTMLElement, top: number) => {
    Object.defineProperty(pane, 'scrollTop', { value: top, writable: true })
    fireEvent.scroll(pane)
    await settleFrame()
  }

  const collapse = async (container: HTMLElement) => {
    const pane = scrollerOf(container)
    await scrollTo(pane, 80)
    return pane
  }

  it('floats the active tab as a left circle and the final tab as a right circle', async () => {
    const { container } = render(moreTree('a'))
    await collapse(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    const active = bar.getByRole('button', { name: 'A' })
    const final = bar.getByRole('button', { name: 'More' })
    expect(active).toHaveClass('size-14')
    expect(active).toHaveAttribute('data-circle-side', 'left')
    expect(final).toHaveClass('size-14')
    expect(final).toHaveAttribute('data-circle-side', 'right')
    await flushViewportMeasurement()
  })

  it('keeps the pinned circle as the right circle while collapsed', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const bar = horizontalOf(container)!

    expect(
      within(pinnedCircleOf(container)).getByRole('button', { name: 'Account' })
    ).not.toHaveClass('scale-0')
    expect(bar.querySelector('[data-circle-side="right"]')).toBeNull()
    expect(bar.querySelector('[data-circle-side="left"]')).toHaveAccessibleName(
      'A'
    )
    await flushViewportMeasurement()
  })

  it('shrinks the pinned circle to the edge circle, keeping its icon size', async () => {
    const { container } = render(barTree('a'))
    const pinned = within(pinnedCircleOf(container)).getByRole('button', {
      name: 'Account'
    })
    const frame = pinned.querySelector('[data-slot="navigator-tab-icon-frame"]')
    const shrink = ['-translate-x-2', 'scale-[calc(3.5/4.125)]']
    expect(pinned).toHaveClass('origin-bottom-right', 'scale-100')
    for (const cls of shrink) expect(pinned).not.toHaveClass(cls)
    expect(frame).toHaveClass('scale-100')

    await collapse(container)
    expect(pinned).toHaveClass('origin-bottom-right', ...shrink)
    expect(frame).toHaveClass('scale-[calc(4.125/3.5)]')
    expect(pinned).toHaveClass('motion-reduce:transition-none')
    expect(frame).toHaveClass('motion-reduce:transition-none')
    await flushViewportMeasurement()
  })

  it('scales the non-edge tabs away but keeps them in the AT tree', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    // Every destination is still reachable — no display:none, nothing unmounted.
    expect(bar.getAllByRole('button')).toHaveLength(4)
    expect(bar.getByRole('button', { name: 'B' })).toHaveClass('scale-0')
    expect(bar.getByRole('button', { name: 'C' })).toHaveClass('scale-0')
    await flushViewportMeasurement()
  })

  it('reserves an empty middle by translating the circles apart, not spacing them', async () => {
    const { container } = render(moreTree('a'))
    await collapse(container)
    const bar = horizontalOf(container) as HTMLElement

    const sides = Array.from(
      bar.querySelectorAll('[data-circle-side]'),
      (circle) => circle.getAttribute('data-circle-side')
    )
    expect(sides).toEqual(['left', 'right'])
    // Nothing is pushing them apart — no spacer, no growing box.
    expect(bar.querySelector('.flex-1')).toBeNull()
    await flushViewportMeasurement()
  })

  it('fades the pill surface out on collapse without moving the bar', async () => {
    const { container } = render(barTree('a'))
    const bar = horizontalOf(container) as HTMLElement
    const pill = bar.querySelector('[data-slot="navigator-primary-pill"]')!
    const barClasses = bar.className

    expect(pill).toHaveClass('emphasis-floating', 'opacity-100')
    await collapse(container)

    expect(pill).toHaveClass('emphasis-floating', 'opacity-0')
    // Nothing about the bar's own box responds to collapse — it is
    // `pointer-events-none` in both states now, so the class string itself
    // never changes; only the track and the pill react.
    expect(bar.className).toBe(barClasses)
    await flushViewportMeasurement()
  })

  it('puts the first tab on the left when the pinned item is active', async () => {
    const { container } = render(barTree('account'))
    await collapse(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    const first = bar.getByRole('button', { name: 'A' })
    const account = within(pinnedCircleOf(container)).getByRole('button', {
      name: 'Account'
    })
    expect(first).toHaveClass('size-14')
    expect(first).toHaveAttribute('data-circle-side', 'left')
    expect(account).toHaveAttribute('aria-current', 'page')
    expect(first).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('floats More as the left circle when a folded item is active beside a pinned circle', async () => {
    const { container } = render(moreTree('e', true))
    await collapse(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    expect(bar.getByRole('button', { name: 'More' })).toHaveAttribute(
      'data-circle-side',
      'left'
    )
    expect(
      within(pinnedCircleOf(container)).getByRole('button', { name: 'Account' })
    ).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('puts the first tab on the left when a folded item is active', async () => {
    const { container } = render(moreTree('e'))
    await collapse(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    expect(bar.getByRole('button', { name: 'A' })).toHaveAttribute(
      'data-circle-side',
      'left'
    )
    expect(bar.getByRole('button', { name: 'More' })).toHaveAttribute(
      'data-circle-side',
      'right'
    )
    await flushViewportMeasurement()
  })

  it('hides the circle tab label so only the icon shows', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const active = within(horizontalOf(container) as HTMLElement).getByRole(
      'button',
      { name: 'A' }
    )
    expect(within(active).getByText('A')).toHaveClass('sr-only')
    await flushViewportMeasurement()
  })

  it('colours the idle pinned circle subtle, like every destination', async () => {
    const { container } = render(barTree('a'))
    const circle = pinnedCircleOf(container).querySelector(
      '[data-slot="navigator-item"]'
    )
    expect(circle).toHaveClass('text-subtle')
    expect(circle).not.toHaveClass('intent-accent')
    await flushViewportMeasurement()
  })

  it('gives the collapsed active circle the accent icon but no accent pill', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const active = within(horizontalOf(container) as HTMLElement).getByRole(
      'button',
      { name: 'A' }
    )
    // Neutral round surface with an accent icon — the tinted pill is expanded-only.
    expect(active).toHaveClass(
      'intent-accent',
      'text-subtle',
      'emphasis-floating'
    )
    expect(active.className).not.toContain('bg-[var(--intent-bg-subtle)]')
    await flushViewportMeasurement()
  })

  it('lets the page show through every surface of the bar', async () => {
    const { container } = render(barTree('a'))
    const bar = horizontalOf(container)!
    const pill = bar.querySelector('[data-slot="navigator-primary-pill"]')
    const pinned = within(pinnedCircleOf(container)).getByRole('button', {
      name: 'Account'
    })
    expect(pill).toHaveClass('emphasis-floating', 'is-translucent')
    expect(pinned).toHaveClass('emphasis-floating', 'is-translucent')

    await collapse(container)
    const left = bar.querySelector('[data-circle-side="left"]')
    expect(left).toHaveClass('emphasis-floating', 'is-translucent')
    await flushViewportMeasurement()
  })

  it('keeps the page from showing through a tab that is not a circle', async () => {
    const { container } = render(barTree('a'))
    const tab = within(horizontalOf(container)!).getByRole('button', {
      name: 'B'
    })
    expect(tab).not.toHaveClass('is-translucent')
    await flushViewportMeasurement()
  })

  it('never reorders a tab to collapse it', async () => {
    // `order` can only change discretely, so pinning a circle to an end column
    // teleported it there before the translate could run. Every circle now
    // travels from the column it already holds — which is why it carries its
    // own index rather than being moved to a known one.
    const { container } = render(barTree('b'))
    await collapse(container)
    const bar = horizontalOf(container)!

    for (const tab of bar.querySelectorAll('[data-slot="navigator-item"]')) {
      expect(tab.className).not.toMatch(/(^|\s)-?order-/)
    }
    // The active tab is the second of four, and it stays the second.
    const left = bar.querySelector('[data-circle-side="left"]')!
    expect(left).toHaveAccessibleName('B')
    expect(left.getAttribute('style')).toContain('--navigator-primary-index: 1')
    await flushViewportMeasurement()
  })

  it('carries each circle to its edge on translate, from its own column', async () => {
    // The whole collapse geometry, pinned. jsdom has no layout, so the browser
    // probe owns the measurement — what this can guard is that the translate
    // that does the carrying is actually emitted. A component that assigned
    // the sides correctly and dropped these would otherwise pass everything.
    const { container } = render(moreTree('b'))
    await collapse(container)
    const bar = horizontalOf(container)!

    const left = bar.querySelector('[data-circle-side="left"]')!
    const right = bar.querySelector('[data-circle-side="right"]')!

    expect(left).toHaveClass(
      '-translate-x-[calc(var(--navigator-primary-index)_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
    )
    expect(right).toHaveClass(
      'translate-x-[calc((var(--navigator-primary-count)_-_1_-_var(--navigator-primary-index))_*_var(--navigator-primary-col)_+_var(--navigator-primary-edge))]'
    )
    // Both descend to the bar's bottom edge rather than the row shortening.
    expect(left).toHaveClass('translate-y-1', 'self-end')
    expect(right).toHaveClass('translate-y-1', 'self-end')
    await flushViewportMeasurement()
  })

  it('keeps the track the same height in both states', async () => {
    // The bar's box has to be invariant on BOTH axes: the pill is `inset-0` of
    // the track, so a row that shortened on collapse would snap the pill's top
    // edge while it is still fully opaque. `scale-0` doesn't affect layout, so
    // the scaled-away tabs are what hold the row — they must keep `expanded`'s
    // vertical padding. Height itself is measured in the browser probe; jsdom
    // reports zero for everything.
    const { container } = render(barTree('a'))
    const bar = horizontalOf(container)!
    const track = bar.querySelector('[data-slot="navigator-primary-track"]')!
    expect(track).toHaveClass('py-1')

    const expandedTab = track.querySelector('[data-slot="navigator-item"]')!
    expect(expandedTab).toHaveClass('py-3.5')

    await collapse(container)
    // The track's own padding never changed, so nothing to transition.
    expect(track).toHaveClass('py-1')
    for (const tab of track.querySelectorAll(
      '[data-slot="navigator-item"]:not([data-circle-side])'
    )) {
      expect(tab).toHaveClass('py-3.5')
    }
    await flushViewportMeasurement()
  })

  it('leaves the collapsed bar transparent to input in the middle', async () => {
    // The collapsed bar spans the full width but shows only two edge circles.
    // Everything between them must reach the page beneath — jsdom has no hit
    // testing, so this pins the mechanism: the bar itself takes no pointer
    // events and each circle puts them back.
    const { container } = render(moreTree('a'))
    await collapse(container)

    const bar = horizontalOf(container)!
    expect(bar).toHaveClass('pointer-events-none')
    const circles = bar.querySelectorAll('[data-circle-side]')
    expect(circles).toHaveLength(2)
    for (const circle of circles) {
      expect(circle).toHaveClass('pointer-events-auto')
    }
    await flushViewportMeasurement()
  })

  it('keeps the pinned circle reachable while collapsed', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    expect(pinnedCircleOf(container)).toHaveClass('pointer-events-auto')
    await flushViewportMeasurement()
  })

  it('leaves the expanded bar transparent to input outside the tabs, below five tabs', async () => {
    // Below five tabs the bar is wider than the hugging track, so only the
    // track (and, collapsed, each circle) may take input.
    const { container } = render(barTree('a'))
    await flushViewportMeasurement()

    const bar = horizontalOf(container)!
    expect(bar).toHaveClass('pointer-events-none')
    const track = bar.querySelector('[data-slot="navigator-primary-track"]')!
    expect(track).toHaveClass('pointer-events-auto')
  })

  it('collapses a middle tab with scale, never a layout property', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)

    const hidden = horizontalOf(container)!.querySelector(
      '[data-slot="navigator-item"]:not([data-circle-side])'
    )!
    expect(hidden).toHaveClass('scale-0', 'opacity-0')
    expect(hidden).not.toHaveClass('max-w-0')
    await flushViewportMeasurement()
  })

  it('never names a layout property in the bar or tab transitions', async () => {
    // The branch's non-negotiable, pinned. Guards the exact regression this
    // task exists to remove, and would fail against the old
    // transition-[padding,…] and transition-[max-width,…].
    const { container } = render(barTree('a'))
    await collapse(container)

    const bar = horizontalOf(container)!
    const banned = ['padding', 'max-width', 'width', 'height', 'left', 'top']
    const classes = [
      bar.className,
      ...Array.from(bar.querySelectorAll('[data-slot="navigator-item"]')).map(
        (tab) => tab.className
      )
    ].join(' ')
    const transitions = classes.match(/transition-\[[^\]]+\]/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) {
      for (const property of banned) {
        expect(transition).not.toContain(property)
      }
    }
    await flushViewportMeasurement()
  })

  it('reopens the bar without scrolling or navigating when the collapsed active circle is tapped', async () => {
    const onValueChange = vi.fn()
    const { container } = render(barTree('a', onValueChange))
    const pane = await collapse(container)
    const scrollToSpy = vi.fn()
    pane.scrollTo = scrollToSpy
    const bar = horizontalOf(container) as HTMLElement
    expect(bar).toHaveAttribute('data-collapsed', 'true')

    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))

    expect(bar).toHaveAttribute('data-collapsed', 'false')
    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('stays expanded while the pane is still scrolled after reopening', async () => {
    const { container } = render(barTree('a'))
    const pane = await collapse(container)
    const bar = horizontalOf(container) as HTMLElement
    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))

    // A further scroll-sync at the same still-scrolled position keeps it open.
    await scrollTo(pane, 80)
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })

  it('re-collapses when the user scrolls down again after reopening', async () => {
    const { container } = render(barTree('a'))
    const pane = await collapse(container)
    const bar = horizontalOf(container) as HTMLElement
    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))
    expect(bar).toHaveAttribute('data-collapsed', 'false')

    await scrollTo(pane, 200)
    expect(bar).toHaveAttribute('data-collapsed', 'true')
  })

  it('scrolls the visible pane to the top when the expanded active tab is tapped', async () => {
    const onValueChange = vi.fn()
    const { container } = render(barTree('a', onValueChange))
    const pane = scrollerOf(container)
    const scrollToSpy = vi.fn()
    pane.scrollTo = scrollToSpy
    const bar = within(horizontalOf(container) as HTMLElement)

    await userEvent.click(bar.getByRole('button', { name: 'A' }))

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 })
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('reopens on the active pinned circle', async () => {
    const { container } = render(barTree('account'))
    await collapse(container)
    const bar = horizontalOf(container) as HTMLElement

    await userEvent.click(within(bar).getByRole('button', { name: 'Account' }))
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })

  it('navigates normally when a non-active tab is tapped while collapsed', async () => {
    const onValueChange = vi.fn()
    const { container } = render(barTree('a', onValueChange))
    await collapse(container)

    const bar = within(horizontalOf(container) as HTMLElement)
    await userEvent.click(bar.getByRole('button', { name: 'Account' }))

    expect(onValueChange).toHaveBeenCalledWith('account')
  })
})

describe('Navigator active-tab tap: scroll-on-landing vs navigate-up', () => {
  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  // The pane's scroll container is ScrollArea's viewport, not the <section>.
  const scrollerOf = (root: Document | HTMLElement) =>
    root.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

  // A section with its own landing route (`/components`) and one sub-page, so
  // the active tab can be on the landing or on a sub-page of the same section.
  const sectionTree = (active: string, onValueChange = vi.fn()) => (
    <Navigator value={active} onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Primary'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail'>
          <Pane.Header />
          Content
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const paneScrollSpy = (container: HTMLElement) => {
    const pane = scrollerOf(container)
    const scrollTo = vi.fn()
    pane.scrollTo = scrollTo
    return scrollTo
  }

  it('scrolls the pane to top when the active tab is tapped on the section landing', async () => {
    const onValueChange = vi.fn()
    const { container } = render(sectionTree('/components', onValueChange))
    const scrollTo = paneScrollSpy(container)
    const bar = within(horizontalOf(container) as HTMLElement)

    await userEvent.click(bar.getByRole('link', { name: 'Components' }))

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('navigates up to the landing (not scroll) when the active tab is tapped on a sub-page', async () => {
    const onValueChange = vi.fn()
    const { container } = render(
      sectionTree('/components/button', onValueChange)
    )
    const scrollTo = paneScrollSpy(container)
    const components = within(horizontalOf(container) as HTMLElement).getByRole(
      'link',
      { name: 'Components' }
    )

    // Its href is the section landing, so tapping it pops up there rather than
    // scrolling the sub-page's pane.
    expect(components).toHaveAttribute('href', '/components')
    await userEvent.click(components)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('navigates to the destination when an inactive tab is tapped', async () => {
    const onValueChange = vi.fn()
    const { container } = render(sectionTree('/components', onValueChange))
    const bar = within(horizontalOf(container) as HTMLElement)

    await userEvent.click(bar.getByRole('link', { name: 'Tokens' }))

    expect(onValueChange).toHaveBeenCalledWith('/tokens')
  })
})

describe('pane header inside Navigator', () => {
  it('draws no header at all when it has nothing to show', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item value='/' icon={<FakeIcon />}>
            Home
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(document.querySelector('[data-slot="pane-header"]')).toBeNull()
  })

  // Panes stay mounted, so the header's measurement follows its own visibility.
  it('publishes the header height only while the header draws', async () => {
    const tree = (titled: boolean) => (
      <Navigator value='/'>
        <Navigator.Content>
          <Pane role='detail' current>
            <Pane.Header>
              {titled ? <Pane.Title>Detail</Pane.Title> : null}
            </Pane.Header>
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const height = () =>
      document
        .querySelector<HTMLElement>('[data-slot="pane"]')!
        .style.getPropertyValue('--pane-header-height')

    const { rerender } = render(tree(true))
    await flushViewportMeasurement()
    // jsdom measures 0; the property's presence is what sticky content reads.
    expect(height()).toBe('0px')

    rerender(tree(false))
    await flushViewportMeasurement()
    expect(height()).toBe('')
  })
})

describe('active-tab tap on a Pane stack', () => {
  const tree = (onValueChange = vi.fn()) => (
    <Navigator value='/' onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item value='/settings' icon={<FakeIcon />}>
          Settings
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const viewportOf = () =>
    document.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

  const barOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )!

  // Real frames rather than captured ones: these tests also drive user-event,
  // and a stubbed rAF would strand anything else waiting on one.
  const settleFrame = () =>
    act(
      async () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
    )

  it('scrolls the top pane to the top when the expanded active tab is tapped', async () => {
    const onValueChange = vi.fn()
    const { container } = render(tree(onValueChange))
    await flushViewportMeasurement()

    const scrollTo = vi.fn()
    viewportOf().scrollTo = scrollTo

    await userEvent.click(
      within(barOf(container)).getByRole('button', { name: 'Home' })
    )

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('keeps the bar expanded after tapping the collapsed active tab', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()

    const viewport = viewportOf()
    Object.defineProperty(viewport, 'scrollTop', { value: 80, writable: true })
    fireEvent.scroll(viewport)
    await settleFrame()

    const bar = barOf(container)
    expect(bar).toHaveAttribute('data-collapsed', 'true')

    await userEvent.click(within(bar).getByRole('button', { name: 'Home' }))
    expect(bar).toHaveAttribute('data-collapsed', 'false')

    // The pane is still scrolled, so the next frame must read the pin — not
    // re-collapse the bar the user just reopened.
    fireEvent.scroll(viewport)
    await settleFrame()
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })
})

describe('Navigator tab icon bounce', () => {
  const horizontalOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-primary"][data-orientation="horizontal"]'
    )

  const tree = () => (
    <Navigator value='/'>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/' icon={<FakeIcon />}>
          Home
        </Navigator.Item>
        <Navigator.Item value='/settings' icon={<FakeIcon />}>
          Settings
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('bounces a tab icon when it becomes the active destination', async () => {
    const { container } = render(tree())
    await flushViewportMeasurement()

    const bar = horizontalOf(container)!
    const activeIcon = bar
      .querySelector('[data-slot="navigator-item"][aria-current]')!
      .querySelector('[data-slot="navigator-tab-icon"]')!
    const idleIcon = bar
      .querySelector('[data-slot="navigator-item"]:not([aria-current])')!
      .querySelector('[data-slot="navigator-tab-icon"]')!

    // `toHaveClass` against a real DOM `class` attribute — not
    // `data-classname` — so this proves the class actually reaches a
    // rendered element, not just that `presentNavIcon` computed the right
    // string. A class that compiled to nothing, or never made it onto the
    // clone, would fail this the same way it fails in a real browser.
    expect(activeIcon).toHaveClass('animate-pop-tap')
    expect(idleIcon).not.toHaveClass('animate-pop-tap')
  })
})

describe('Navigator.Content no-panes warning', () => {
  it('warns when it renders children but no pane registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <div>Not a pane</div>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('warns while a section pane is open if no consumer pane registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const tree = (children?: ReactNode) => (
      <Navigator value='/a/one'>
        <Navigator.Primary aria-label='Main'>
          {testBrand}
          <Navigator.Item value='/a' href='/a'>
            A
            <Navigator.Secondary aria-label='A pages'>
              <Navigator.Item value='/a/one' href='/a/one'>
                One
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>{children}</Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(tree())
    await flushViewportMeasurement()
    expect(document.querySelector('[data-navigator-section]')).not.toBeNull()
    rerender(tree(<div>Not a pane</div>))
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
    ).toBe(true)
    warn.mockRestore()
  })

  it('does not warn when it has no children at all', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content />
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
    ).toBe(false)
    warn.mockRestore()
  })

  it('does not warn once a pane registers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('identified no panes'))
    ).toBe(false)
    warn.mockRestore()
  })
})

// A pane in a wrapper getting a stack position is covered by Pane.test.tsx's
// 'pane registration through a wrapper'.
describe('nesting acceptance criteria', () => {
  const positions = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]')).map((p) =>
      p.getAttribute('data-stack-position')
    )

  // Stands in for a Next.js parallel-route slot node.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  // Criterion 2: below lg, list -> detail push and detail -> list pop carry
  // the position flip. Asserts the attribute, not the animation — jsdom
  // never runs the CSS transition.
  it('flips stack position on push and again on pop', async () => {
    const tree = (current: boolean) => (
      <Navigator value={current ? '/a/detail' : '/a'}>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current={current}>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(tree(false))
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'ahead'])

    rerender(tree(true))
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])

    rerender(tree(false))
    await flushViewportMeasurement()
    expect(positions()).toEqual(['top', 'ahead'])
  })

  // Criterion 3: a covered pane is not interactive.
  it('marks a covered pane pointer-events-none', async () => {
    render(
      <Navigator value='/a/detail'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const panes = document.querySelectorAll('[data-slot="pane"]')
    expect(panes[0]).toHaveAttribute('data-stack-position', 'behind')
    expect(panes[0]).toHaveClass('max-lg:pointer-events-none')
    expect(panes[1]).toHaveAttribute('data-stack-position', 'top')
    expect(panes[1]).not.toHaveClass('max-lg:pointer-events-none')
  })

  // Criterion 4: two panes contributed by one slot stack correctly relative
  // to each other — the prototype's actual failure (an event pane plus a
  // drill-down pane, both returned from one page component).
  it('orders an event pane and a drill-down pane from the same slot', async () => {
    render(
      <Navigator value='/events/123/allocations/456'>
        <Navigator.Content>
          <Slot>
            <Pane role='list'>Event allocations</Pane>
            <Pane role='detail' current>
              Allocation drill-down
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])
  })

  // Criterion 5: primaryNav resolves against the true top pane, even when that
  // pane is wrapped and the generated section pane leads the stack.
  it('resolves primaryNav against a wrapped top pane', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          {testBrand}
          <Navigator.Item
            value='/foundations'
            href='/foundations'
            icon={<FakeIcon />}
          >
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item value='/foundations/colors'>
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Slot>
            <Pane role='detail' current primaryNav='hidden'>
              <Pane.Header />
              Detail
            </Pane>
          </Slot>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'behind', 'top'])
    const top = document.querySelectorAll('[data-slot="pane"]')[2]
    expect(top).toHaveAttribute('data-primary-nav', 'hidden')
    expect(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="horizontal"]'
      )
    ).toHaveAttribute('data-hidden', 'true')
  })

  // Criterion 6: the literal-children composition — no wrapper anywhere —
  // keeps working unchanged.
  it('still stacks literal, unwrapped children correctly', async () => {
    render(
      <Navigator value='/a/detail'>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(positions()).toEqual(['behind', 'top'])
  })
})

describe('per-section stack memory', () => {
  const nav = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        <Navigator.Item value='/components' href='/components'>
          Components
          <Navigator.Secondary aria-label='Component pages'>
            <Navigator.Item
              value='/components/button'
              href='/components/button'
            >
              Button
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='/tokens' href='/tokens'>
          Tokens
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  const verticalLink = (name: string) =>
    within(
      document.querySelector(
        '[data-slot="navigator-primary"][data-orientation="vertical"]'
      ) as HTMLElement
    ).getByRole('link', { name })

  it('starts every section on its declared href', async () => {
    render(nav('/components'))
    await flushViewportMeasurement()
    expect(verticalLink('Tokens')).toHaveAttribute('href', '/tokens')
  })

  it('retargets a section you have left to the sub-route you left it on', async () => {
    const { rerender } = render(nav('/components'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/components/button'))
    await flushViewportMeasurement()
    expect(verticalLink('Tokens')).toHaveAttribute('href', '/tokens/color')
  })

  it('leaves the section you are in on its declared href', async () => {
    const { rerender } = render(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    expect(verticalLink('Tokens')).toHaveAttribute('href', '/tokens')
  })

  it('never retargets a section that declares a Secondary', async () => {
    const { rerender } = render(nav('/components/button'))
    await flushViewportMeasurement()
    rerender(nav('/tokens'))
    await flushViewportMeasurement()
    expect(verticalLink('Components')).toHaveAttribute('href', '/components')
  })

  it('never changes which pane is top', async () => {
    const withPanes = (value: string) => (
      <Navigator value={value}>
        <Navigator.Content>
          <Pane role='list'>List</Pane>
          <Pane role='detail' current={value.split('/').length > 2}>
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const { rerender } = render(withPanes('/tokens/color'))
    await flushViewportMeasurement()
    rerender(withPanes('/components'))
    await flushViewportMeasurement()
    const panes = document.querySelectorAll('[data-slot="pane"]')
    expect(panes[0]).toHaveAttribute('data-stack-position', 'top')
    expect(panes[1]).toHaveAttribute('data-stack-position', 'ahead')
  })
})

describe('indicator track offsetParent guard', () => {
  // jsdom has no offsetParent; a track without `relative` falls back to transform-inclusive rects.
  it('keeps every indicator track position: relative', () => {
    for (const track of [
      navigatorPrimaryTrackVariants(),
      navigatorPrimaryClusterTrackVariants(),
      navigatorPrimaryPinnedVariants()
    ]) {
      expect(track.split(' ')).toContain('relative')
    }
  })
})
