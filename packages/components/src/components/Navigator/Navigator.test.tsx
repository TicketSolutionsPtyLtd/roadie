import { type ReactNode, use } from 'react'

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { Navigator } from '.'
import { List } from '../List'
import { Pane } from '../Pane'
import {
  tabsIndicatorSurfaceClass,
  tabsIndicatorVariants
} from '../Tabs/variants'
import { NavigatorContext } from './NavigatorContext'
import { type NavigatorTabSlots, deriveMobileSlots } from './NavigatorPrimary'
import {
  navigatorIndicatorVariants,
  navigatorRailViewportVariants,
  navigatorSecondaryStripViewportVariants,
  navigatorTabBarTrackVariants
} from './variants'

// Every pane now mounts a ScrollArea, whose Viewport measures overflow via a
// `queueMicrotask` scheduled from a layout effect — it resolves after
// `render()` returns and updates ScrollAreaRoot state outside of React's
// act() scope. Flushing that microtask inside `act` keeps synchronous tests'
// output warning-free; tests that already `await` a user-event don't need it.
async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

const FakeIcon = ({
  weight,
  className,
  'data-slot': dataSlot
}: {
  weight?: string
  className?: string
  'data-slot'?: string
}) => (
  <svg
    data-testid='fake-icon'
    data-weight={weight ?? 'none'}
    // `data-classname` predates this: kept so existing exact-string
    // assertions (e.g. 'sizes rail item icons at size-6') don't need
    // rewriting. `className` is the real DOM class — added so a test can
    // prove a class actually reaches a rendered element, not just that
    // `presentNavIcon` computed the right string.
    data-classname={className ?? ''}
    className={className}
    data-slot={dataSlot}
  />
)

describe('Navigator', () => {
  it('is the same reference as Navigator.Root', () => {
    expect(Navigator).toBe(Navigator.Root)
  })
})

describe('pane stack', () => {
  const panes = () =>
    Array.from(document.querySelectorAll('[data-slot="pane"]'))

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
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/colors'
                href='/foundations/colors'
              >
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
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
    expect(
      document.querySelector('[data-slot="navigator-secondary-strip"]')
    ).toBeNull()
    // The tab bar reads the top pane's `primaryNav` off context; an
    // inspector's `hidden` declaration must not reach it since no pane there
    // is eligible to be top.
    expect(document.querySelector('[data-slot="pane"]')).toHaveAttribute(
      'data-primary-nav',
      'hidden'
    )
    expect(
      document.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-hidden', 'false')
  })

  // Regression guard: a mixed stack already resolved this correctly before
  // the fix (`deriveTopIndex` itself has always skipped an inspector) — this
  // pins that a single shared "who is top" answer keeps it that way.
  it('still never lets an inspector take chrome when real panes are present', async () => {
    render(
      <Navigator value='/foundations'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item
                value='/foundations/colors'
                href='/foundations/colors'
              >
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
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
    const strips = document.querySelectorAll(
      '[data-slot="navigator-secondary-strip"]'
    )
    expect(strips).toHaveLength(1)
    expect(strips[0]!.closest('[data-slot="pane"]')).toHaveAttribute(
      'data-role',
      'list'
    )
  })

  // jsdom computes no layout, so this cannot prove the behind pane stays off
  // the rail — that's only checkable in a browser. It pins the class-level
  // rule the geometry depends on: below `lg`, stacked panes are `absolute
  // inset-0` against Content, so Content must clip or a translated pane
  // paints past its own box and over the rail beside it.
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
      document.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-hidden', 'true')
  })

  it('leaves the bar alone when the hidden pane is not on top', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
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
      document.querySelector('[data-slot="navigator-tab-bar"]')
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
      document.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('inert')
  })

  it('leaves a shown tab bar in the accessibility tree', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
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
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-collapsed', 'false')
  })

  it('ignores a scroll on a pane the stack has covered', async () => {
    const { flush } = captureFrames()
    const { container } = render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Main'>
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
      container.querySelector('[data-slot="navigator-tab-bar"]')
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
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toHaveAttribute('data-collapsed', 'true')
  })
})

describe('deriveMobileSlots', () => {
  const items = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      value: `s${i}`,
      label: `S${i}`,
      topValue: `s${i}`,
      descendants: []
    }))

  const account = {
    value: 'account',
    label: 'Account',
    topValue: 'account',
    descendants: []
  }
  const orgs = {
    value: 'orgs',
    label: 'Organisations',
    topValue: 'orgs',
    descendants: []
  }

  it('renders every item as authored when slots fit', () => {
    const result = deriveMobileSlots(items(3), [account])
    expect(result.tabs).toHaveLength(3)
    expect(result.overflow).toHaveLength(0)
  })

  it('fits exactly five slots without folding', () => {
    const result = deriveMobileSlots(items(4), [account])
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow).toHaveLength(0)
  })

  it('folds the tail once slots exceed five', () => {
    const result = deriveMobileSlots(items(6), [account])
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow.map((i) => i.value)).toEqual(['s4', 's5'])
  })

  it('lends a lone End item its own label to the final tab', () => {
    expect(deriveMobileSlots(items(3), [account]).label).toBe('Account')
  })

  it('labels the final tab More when End holds more than one item', () => {
    expect(deriveMobileSlots(items(3), [orgs, account]).label).toBe('More')
  })

  it('labels the final tab More once anything folds', () => {
    expect(deriveMobileSlots(items(6), [account]).label).toBe('More')
  })

  it('has no final tab when nothing folds and there is no End', () => {
    const result = deriveMobileSlots(items(4), [])
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow).toHaveLength(0)
    expect(result.label).toBeUndefined()
  })

  it('still folds into More when there is no End', () => {
    const result = deriveMobileSlots(items(6), [])
    expect(result.tabs).toHaveLength(4)
    expect(result.overflow).toHaveLength(2)
    expect(result.label).toBe('More')
  })

  it("exposes End's items for the generated pane", () => {
    const result = deriveMobileSlots(items(6), [orgs, account])
    expect(result.end.map((i) => i.value)).toEqual(['orgs', 'account'])
  })
})

describe('deriveMobileSlots with declared tabs', () => {
  const meta = (value: string) => ({
    value,
    label: value,
    topValue: value,
    descendants: []
  })

  it('uses source order when tabs is omitted', () => {
    const slots = deriveMobileSlots([meta('a'), meta('b')], [])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a', 'b'])
    expect(slots.overflow).toEqual([])
  })

  it('takes the declared values in declared order', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b'), meta('c')],
      [],
      ['c', 'a']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['c', 'a'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['b'])
    expect(slots.label).toBe('More')
  })

  it('folds everything the array does not name, End included', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b')],
      [meta('account')],
      ['a']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['b'])
    expect(slots.end.map((t) => t.value)).toEqual(['account'])
  })

  it('ignores a declared value that is not in the tree', () => {
    const slots = deriveMobileSlots([meta('a')], [], ['a', 'ghost'])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.unknownTabs).toEqual(['ghost'])
  })

  it('collapses a repeated value to one tab at its first occurrence', () => {
    const slots = deriveMobileSlots(
      [meta('a'), meta('b'), meta('c')],
      [],
      ['a', 'a', 'b']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['a', 'b'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['c'])
    expect(slots.repeatedTabs).toEqual(['a'])
    expect(slots.unknownTabs).toEqual([])
  })

  it('names a single item without folding anything', () => {
    const slots = deriveMobileSlots([meta('a')], [], ['a'])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.overflow).toEqual([])
    expect(slots.label).toBeUndefined()
  })

  it('has no final tab when tabs names every item and there is no End', () => {
    const slots = deriveMobileSlots([meta('a'), meta('b')], [], ['a', 'b'])
    expect(slots.tabs.map((t) => t.value)).toEqual(['a', 'b'])
    expect(slots.overflow).toEqual([])
    expect(slots.label).toBeUndefined()
  })

  it('treats an End value named in tabs as unknown, not a rail tab', () => {
    const slots = deriveMobileSlots(
      [meta('a')],
      [meta('account')],
      ['a', 'account']
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['a'])
    expect(slots.unknownTabs).toEqual(['account'])
    expect(slots.end.map((t) => t.value)).toEqual(['account'])
  })

  it('caps a runtime-constructed tabs array at four slots and folds the rest', () => {
    // The `NavigatorTabSlots` union caps a typed caller at four values, but
    // `deriveMobileSlots` is exported and callable directly (a JS consumer,
    // or a cast) with a longer array — `--navigator-tab-col` stays hardcoded
    // to a fifth in the stylesheet, so an uncapped `chosen` here would push
    // the circle geometry off by however many tabs overran it.
    const overrun = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f'
    ] as unknown as NavigatorTabSlots
    const slots = deriveMobileSlots(
      [meta('a'), meta('b'), meta('c'), meta('d'), meta('e'), meta('f')],
      [],
      overrun
    )
    expect(slots.tabs.map((t) => t.value)).toEqual(['a', 'b', 'c', 'd'])
    expect(slots.overflow.map((t) => t.value)).toEqual(['e', 'f'])
    expect(slots.overflowTabs).toEqual(['e', 'f'])
  })
})

describe('Navigator.Primary tabs prop', () => {
  it('warns once about a value that is not declared', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main' tabs={['/a', '/ghost']}>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('/ghost')
    warn.mockRestore()
  })

  it('warns once about a value repeated in tabs', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main' tabs={['/a', '/a']}>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('/a')
    warn.mockRestore()
  })

  it('warns once and folds the rest when tabs names more than four values', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overrun = [
      '/a',
      '/b',
      '/c',
      '/d',
      '/e'
    ] as unknown as NavigatorTabSlots
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main' tabs={overrun}>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.Item value='/b' href='/b'>
            B
          </Navigator.Item>
          <Navigator.Item value='/c' href='/c'>
            C
          </Navigator.Item>
          <Navigator.Item value='/d' href='/d'>
            D
          </Navigator.Item>
          <Navigator.Item value='/e' href='/e'>
            E
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('/e')
    warn.mockRestore()
  })
})

describe('Navigator rail form', () => {
  it('is compact when nothing in the tree nests', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'compact')
    await flushViewportMeasurement()
  })

  it('is nested when any item declares a Secondary', async () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>Insights</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'nested')
    await flushViewportMeasurement()
  })

  it('does not change form when the active item changes', async () => {
    const tree = (value: string) => (
      <Navigator value={value}>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>Insights</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const { container, rerender } = render(tree('events'))
    rerender(tree('insights'))
    expect(
      container.querySelector('[data-slot="navigator-rail"]')
    ).toHaveAttribute('data-form', 'nested')
    await flushViewportMeasurement()
  })

  it('marks the active destination with aria-current', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
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

  it('renders both the rail and the tab bar so CSS can choose', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(container.querySelector('[data-slot="navigator-rail"]')).toBeTruthy()
    expect(
      container.querySelector('[data-slot="navigator-tab-bar"]')
    ).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('renders End after the primary items in the rail', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='account'>Account</Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    const end = container.querySelector('[data-slot="navigator-end"]')
    expect(end).toBeTruthy()
    expect(end?.querySelector('[data-slot="navigator-item"]')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('routes an item with an href through an anchor', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
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

  it('fills the active item icon and keeps the inactive one bold', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover' icon={<FakeIcon />}>
            Discover
          </Navigator.Item>
          <Navigator.Item value='tickets' icon={<FakeIcon />}>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const icons = screen.getAllByTestId('fake-icon')
    const railIcons = icons.filter((icon) =>
      icon.closest('[data-slot="navigator-rail"]')
    )
    const active = railIcons.find(
      (icon) =>
        icon.closest('[data-slot="navigator-item"]')?.textContent === 'Tickets'
    )
    const inactive = railIcons.find(
      (icon) =>
        icon.closest('[data-slot="navigator-item"]')?.textContent === 'Discover'
    )
    expect(active).toHaveAttribute('data-weight', 'fill')
    expect(inactive).toHaveAttribute('data-weight', 'bold')
    await flushViewportMeasurement()
  })

  it('overrides a consumer-set weight on the active item icon', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets' icon={<FakeIcon weight='bold' />}>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const railIcon = screen
      .getAllByTestId('fake-icon')
      .find((icon) => icon.closest('[data-slot="navigator-rail"]'))
    expect(railIcon).toHaveAttribute('data-weight', 'fill')
    await flushViewportMeasurement()
  })

  it('sizes rail item icons at size-6, overriding a consumer size', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item
            value='tickets'
            icon={<FakeIcon className='size-10' />}
          >
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const railIcon = screen
      .getAllByTestId('fake-icon')
      .find((icon) => icon.closest('[data-slot="navigator-rail"]'))
    expect(railIcon).toHaveAttribute('data-classname', 'size-6')
    await flushViewportMeasurement()
  })

  it('raises the current destination neutrally and leaves the inactive one muted', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const railItem = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="navigator-item"]'))
        .find((el) => el?.closest('[data-slot="navigator-rail"]'))

    // Current is a neutral raised pill, never accent-tinted.
    expect(railItem('Tickets')).toHaveClass('text-strong')
    expect(railItem('Tickets')).not.toHaveClass('intent-accent')
    expect(railItem('Discover')).toHaveClass('text-subtle')
    expect(railItem('Discover')).not.toHaveClass('emphasis-raised')
    await flushViewportMeasurement()
  })
})

describe('Navigator routeless primary', () => {
  const railItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) => el?.closest('[data-slot="navigator-rail"]'))

  it('delegates to the first secondary child when it has no href of its own', async () => {
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
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
    const section = railItem('Foundations')
    expect(section?.tagName).toBe('A')
    expect(section).toHaveAttribute('href', '/foundations/layout')
    await flushViewportMeasurement()
  })

  it('links to itself when it has its own href', async () => {
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
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
    const section = railItem('Components')
    expect(section?.tagName).toBe('A')
    expect(section).toHaveAttribute('href', '/components')
    await flushViewportMeasurement()
  })

  it('renders a button when it has no href and no secondary', async () => {
    render(
      <Navigator value='/other'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='appearance'>Appearance</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    expect(railItem('Appearance')?.tagName).toBe('BUTTON')
    await flushViewportMeasurement()
  })

  it('leaves the routeless section flat and raises the navigated first child', async () => {
    render(
      <Navigator value='/foundations/layout'>
        <Navigator.Primary aria-label='Primary'>
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
      </Navigator>
    )
    const section = railItem('Foundations')
    expect(section).toHaveClass('text-strong')
    expect(section).not.toHaveClass('emphasis-raised')
    expect(section).not.toHaveAttribute('aria-current')

    const current = railItem('Layout')
    expect(current).toHaveClass('text-strong')
    expect(current).toHaveAttribute('aria-current', 'page')
    await flushViewportMeasurement()
  })
})

describe('Navigator.Brand', () => {
  it('renders at the top of the rail without becoming a destination', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Brand>Roadie</Navigator.Brand>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const rail = container.querySelector('[data-slot="navigator-rail"]')
    const railContent = container.querySelector(
      '[data-slot="navigator-rail-viewport"] [data-slot="scroll-area-content"]'
    )
    const brand = rail?.querySelector('[data-slot="navigator-brand"]')
    expect(brand).toBeTruthy()
    expect(brand).toHaveTextContent('Roadie')
    // First child of the scrolled content — pinned above the items.
    expect(railContent?.firstElementChild).toBe(brand)
    await flushViewportMeasurement()
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
      container.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    )
    expect(bar.getAllByRole('button')).toHaveLength(2)
    const rail = container.querySelector('[data-slot="navigator-rail"]')
    expect(rail?.querySelectorAll('[data-slot="navigator-item"]')).toHaveLength(
      2
    )
    await flushViewportMeasurement()
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

describe('Navigator.End stray children', () => {
  it('warns about a stray child inside Navigator.End', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const NotAnItem = () => <div>Account</div>
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.End>
            <NotAnItem />
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalled()
    expect(String(warn.mock.calls[0]?.[0])).toContain('Navigator.End')
    warn.mockRestore()
  })

  it('does not warn about a well-formed End', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='/account' href='/account'>
              Account
            </Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('Navigator section chevron', () => {
  const railItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) => el?.closest('[data-slot="navigator-rail"]'))

  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='tokens'>Tokens</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders a chevron on an item that declares a Secondary', async () => {
    render(tree('tokens'))
    expect(railItem('Components')?.querySelector('svg')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('renders no chevron on an item without a Secondary', async () => {
    render(tree('tokens'))
    expect(railItem('Tokens')?.querySelector('svg')).toBeNull()
    await flushViewportMeasurement()
  })

  it('points the chevron down while the section is expanded', async () => {
    render(tree('button'))
    expect(railItem('Components')?.querySelector('.rotate-90')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('points the chevron right while the section is collapsed', async () => {
    render(tree('tokens'))
    expect(railItem('Components')?.querySelector('.rotate-0')).toBeTruthy()
    await flushViewportMeasurement()
  })
})

describe('Navigator active item surface', () => {
  it('gives the active rail item the neutral raised pill classes', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const railItem = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="navigator-item"]'))
        .find((el) => el?.closest('[data-slot="navigator-rail"]'))

    expect(railItem('Tickets')).toHaveClass('text-strong')
    expect(railItem('Tickets')).not.toHaveClass('intent-accent')
    expect(railItem('Discover')).not.toHaveClass('emphasis-raised')
    await flushViewportMeasurement()
  })

  it('gives inactive rail items a subtle hover background', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const railItem = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest('[data-slot="navigator-item"]'))
        .find((el) => el?.closest('[data-slot="navigator-rail"]'))

    expect(railItem('Discover')).toHaveClass('hover:bg-subtle')
    expect(railItem('Tickets')).not.toHaveClass('hover:bg-subtle')
    await flushViewportMeasurement()
  })
})

describe('Navigator active-state split', () => {
  const railItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) => el?.closest('[data-slot="navigator-rail"]'))

  const nestedTree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('keeps the branch-active section flat, dark and bold — never raised or accent', async () => {
    render(nestedTree('button'))
    const section = railItem('Components')
    expect(section).toHaveClass('text-strong')
    expect(section).not.toHaveClass('intent-accent')
    expect(section).not.toHaveClass('emphasis-raised')
    await flushViewportMeasurement()
  })

  it('raises the current sub-page neutrally with the accent bar on the tree-line', async () => {
    const { container } = render(nestedTree('button'))
    const current = railItem('Button')
    // Neutral raised pill — never accent-tinted, no item-level bar.
    expect(current).toHaveClass('text-strong')
    expect(current).not.toHaveClass('intent-accent')
    expect(current?.className).not.toContain(
      'before:bg-[var(--color-accent-9)]'
    )
    expect(current).toHaveAttribute('aria-current', 'page')
    // The accent bar lives on the secondary container, scoped to the current
    // nested item via aria-current.
    const secondary = container.querySelector(
      '[data-slot="navigator-secondary"]'
    )
    expect(secondary?.className).toContain(
      '[&_[data-slot=navigator-item][aria-current=page]]:before:bg-[var(--color-accent-9)]'
    )
    expect(railItem('Card')).not.toHaveClass('emphasis-raised')
    await flushViewportMeasurement()
  })

  it('raises the selected primary as current with an accent icon and no bar', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const current = railItem('Tickets')
    expect(current).toHaveClass('text-strong')
    expect(current).not.toHaveClass('intent-accent')
    // The current primary carries the accent-icon rule, never a left bar.
    expect(current?.className).toContain(
      '[&_[data-slot=navigator-item-icon]]:text-accent-11'
    )
    expect(current?.className).not.toContain(
      'before:bg-[var(--color-accent-9)]'
    )
    expect(railItem('Discover')).not.toHaveClass('emphasis-raised')
    await flushViewportMeasurement()
  })
})

describe('overflow state', () => {
  it('publishes the folded items and the open flag on context', async () => {
    const seen: { open: boolean; count: number }[] = []
    function Probe() {
      const { overflowOpen, overflowItems } = use(NavigatorContext)
      seen.push({ open: overflowOpen, count: overflowItems.length })
      return null
    }
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
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
    expect(last.count).toBe(2)

    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(seen.at(-1)!.open).toBe(true)
  })
})

describe('Navigator mobile tab bar', () => {
  const tabBarOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="navigator-tab-bar"]')

  const sixItemsAndEnd = (
    <Navigator value='events'>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='a'>A</Navigator.Item>
        <Navigator.Item value='b'>B</Navigator.Item>
        <Navigator.Item value='c'>C</Navigator.Item>
        <Navigator.Item value='d'>D</Navigator.Item>
        <Navigator.Item value='e'>E</Navigator.Item>
        <Navigator.Item value='f'>F</Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>Account</Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )

  it('names the tab bar distinctly from the rail', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
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
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = tabBarOf(container)
    expect(bar).toHaveClass('max-md:absolute')
    expect(bar).toHaveClass('md:hidden')
    await flushViewportMeasurement()
  })

  it('renders one tab per declared item when nothing folds', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
    expect(bar.getAllByRole('button')).toHaveLength(2)
    expect(bar.getByText('Discover')).toBeTruthy()
    expect(bar.getByText('Tickets')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('marks the active tab with aria-current', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
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
          <Navigator.Item value='/discover' href='/discover'>
            Discover
          </Navigator.Item>
          <Navigator.Item value='/foundations' href='/foundations'>
            Foundations
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
    expect(bar.getByRole('link', { name: 'Foundations' })).toHaveAttribute(
      'aria-current',
      'true'
    )
    await flushViewportMeasurement()
  })

  it('folds the tail into a final More tab', async () => {
    const { container } = render(sixItemsAndEnd)
    const bar = within(tabBarOf(container) as HTMLElement)
    expect(bar.getAllByRole('button')).toHaveLength(5)
    expect(bar.queryByText('E')).toBeNull()
    expect(bar.getByRole('button', { name: 'More' })).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('gives the generated More tab an icon like every other tab', async () => {
    const { container } = render(sixItemsAndEnd)
    const bar = within(tabBarOf(container) as HTMLElement)
    const more = bar.getByRole('button', { name: 'More' })
    expect(more.querySelector('svg')).toBeTruthy()
    await flushViewportMeasurement()
  })

  it('discloses, rather than links, when declared tabs leave one rail item unnamed', async () => {
    const { container } = render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary' tabs={['a', 'c']}>
          <Navigator.Item value='a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.Item value='b' href='/b'>
            B
          </Navigator.Item>
          <Navigator.Item value='c' href='/c'>
            C
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
    const disclosure = bar.getByRole('button', { name: 'More' })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    await flushViewportMeasurement()
  })

  it('omits the final tab when there is nothing to put in it', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover'>Discover</Navigator.Item>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
    expect(bar.queryByRole('button', { name: 'More' })).toBeNull()
    expect(bar.getAllByRole('button')).toHaveLength(2)
    await flushViewportMeasurement()
  })

  it('fills the active tab icon and keeps the inactive one bold', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='discover' icon={<FakeIcon />}>
            Discover
          </Navigator.Item>
          <Navigator.Item value='tickets' icon={<FakeIcon />}>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
    const active = bar
      .getByRole('button', { name: 'Tickets' })
      .querySelector('[data-testid="fake-icon"]')
    const inactive = bar
      .getByRole('button', { name: 'Discover' })
      .querySelector('[data-testid="fake-icon"]')
    expect(active).toHaveAttribute('data-weight', 'fill')
    expect(inactive).toHaveAttribute('data-weight', 'bold')
    await flushViewportMeasurement()
  })

  it('sizes tab icons at size-7, overriding a consumer size', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item
            value='tickets'
            icon={<FakeIcon className='size-2' />}
          >
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const tabIcon = within(tabBarOf(container) as HTMLElement)
      .getByRole('button', { name: 'Tickets' })
      .querySelector('[data-testid="fake-icon"]')
    // The sole item defaults to active, so its icon also carries the bounce
    // class — asserting the leading token keeps this test about sizing.
    expect(tabIcon?.getAttribute('data-classname')).toMatch(/^size-7\b/)
    await flushViewportMeasurement()
  })

  it('routes a tab with an href through an anchor', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets' href='/tickets'>
            Tickets
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
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
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='account'>Account</Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
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
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = within(tabBarOf(container) as HTMLElement)
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
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = tabBarOf(container) as HTMLElement
    const disclosure = within(bar).getByRole('button', { name: 'More' })

    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(disclosure)
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(disclosure)
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('yields the route tab to a panel opened as a regular tab (not folded)', async () => {
    const { container } = render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
          <Navigator.Item value='account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const bar = tabBarOf(container) as HTMLElement
    const routeTab = within(bar).getByRole('button', { name: 'Tickets' })
    const panelTab = within(bar).getByRole('button', { name: 'Account' })

    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    // The panel superseding the route is the same rule the More disclosure
    // already follows — exactly one tab should read as current, and it
    // should be the panel, not both.
    expect(panelTab).toHaveAttribute('aria-current', 'true')
    expect(routeTab).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(panelTab).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  // These two exercise the yield inside the More disclosure and the
  // sole-folded branch specifically — a panel opening elsewhere while a
  // *different*, route-active folded/final tab is the one currently
  // showing `aria-current`. The route-tab-map test above never reaches
  // either branch, so it can't stand in for them.
  it('with a route-active More disclosure, yields it to a panel opened elsewhere', async () => {
    const { container } = render(
      <Navigator value='x'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
          <Navigator.Item value='account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
          {/* Two End items so `folded.length > 1`, forcing the More
              disclosure branch rather than the sole-folded one. */}
          <Navigator.End>
            <Navigator.Item value='x'>X</Navigator.Item>
            <Navigator.Item value='y'>Y</Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = tabBarOf(container) as HTMLElement
    const disclosure = within(bar).getByRole('button', { name: 'More' })
    const panelTab = within(bar).getByRole('button', { name: 'Account' })

    expect(disclosure).toHaveAttribute('aria-current', 'true')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    expect(panelTab).toHaveAttribute('aria-current', 'true')
    expect(disclosure).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('with a route-active sole-folded tab, yields it to a panel opened elsewhere', async () => {
    const { container } = render(
      <Navigator value='x'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
          {/* A single, non-panel End item renders through the sole-folded
              branch, not the More disclosure. */}
          <Navigator.End>
            <Navigator.Item value='x'>X</Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    const bar = tabBarOf(container) as HTMLElement
    const soleFolded = within(bar).getByRole('button', { name: 'X' })
    const panelTab = within(bar).getByRole('button', { name: 'Account' })

    expect(soleFolded).toHaveAttribute('aria-current', 'page')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    expect(panelTab).toHaveAttribute('aria-current', 'true')
    expect(soleFolded).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })
})

describe('Navigator.Overflow', () => {
  const overflowNav = (value: string, extra?: ReactNode) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
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
        <Navigator.End>
          <Navigator.Item value='/account' href='/account'>
            Account
          </Navigator.Item>
        </Navigator.End>
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
    expect(settings.queryByRole('link', { name: 'Account' })).toBeNull()
    expect(overflow.getByRole('link', { name: 'Account' })).toBeTruthy()
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
        <Navigator.Overflow>
          <Pane.Header>
            <Pane.Title>Menu</Pane.Title>
          </Pane.Header>
          <p>Promo</p>
          <Navigator.OverflowItems />
        </Navigator.Overflow>
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

  // Stands in for a Next.js parallel-route slot node — the same shape as the
  // bug report this whole task answers, applied to the one place it still
  // reached: a declared `Navigator.Overflow` is invisible to a children scan
  // once it's behind a wrapper, so without a registration-based check it
  // would double up with the generated fallback under one shared DOM id.
  const Slot = ({ children }: { children: ReactNode }) => <>{children}</>

  it('recognises a Navigator.Overflow declared behind a wrapper', async () => {
    render(
      overflowNav(
        '/a',
        <Slot>
          <Navigator.Overflow>
            <p>Promo</p>
            <Navigator.OverflowItems />
          </Navigator.Overflow>
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

  it('gives a folded destination aria-current=page, matching the rail and tab bar', async () => {
    render(overflowNav('/e'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))

    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    const row = within(overflow as HTMLElement).getByRole('link', {
      name: '/e'
    })
    expect(row).toHaveAttribute('aria-current', 'page')
  })

  it('warns in dev when two Navigator.Overflow are declared, sharing one DOM id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      overflowNav(
        '/a',
        <>
          <Navigator.Overflow>
            <Navigator.OverflowItems />
          </Navigator.Overflow>
          <Navigator.Overflow>
            <Navigator.OverflowItems />
          </Navigator.Overflow>
        </>
      )
    )
    await flushViewportMeasurement()
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('Navigator.Overflow'))
    ).toBe(true)
    warn.mockRestore()
  })

  // The seven tests below are inherited from Task 4's deletion of the
  // floating overflow pane — restored against the full-screen `Pane`, or (one
  // of them) retired outright. See task-5-report.md for the full mapping.

  it('lists folded rail items and End contents together, excluding a kept tab', async () => {
    render(
      <Navigator value='a'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='a'>A</Navigator.Item>
          <Navigator.Item value='b'>B</Navigator.Item>
          <Navigator.Item value='c'>C</Navigator.Item>
          <Navigator.Item value='d'>D</Navigator.Item>
          <Navigator.Item value='e'>E</Navigator.Item>
          <Navigator.Item value='f'>F</Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='account'>Account</Navigator.Item>
          </Navigator.End>
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
    expect(overflow.getByText('Account')).toBeTruthy()
    expect(overflow.queryByText('A')).toBeNull()
  })

  it('generates no overflow pane when nothing folds', async () => {
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
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
    // Not just string equality between two reads of the same id — resolve it
    // through the DOM, so a consumer clobbering the id Navigator owns (e.g.
    // passing their own `id` to Navigator.Overflow) would show up as a broken
    // reference here, not a coincidentally-matching pair of strings.
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

  // Retired, not restored: the pinned outside-click dismissal assumed a
  // floating popup with an "outside" to click. A full-screen pane has none —
  // Escape (above) is the only dismissal left.
})

describe('Navigator sliding indicator', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='discover'>Discover</Navigator.Item>
        <Navigator.Item value='tickets'>Tickets</Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders a decorative indicator in the tab bar', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
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
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator.className).toContain('bg-[var(--intent-bg-subtle)]')
    await flushViewportMeasurement()
  })

  // jsdom reports zero rects, so the indicator can never measure a real box.
  // That is the correct first-paint state and worth pinning: no transition
  // until a measurement exists, so the pill never slides in from (0,0).
  it('stays unready while nothing can be measured', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )!

    expect(indicator).toHaveAttribute('data-ready', 'false')
    expect(indicator.className).toContain('opacity-0')
    await flushViewportMeasurement()
  })

  it('slides the tab bar indicator on translate, not on layout properties', async () => {
    const { container } = render(tree('tickets'))
    await flushViewportMeasurement()

    const indicator = container.querySelector(
      '[data-slot="navigator-tab-bar"] [data-slot="navigator-indicator"]'
    )!
    const transitions =
      indicator.className.match(/transition-\[[^\]]+\]/g) ?? []
    expect(transitions.length).toBeGreaterThan(0)
    for (const transition of transitions) {
      expect(transition).toContain('translate')
      for (const property of ['left', 'top', 'width', 'height']) {
        expect(transition).not.toContain(property)
      }
      expect(transition).not.toContain('transform')
    }
  })

  const stripTree = () => (
    <Navigator value='button'>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          <Pane.Header>
            <Pane.Title>Button</Pane.Title>
          </Pane.Header>
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('renders a sliding indicator in the secondary strip', async () => {
    const { container } = render(stripTree())

    const indicator = container.querySelector(
      '[data-slot="navigator-secondary-strip"] [data-slot="navigator-indicator"]'
    )

    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
    await flushViewportMeasurement()
  })

  it('styles strip items with the Tabs subtle pill vocabulary', async () => {
    const { container } = render(stripTree())

    const item = container.querySelector(
      '[data-slot="navigator-secondary-strip"] [data-slot="navigator-item"]'
    )!

    expect(item.className).toContain('rounded-full')
    expect(item).toHaveClass('is-interactive')
    // Still navigation, not a tab.
    expect(item).not.toHaveAttribute('role', 'tab')
    expect(item).not.toHaveAttribute('aria-selected')
    await flushViewportMeasurement()
  })

  const nestedTree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders a sliding indicator in the rail', async () => {
    const { container } = render(tree('tickets'))

    const indicator = container.querySelector(
      '[data-slot="navigator-rail"] [data-slot="navigator-indicator"]'
    )

    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveAttribute('aria-hidden', 'true')
    expect(indicator?.className).toContain('emphasis-raised')
    await flushViewportMeasurement()
  })

  it('leaves the nested sub-page as the sole aria-current element in the rail', async () => {
    const { container } = render(nestedTree('button'))

    const current = container.querySelectorAll(
      '[data-slot="navigator-rail"] [aria-current]'
    )

    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('data-slot', 'navigator-item')
    expect(current[0]).toHaveTextContent('Button')
    await flushViewportMeasurement()
  })

  it('mounts one indicator per rail, not one per nested group', async () => {
    const { container } = render(nestedTree('button'))

    expect(
      container.querySelectorAll(
        '[data-slot="navigator-rail"] [data-slot="navigator-indicator"]'
      )
    ).toHaveLength(1)
    await flushViewportMeasurement()
  })

  // The strip's contents come from `NavigatorPrimary`'s `setSecondaryNav`
  // effect, which lands one commit after `value` changes — so switching to a
  // different section's landing renders the OLD section's strip on the same
  // commit as the new `value`, then swaps to the NEW section's items on the
  // next commit with `value` unchanged. The indicator must still pick up the
  // new `aria-current` item on that second commit. Needs non-zero rects
  // (jsdom reports every element as zero-size) to reach `ready`.
  describe('across a cross-section switch', () => {
    const originalGetBoundingClientRect =
      Element.prototype.getBoundingClientRect
    // Captured inside `beforeAll`, not at collection time: the setup file
    // installs the jsdom ResizeObserver mock in its own `beforeAll`, so a
    // module-scope read here sees `undefined` and `afterAll` restores that —
    // leaving every later test in the file with no ResizeObserver at all.
    let originalResizeObserver: typeof ResizeObserver

    beforeAll(() => {
      originalResizeObserver = globalThis.ResizeObserver
      Element.prototype.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 30,
          width: 100,
          height: 30,
          x: 0,
          y: 0,
          toJSON: () => ({})
        }) as DOMRect
      // Real ResizeObserver delivers an initial observation synchronously
      // enough to rescue first paint (see useSlidingIndicator's comment on
      // `trackRef.current` being null on mount); the global jsdom mock is a
      // no-op, so the strip's first mount would otherwise never go ready.
      globalThis.ResizeObserver = class {
        constructor(private cb: () => void) {}
        observe() {
          this.cb()
        }
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver
    })

    afterAll(() => {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
      globalThis.ResizeObserver = originalResizeObserver
    })

    const twoSectionTree = (active: string) => (
      <Navigator value={active}>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='a1'>A one</Navigator.Item>
              <Navigator.Item value='a2'>A two</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
          <Navigator.Item value='insights'>
            Insights
            <Navigator.Secondary aria-label='Insights sections'>
              <Navigator.Item value='b1'>B one</Navigator.Item>
              <Navigator.Item value='b2'>B two</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail'>
            <Pane.Header />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )

    const stripIndicator = (container: HTMLElement) =>
      container.querySelector<HTMLElement>(
        '[data-slot="navigator-secondary-strip"] [data-slot="navigator-indicator"]'
      )

    it('stays ready once the strip has rendered the new section', async () => {
      const { container, rerender } = render(twoSectionTree('a1'))
      expect(stripIndicator(container)).toHaveAttribute('data-ready', 'true')

      rerender(twoSectionTree('b1'))

      expect(
        container.querySelector(
          '[data-slot="navigator-secondary-strip"] [data-slot="navigator-item"]'
        )
      ).toHaveTextContent('B one')
      expect(stripIndicator(container)).toHaveAttribute('data-ready', 'true')
      await flushViewportMeasurement()
    })
  })
})

describe('Navigator strip indicator surface', () => {
  it('shares its indicator surface with Tabs instead of tracking it by eye', () => {
    // The strip cannot use Tabs.Indicator (its positioning and var mapping
    // are Navigator's own), so the appearance is imported instead of
    // copied. This pins that it is genuinely one source: a change to the
    // fragment reaches both, and neither may inline its own copy.
    expect(tabsIndicatorSurfaceClass).not.toBe('')
    expect(tabsIndicatorVariants({ emphasis: 'subtle' })).toContain(
      tabsIndicatorSurfaceClass
    )
    expect(navigatorIndicatorVariants({ surface: 'strip' })).toContain(
      tabsIndicatorSurfaceClass
    )
  })
})

describe('Navigator.Secondary', () => {
  // The strip now lives inside a Pane.Header, fed the active
  // section's secondary nav through context. Both the Primary (writer) and a
  // Header (reader) must be present for the mobile strip to appear.
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='events'>
          Events
          <Navigator.Secondary aria-label='Events sections'>
            <Navigator.Item value='all'>All events</Navigator.Item>
            <Navigator.Item value='drafts'>Drafts</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='insights'>Insights</Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail'>
          <Pane.Header />
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const stripOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-secondary-strip"]'
    )

  const stripViewportOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(
      '[data-slot="navigator-secondary-strip-viewport"]'
    )

  it('lays the strip row out on the scrolling content, not the viewport', async () => {
    // Regression guard for the wrap. ScrollArea.Content sits between the
    // viewport and the items, so a row declared on the viewport lays out one
    // block child, and the inline-flex items inside that child wrap as inline
    // content — 14 items over 4 rows, with no gap and nothing to scroll.
    const { container } = render(tree('events'))
    await flushViewportMeasurement()

    const viewport = stripViewportOf(container)!
    const content = viewport.querySelector<HTMLElement>(
      '[data-slot="scroll-area-content"]'
    )!

    expect(content).toHaveClass(
      'flex',
      'items-center',
      'gap-1',
      'px-[calc(var(--content-inset)+var(--spacing))]'
    )
    expect(viewport).toHaveClass('overflow-x-auto')
    expect(viewport).not.toHaveClass('gap-1')
    expect(viewport).not.toHaveClass('items-center')
    expect(
      content.querySelectorAll('[data-slot="navigator-item"]')
    ).toHaveLength(2)
  })

  it('renders its children when its parent item is active', async () => {
    render(tree('events'))
    expect(screen.getAllByText('All events').length).toBeGreaterThan(0)
    await flushViewportMeasurement()
  })

  it('renders nothing when its parent item is not active', async () => {
    render(tree('insights'))
    expect(screen.queryByText('All events')).toBeNull()
    await flushViewportMeasurement()
  })

  it('is a labelled navigation landmark', async () => {
    render(tree('events'))
    expect(
      screen.getByRole('navigation', { name: 'Events sections' })
    ).toBeInTheDocument()
    await flushViewportMeasurement()
  })

  it('nests inside its own primary item, immediately after it', async () => {
    const { container } = render(tree('events'))
    const rail = container.querySelector('[data-slot="navigator-rail"]')
    const nested = rail?.querySelector('[data-slot="navigator-secondary"]')
    const parentItem = within(rail as HTMLElement)
      .getByText('Events')
      .closest('[data-slot="navigator-item"]')
    const owningLi = parentItem?.closest('li')

    expect(owningLi?.tagName).toBe('LI')
    expect(nested?.parentElement).toBe(owningLi)
    expect(parentItem?.nextElementSibling).toBe(nested)
    await flushViewportMeasurement()
  })

  it('renders the strip inside the pane header as a scrolling row of the declared items', async () => {
    const { container } = render(tree('events'))
    const strip = stripOf(container) as HTMLElement

    expect(strip.closest('[data-slot="pane-header"]')).toBeTruthy()
    expect(stripViewportOf(container)?.className).toContain('overflow-x-auto')
    expect(
      within(strip)
        .getAllByRole('button')
        .map((el) => el.textContent)
    ).toEqual(['All events', 'Drafts'])
    await flushViewportMeasurement()
  })

  it('forwards className to the nested rail', async () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary
              aria-label='Events sections'
              className='custom-secondary'
            >
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )

    expect(
      container.querySelector('[data-slot="navigator-secondary"]')
    ).toHaveClass('custom-secondary')
    await flushViewportMeasurement()
  })

  it('forwards a Secondary className to the mobile strip in the header', async () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary
              aria-label='Events sections'
              className='custom-strip'
            >
              <Navigator.Item value='all'>All events</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail'>
            <Pane.Header />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const strip = stripOf(container) as HTMLElement
    // Consumer class lands on the root; the scroll layout class lives on
    // the viewport now that the strip is a ScrollArea.
    expect(strip).toHaveClass('custom-strip')
    expect(stripViewportOf(container)).toHaveClass('overflow-x-auto')
    await flushViewportMeasurement()
  })

  it('marks the current sub-page active in the header strip', async () => {
    const { container } = render(tree('all'))
    const strip = within(stripOf(container) as HTMLElement)
    expect(strip.getByRole('button', { name: 'All events' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(strip.getByRole('button', { name: 'Drafts' })).not.toHaveAttribute(
      'aria-current'
    )
    await flushViewportMeasurement()
  })

  it('renders no strip when the active item declares no Secondary', async () => {
    const { container } = render(tree('insights'))
    expect(stripOf(container)).toBeNull()
    await flushViewportMeasurement()
  })

  it('names the strip distinctly from the nested landmark', async () => {
    render(tree('events'))
    expect(
      screen.getByRole('navigation', { name: 'Events sections tabs' })
    ).toBeInTheDocument()
    await flushViewportMeasurement()
  })

  it('marks the active secondary destination with aria-current', async () => {
    render(
      <Navigator value='drafts'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='drafts'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='all'>All events</Navigator.Item>
              <Navigator.Item value='drafts'>Drafts</Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    const nested = within(
      screen.getByRole('navigation', { name: 'Events sections' })
    )
    expect(nested.getByText('Drafts').closest('button')).toHaveAttribute(
      'aria-current',
      'page'
    )
    await flushViewportMeasurement()
  })

  it('finds items nested inside a group when collecting descendants', () => {
    const { container } = render(
      <Navigator value='/components/button'>
        <Navigator.Primary aria-label='Docs'>
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
      </Navigator>
    )
    // Scoped to the rail — Navigator.Primary also renders a mobile tab bar
    // with its own 'Components' link, which jsdom renders unconditionally.
    const rail = within(
      container.querySelector('[data-slot="navigator-rail"]') as HTMLElement
    )

    // The section is branch-active only if the walk saw the grouped child.
    expect(rail.getByRole('link', { name: /Components/ })).toHaveClass(
      'text-strong'
    )
    expect(rail.getByRole('link', { name: 'Button' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('renders a group label in the rail', () => {
    render(
      <Navigator value='/components/button'>
        <Navigator.Primary aria-label='Docs'>
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
      </Navigator>
    )

    expect(screen.getByText('Actions')).toBeVisible()
  })
})

describe('rail list semantics', () => {
  it('wraps loose primary items in a list', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
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

    const rail = document.querySelector('[data-slot="navigator-rail"]')!
    const list = rail.querySelector('ul')!
    expect(list.children).toHaveLength(2)
    expect(Array.from(list.children).every((li) => li.tagName === 'LI')).toBe(
      true
    )
  })

  it('nests a secondary inside its own primary list item', async () => {
    render(
      <Navigator value='/events/live'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Item value='/events/live' href='/events/live'>
                Live
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const rail = document.querySelector('[data-slot="navigator-rail"]')!
    const secondary = rail.querySelector('[data-slot="navigator-secondary"]')!
    const owningItem = secondary.closest('li')!
    expect(owningItem.querySelector('a[href="/events"]')).not.toBeNull()
    expect(
      secondary.querySelector('ul > li a[href="/events/live"]')
    ).not.toBeNull()
  })
})

describe('Navigator.Group', () => {
  it('renders a titled group without a key warning', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('associates its list with its title in the rail', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats', level: 2 })
    const list = document.querySelector('[data-slot="navigator-group-list"]')
    expect(list).not.toBeNull()
    expect(list).toHaveAttribute('aria-labelledby', title.id)
    expect(title.id).not.toBe('')
  })

  it('renders the title and the list as siblings, not nested', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()

    const title = screen.getByRole('heading', { name: 'Formats' })
    const list = document.querySelector('[data-slot="navigator-group-list"]')
    expect(list?.contains(title)).toBe(false)
    expect(title.nextElementSibling).toBe(list)
  })

  it('honours render on the title', async () => {
    render(
      <Navigator value='/events'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/events' href='/events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle render={(p) => <h3 {...p} />}>
                  Formats
                </Navigator.GroupTitle>
                <Navigator.Item value='/events/live' href='/events/live'>
                  Live
                </Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      screen.getByRole('heading', { name: 'Formats', level: 3 })
    ).toBeInTheDocument()
  })

  it('renders the title as text, not a heading, in the mobile strip', async () => {
    const { container } = render(
      <Navigator value='events'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='events'>
            Events
            <Navigator.Secondary aria-label='Events sections'>
              <Navigator.Group>
                <Navigator.GroupTitle>Formats</Navigator.GroupTitle>
                <Navigator.Item value='events-live'>Live</Navigator.Item>
              </Navigator.Group>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail'>
            <Pane.Header />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()

    const strip = container.querySelector(
      '[data-slot="navigator-secondary-strip"]'
    ) as HTMLElement
    expect(within(strip).queryByRole('heading')).toBeNull()
    expect(within(strip).getByText('Formats')).toBeInTheDocument()
  })
})

describe('Navigator.Primary group descent', () => {
  it('includes an item inside a Navigator.Group in the tab bar', async () => {
    render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
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
      '[data-slot="navigator-tab-bar"]'
    ) as HTMLElement
    expect(within(tabBar).getByRole('link', { name: 'A' })).toBeInTheDocument()
  })

  it('lifts the active secondary of an item inside a Navigator.Group', async () => {
    render(
      <Navigator value='/a/sub'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Group>
            <Navigator.GroupTitle>Section</Navigator.GroupTitle>
            <Navigator.Item value='/a'>
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
            <Pane.Header />
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const top = document.querySelector('[data-slot="pane"]')
    expect(
      top?.querySelector('[data-slot="navigator-secondary-strip"]')
    ).toBeTruthy()
  })
})

describe('Navigator.Panel', () => {
  const withPanel = (
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>
            Jordan Lee
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
    </Navigator>
  )

  // The mobile tab bar (Task 7's below-`md` presentation) folds the same
  // End item into a final tab labelled identically — scoped to the rail so
  // that unrelated surface isn't what these assertions are about.
  const railOf = (container: HTMLElement) =>
    within(
      container.querySelector('[data-slot="navigator-rail"]') as HTMLElement
    )

  it('makes the rail row a disclosure, not a link', async () => {
    const { container } = render(withPanel)
    await flushViewportMeasurement()
    const row = railOf(container).getByRole('button', { name: 'Jordan Lee' })
    expect(row).toHaveAttribute('aria-haspopup')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(
      railOf(container).queryByRole('link', { name: 'Jordan Lee' })
    ).toBeNull()
  })

  it('opens the panel content on the rail row', async () => {
    const { container } = render(withPanel)
    await flushViewportMeasurement()
    await userEvent.click(
      railOf(container).getByRole('button', { name: 'Jordan Lee' })
    )
    expect(await screen.findByText('Log out')).toBeInTheDocument()
  })

  it('ignores href when a panel is declared', async () => {
    const { container } = render(
      <Navigator value='/a'>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='account' href='/account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <p>Menu</p>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      railOf(container).queryByRole('link', { name: 'Account' })
    ).toBeNull()
    expect(
      railOf(container).getByRole('button', { name: 'Account' })
    ).toBeInTheDocument()
  })

  it('keeps the panel out of the row label', async () => {
    const { container } = render(withPanel)
    await flushViewportMeasurement()
    const row = railOf(container).getByRole('button', { name: 'Jordan Lee' })
    expect(row.textContent).toBe('Jordan Lee')
  })
})

describe('Navigator.Panel below md', () => {
  const nav = (onValueChange?: (next: string) => void) => (
    <Navigator value='/a' onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a' href='/a'>
          A
        </Navigator.Item>
        <Navigator.Item value='/b' href='/b'>
          B
        </Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>
            Jordan Lee
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='detail' current>
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  const tabBar = () =>
    document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

  it('gives the panel item a tab', async () => {
    render(nav())
    await flushViewportMeasurement()
    expect(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    ).toBeInTheDocument()
  })

  it('is a tab, not a link', async () => {
    render(nav())
    await flushViewportMeasurement()
    expect(
      within(tabBar()).queryByRole('link', { name: 'Jordan Lee' })
    ).toBeNull()
  })

  it('opens a full-screen pane rather than navigating, and mounts no dialog', async () => {
    const onValueChange = vi.fn()
    render(nav(onValueChange))
    await flushViewportMeasurement()
    await userEvent.click(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    )
    const paneWithContent = (await screen.findByText('Log out')).closest(
      '[data-slot="pane"]'
    ) as HTMLElement
    expect(paneWithContent).toHaveAttribute('data-stack-position', 'top')
    expect(paneWithContent).toHaveClass('md:hidden')
    expect(paneWithContent).toHaveAttribute('data-primary-nav', 'visible')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('marks its own tab expanded and current while open, not as a page', async () => {
    render(nav())
    await flushViewportMeasurement()
    const tab = within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    expect(tab).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(tab)
    expect(tab).toHaveAttribute('aria-expanded', 'true')
    expect(tab).toHaveAttribute('aria-current', 'true')
    expect(tab).not.toHaveAttribute('aria-current', 'page')
  })

  it('yields the route tab to the panel when it is the sole folded tab, and back on close', async () => {
    render(nav())
    await flushViewportMeasurement()
    const bar = tabBar()
    const routeTab = within(bar).getByRole('link', { name: 'A' })
    const panelTab = within(bar).getByRole('button', { name: 'Jordan Lee' })

    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    expect(panelTab).toHaveAttribute('aria-current', 'true')
    expect(routeTab).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)

    await userEvent.click(panelTab)
    expect(routeTab).toHaveAttribute('aria-current', 'page')
    expect(panelTab).not.toHaveAttribute('aria-current')
    expect(bar.querySelectorAll('[aria-current]')).toHaveLength(1)
  })

  it('tapping another tab clears the open panel', async () => {
    render(nav())
    await flushViewportMeasurement()
    await userEvent.click(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    )
    await screen.findByText('Log out')
    await userEvent.click(within(tabBar()).getByRole('link', { name: 'B' }))
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
  })

  it('tapping the panel tab again toggles the panel closed', async () => {
    render(nav())
    await flushViewportMeasurement()
    const tab = within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    await userEvent.click(tab)
    await screen.findByText('Log out')
    await userEvent.click(tab)
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
    expect(tab).toHaveAttribute('aria-expanded', 'false')
  })

  it('dismisses on Escape', async () => {
    render(nav())
    await flushViewportMeasurement()
    await userEvent.click(
      within(tabBar()).getByRole('button', { name: 'Jordan Lee' })
    )
    await screen.findByText('Log out')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Log out')).not.toBeInTheDocument()
  })

  it('opens the same pane from the overflow row without navigating', async () => {
    const onValueChange = vi.fn()
    render(
      <Navigator value='/a' onValueChange={onValueChange}>
        <Navigator.Primary aria-label='Main'>
          {['/a', '/b', '/c', '/d', '/e'].map((v) => (
            <Navigator.Item key={v} value={v} href={v}>
              {v}
            </Navigator.Item>
          ))}
          <Navigator.Item value='account'>
            Jordan Lee
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
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
    // Six items and no End pushes the panel item past the 5-tab cap, so it
    // folds alongside '/e' into the generated overflow pane.
    await userEvent.click(
      within(tabBar()).getByRole('button', { name: /More/ })
    )
    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]
    await userEvent.click(
      within(overflow as HTMLElement).getByRole('button', {
        name: 'Jordan Lee'
      })
    )
    const paneWithContent = (await screen.findByText('Log out')).closest(
      '[data-slot="pane"]'
    ) as HTMLElement
    expect(paneWithContent).toHaveAttribute('data-stack-position', 'top')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })
})

describe('Navigator.Panel + Navigator.Secondary precedence', () => {
  const railOf = (container: HTMLElement) =>
    within(
      container.querySelector('[data-slot="navigator-rail"]') as HTMLElement
    )
  const tabBarOf = (container: HTMLElement) =>
    within(
      container.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    )

  const withBoth = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/a'>
          A
          <Navigator.Secondary aria-label='A sections'>
            <Navigator.Item value='/a/sub' href='/a/sub'>
              Sub
            </Navigator.Item>
          </Navigator.Secondary>
          <Navigator.Panel aria-label='Menu'>
            <p>Menu</p>
          </Navigator.Panel>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('renders as a section, not a popover, when both are declared', async () => {
    const { container } = render(withBoth('/a'))
    await flushViewportMeasurement()
    // The section delegates to its first sub-page, so it's a link, not a
    // disclosure button — that's the point: no popover took over the row.
    const row = railOf(container).getByRole('link', { name: 'A' })
    expect(row.querySelector('svg')).toBeTruthy()
    expect(row).not.toHaveAttribute('aria-haspopup')
    expect(railOf(container).queryByText('Menu')).toBeNull()
  })

  it('keeps the declared sub-pages reachable', async () => {
    const { container } = render(withBoth('/a/sub'))
    await flushViewportMeasurement()
    expect(
      railOf(container).getByRole('link', { name: 'Sub' })
    ).toBeInTheDocument()
    expect(
      tabBarOf(container).getByRole('link', { name: 'A' })
    ).toHaveAttribute('href', '/a/sub')
  })

  it('warns once, naming the item, that the Panel is ignored', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(withBoth('/a'))
    await flushViewportMeasurement()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain("value='/a'")
    warn.mockRestore()
  })
})

describe('Navigator descendant-aware active matching', () => {
  const tree = (active: string) => (
    <Navigator value={active}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='components'>
          Components
          <Navigator.Secondary aria-label='Components pages'>
            <Navigator.Item value='button'>Button</Navigator.Item>
            <Navigator.Item value='card'>Card</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
        <Navigator.Item value='foundations'>
          Foundations
          <Navigator.Secondary aria-label='Foundations pages'>
            <Navigator.Item value='layout'>Layout</Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  const railItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) => el?.closest('[data-slot="navigator-rail"]'))

  it('marks a section branch-active when a Secondary descendant is current', async () => {
    render(tree('button'))
    // Branch-active section reads dark and bold and reveals its children.
    expect(railItem('Components')).toHaveClass('text-strong')
    expect(railItem('Components')).not.toHaveClass('intent-accent')
    expect(
      screen.getByRole('navigation', { name: 'Components pages' })
    ).toBeInTheDocument()
    await flushViewportMeasurement()
  })

  it('keeps a section reading current on a sub-route no Secondary declares', async () => {
    // `components/settings` sits under the section but is not one of its
    // declared destinations, so nothing below it is lit — the section would
    // otherwise drop to a flat header and the rail would read as though
    // nowhere is selected. Treatment only: `aria-current` stays exact.
    render(tree('components/settings'))
    const section = railItem('Components')
    // `data-current` is what the sliding pill measures, so this is the
    // assertion that the section actually reads as selected.
    expect(section).toHaveAttribute('data-current')
    expect(railItem('Button')).not.toHaveAttribute('data-current')
    // ...while the announcement stays with the exact page, i.e. nowhere here.
    expect(section).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('hands currency to a Secondary destination when one is active', async () => {
    // Exactly one item may carry the pill, or the indicator has two targets.
    render(tree('button'))
    expect(railItem('Button')).toHaveAttribute('data-current')
    expect(railItem('Components')).not.toHaveAttribute('data-current')
    expect(railItem('Button')).toHaveAttribute('aria-current', 'page')
    expect(railItem('Components')).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('gives aria-current to the exact descendant, not the branch section', async () => {
    render(tree('button'))
    expect(railItem('Button')).toHaveAttribute('aria-current', 'page')
    expect(railItem('Components')).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('marks the section mobile tab active when a descendant is current', async () => {
    const { container } = render(tree('button'))
    const bar = within(
      container.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    )
    expect(bar.getByRole('button', { name: 'Components' })).toHaveClass(
      'intent-accent'
    )
    expect(bar.getByRole('button', { name: 'Foundations' })).not.toHaveClass(
      'intent-accent'
    )
    await flushViewportMeasurement()
  })

  it('leaves a sibling section whose subtree lacks the active value inactive', async () => {
    render(tree('button'))
    expect(railItem('Foundations')).not.toHaveClass('intent-accent')
    expect(
      screen.queryByRole('navigation', { name: 'Foundations pages' })
    ).toBeNull()
    expect(screen.queryByText('Layout')).toBeNull()
    await flushViewportMeasurement()
  })
})

describe('Navigator route-prefix section matching', () => {
  // A section whose sub-pages live in a `Pane` of its own declares no
  // `Navigator.Secondary` at all, so its sub-routes are values the rail can
  // never match by equality. Prefix matching is what keeps the rail and the
  // tab bar lit on them.
  const paneSectionTree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
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

  const railItem = (label: string) =>
    screen
      .getAllByText(label)
      .map((el) => el.closest('[data-slot="navigator-item"]'))
      .find((el) => el?.closest('[data-slot="navigator-rail"]'))

  it('keeps an undeclared sub-route branch-active on its section', async () => {
    render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()

    expect(railItem('Components')).toHaveClass('text-strong')
    expect(railItem('Tokens')).not.toHaveClass('text-strong')
  })

  it('marks the section tab active on an undeclared sub-route', async () => {
    const { container } = render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()
    const bar = within(
      container.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement
    )

    expect(bar.getByRole('link', { name: 'Components' })).toHaveClass(
      'intent-accent'
    )
  })

  // Branch-active is not exact currency: the section is where you are, not
  // the page you are on, so nothing announces it as current.
  it('gives the section no aria-current on a sub-route', async () => {
    render(paneSectionTree('/components/forms'))
    await flushViewportMeasurement()

    expect(railItem('Components')).not.toHaveAttribute('aria-current')
  })

  const railSectionTree = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
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
    </Navigator>
  )

  it('reveals a rail section on an undeclared sub-route too', async () => {
    render(railSectionTree('/foundations/undeclared'))
    await flushViewportMeasurement()

    expect(railItem('Foundations')).toHaveClass('text-strong')
    expect(
      screen.getByRole('navigation', { name: 'Foundations pages' })
    ).toBeInTheDocument()
  })

  it('does not match a sibling whose value is only a string prefix', async () => {
    render(railSectionTree('/tokens-legacy'))
    await flushViewportMeasurement()

    expect(railItem('Tokens')).not.toHaveClass('text-strong')
  })
})

describe('Navigator.Primary direct-children warning', () => {
  it('warns when a non-Item element sits at a direct-child position', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <div>Not an item</div>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Navigator.Primary and Navigator.End only recognise Navigator.Item'
      )
    )
    warn.mockRestore()
    await flushViewportMeasurement()
  })

  it('stays quiet for Item and End children', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Navigator value='tickets'>
        <Navigator.Primary aria-label='Primary'>
          <Navigator.Item value='tickets'>Tickets</Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='account'>Account</Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
    await flushViewportMeasurement()
  })
})

describe('Navigator collapsed edge circles', () => {
  const tabBarOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="navigator-tab-bar"]')

  // The pane's scroll container is ScrollArea's viewport, not the <section>.
  const scrollerOf = (root: Document | HTMLElement) =>
    root.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

  // A three-primary bar with an End tab: A/B/C plus a final Account tab.
  const barTree = (active: string, onValueChange = vi.fn()) => (
    <Navigator value={active} onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Primary'>
        <Navigator.Item value='a'>A</Navigator.Item>
        <Navigator.Item value='b'>B</Navigator.Item>
        <Navigator.Item value='c'>C</Navigator.Item>
        <Navigator.End>
          <Navigator.Item value='account'>Account</Navigator.Item>
        </Navigator.End>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane role='list'>Content</Pane>
      </Navigator.Content>
    </Navigator>
  )

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
    const { container } = render(barTree('a'))
    await collapse(container)
    const bar = within(tabBarOf(container) as HTMLElement)

    const active = bar.getByRole('button', { name: 'A' })
    const final = bar.getByRole('button', { name: 'Account' })
    expect(active).toHaveClass('size-14')
    expect(active).toHaveAttribute('data-circle-side', 'left')
    expect(final).toHaveClass('size-14')
    expect(final).toHaveAttribute('data-circle-side', 'right')
    await flushViewportMeasurement()
  })

  it('scales the non-edge tabs away but keeps them in the AT tree', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const bar = within(tabBarOf(container) as HTMLElement)

    // Every destination is still reachable — no display:none, nothing unmounted.
    expect(bar.getAllByRole('button')).toHaveLength(4)
    expect(bar.getByRole('button', { name: 'B' })).toHaveClass('scale-0')
    expect(bar.getByRole('button', { name: 'C' })).toHaveClass('scale-0')
    await flushViewportMeasurement()
  })

  it('reserves an empty middle by translating the circles apart, not spacing them', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const bar = tabBarOf(container) as HTMLElement

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
    const bar = tabBarOf(container) as HTMLElement
    const pill = bar.querySelector('[data-slot="navigator-tab-bar-pill"]')!
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

  it('puts the first tab on the left and the active End tab on the right when the End tab is active', async () => {
    const { container } = render(barTree('account'))
    await collapse(container)
    const bar = within(tabBarOf(container) as HTMLElement)

    const first = bar.getByRole('button', { name: 'A' })
    const account = bar.getByRole('button', { name: 'Account' })
    // First tab takes the left so two circles always show; the active End tab
    // keeps the right and carries the current-page marker.
    expect(first).toHaveClass('size-14')
    expect(first).toHaveAttribute('data-circle-side', 'left')
    expect(account).toHaveClass('size-14')
    expect(account).toHaveAttribute('data-circle-side', 'right')
    expect(account).toHaveAttribute('aria-current', 'page')
    expect(first).not.toHaveAttribute('aria-current')
    await flushViewportMeasurement()
  })

  it('reads the active tab in the vivid accent while expanded', async () => {
    const { container } = render(barTree('a'))
    const bar = within(tabBarOf(container) as HTMLElement)
    const active = bar.getByRole('button', { name: 'A' })
    expect(active).toHaveClass('intent-accent', 'text-accent-11')
    expect(active.className).toContain('text-accent-11')
    await flushViewportMeasurement()
  })

  it('hides the circle tab label so only the icon shows', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const active = within(tabBarOf(container) as HTMLElement).getByRole(
      'button',
      { name: 'A' }
    )
    expect(within(active).getByText('A')).toHaveClass('sr-only')
    await flushViewportMeasurement()
  })

  it('gives the collapsed active circle the accent icon but no accent pill', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)
    const active = within(tabBarOf(container) as HTMLElement).getByRole(
      'button',
      { name: 'A' }
    )
    // Neutral round surface with an accent icon — the tinted pill is expanded-only.
    expect(active).toHaveClass('text-accent-11', 'bg-raised')
    expect(active.className).not.toContain('bg-[var(--intent-bg-subtle)]')
    await flushViewportMeasurement()
  })

  it('never reorders a tab to collapse it', async () => {
    // `order` can only change discretely, so pinning a circle to an end column
    // teleported it there before the translate could run. Every circle now
    // travels from the column it already holds — which is why it carries its
    // own index rather than being moved to a known one.
    const { container } = render(barTree('b'))
    await collapse(container)
    const bar = tabBarOf(container)!

    for (const tab of bar.querySelectorAll('[data-slot="navigator-item"]')) {
      expect(tab.className).not.toMatch(/(^|\s)-?order-/)
    }
    // The active tab is the second of four, and it stays the second.
    const left = bar.querySelector('[data-circle-side="left"]')!
    expect(left).toHaveAccessibleName('B')
    expect(left.getAttribute('style')).toContain('--navigator-tab-index: 1')
    await flushViewportMeasurement()
  })

  it('carries each circle to its edge on translate, from its own column', async () => {
    // The whole collapse geometry, pinned. jsdom has no layout, so the browser
    // probe owns the measurement — what this can guard is that the translate
    // that does the carrying is actually emitted. A component that assigned
    // the sides correctly and dropped these would otherwise pass everything.
    const { container } = render(barTree('b'))
    await collapse(container)
    const bar = tabBarOf(container)!

    const left = bar.querySelector('[data-circle-side="left"]')!
    const right = bar.querySelector('[data-circle-side="right"]')!

    expect(left).toHaveClass(
      '-translate-x-[calc(var(--navigator-tab-index)_*_var(--navigator-tab-col)_+_var(--navigator-tab-edge))]'
    )
    expect(right).toHaveClass(
      'translate-x-[calc((var(--navigator-tab-count)_-_1_-_var(--navigator-tab-index))_*_var(--navigator-tab-col)_+_var(--navigator-tab-edge))]'
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
    const bar = tabBarOf(container)!
    const track = bar.querySelector('[data-slot="navigator-tab-bar-track"]')!
    expect(track).toHaveClass('py-1')

    const expandedTab = bar.querySelector('[data-slot="navigator-item"]')!
    expect(expandedTab).toHaveClass('py-1.5')

    await collapse(container)
    // The track's own padding never changed, so nothing to transition.
    expect(track).toHaveClass('py-1')
    for (const tab of bar.querySelectorAll(
      '[data-slot="navigator-item"]:not([data-circle-side])'
    )) {
      expect(tab).toHaveClass('py-1.5')
    }
    await flushViewportMeasurement()
  })

  it('leaves the collapsed bar transparent to input in the middle', async () => {
    // The collapsed bar spans the full width but shows only two edge circles.
    // Everything between them must reach the page beneath — jsdom has no hit
    // testing, so this pins the mechanism: the bar itself takes no pointer
    // events and each circle puts them back.
    const { container } = render(barTree('a'))
    await collapse(container)

    const bar = tabBarOf(container)!
    expect(bar).toHaveClass('pointer-events-none')
    const circles = bar.querySelectorAll('[data-circle-side]')
    expect(circles).toHaveLength(2)
    for (const circle of circles) {
      expect(circle).toHaveClass('pointer-events-auto')
    }
    await flushViewportMeasurement()
  })

  it('leaves the expanded bar transparent to input outside the tabs, below five tabs', async () => {
    // `barTree` renders four tabs (A, B, C, Account) — one short of the five
    // that happen to make the hugging track exactly as wide as the bar. At
    // any lower count the bar's own box is wider than the track, so the bar
    // itself must not swallow input in that gutter while expanded — only the
    // hugging track (and, collapsed, each circle) should.
    const { container } = render(barTree('a'))
    await flushViewportMeasurement()

    const bar = tabBarOf(container)!
    expect(bar).toHaveClass('pointer-events-none')
    const track = bar.querySelector('[data-slot="navigator-tab-bar-track"]')!
    expect(track).toHaveClass('pointer-events-auto')
  })

  it('collapses a middle tab with scale, never a layout property', async () => {
    const { container } = render(barTree('a'))
    await collapse(container)

    const hidden = tabBarOf(container)!.querySelector(
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

    const bar = tabBarOf(container)!
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
    const bar = tabBarOf(container) as HTMLElement
    expect(bar).toHaveAttribute('data-collapsed', 'true')

    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))

    expect(bar).toHaveAttribute('data-collapsed', 'false')
    expect(scrollToSpy).not.toHaveBeenCalled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('stays expanded while the pane is still scrolled after reopening', async () => {
    const { container } = render(barTree('a'))
    const pane = await collapse(container)
    const bar = tabBarOf(container) as HTMLElement
    await userEvent.click(within(bar).getByRole('button', { name: 'A' }))

    // A further scroll-sync at the same still-scrolled position keeps it open.
    await scrollTo(pane, 80)
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })

  it('re-collapses when the user scrolls down again after reopening', async () => {
    const { container } = render(barTree('a'))
    const pane = await collapse(container)
    const bar = tabBarOf(container) as HTMLElement
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
    const bar = within(tabBarOf(container) as HTMLElement)

    await userEvent.click(bar.getByRole('button', { name: 'A' }))

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 })
    )
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('reopens on the active End circle when it sits on the right', async () => {
    const { container } = render(barTree('account'))
    await collapse(container)
    const bar = tabBarOf(container) as HTMLElement

    await userEvent.click(within(bar).getByRole('button', { name: 'Account' }))
    expect(bar).toHaveAttribute('data-collapsed', 'false')
  })

  it('navigates normally when a non-active tab is tapped while collapsed', async () => {
    const onValueChange = vi.fn()
    const { container } = render(barTree('a', onValueChange))
    await collapse(container)

    const bar = within(tabBarOf(container) as HTMLElement)
    await userEvent.click(bar.getByRole('button', { name: 'Account' }))

    expect(onValueChange).toHaveBeenCalledWith('account')
  })
})

describe('Navigator active-tab tap: scroll-on-landing vs navigate-up', () => {
  const tabBarOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="navigator-tab-bar"]')

  // The pane's scroll container is ScrollArea's viewport, not the <section>.
  const scrollerOf = (root: Document | HTMLElement) =>
    root.querySelector<HTMLElement>('[data-slot="pane-viewport"]')!

  // A section with its own landing route (`/components`) and one sub-page, so
  // the active tab can be on the landing or on a sub-page of the same section.
  const sectionTree = (active: string, onValueChange = vi.fn()) => (
    <Navigator value={active} onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Primary'>
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
    const bar = within(tabBarOf(container) as HTMLElement)

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
    const components = within(tabBarOf(container) as HTMLElement).getByRole(
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
    const bar = within(tabBarOf(container) as HTMLElement)

    await userEvent.click(bar.getByRole('link', { name: 'Tokens' }))

    expect(onValueChange).toHaveBeenCalledWith('/tokens')
  })
})

describe('section nav in the pane header', () => {
  it('renders the active section nav in the top pane header', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
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
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    const top = document.querySelectorAll('[data-slot="pane"]')[1]
    expect(
      top?.querySelector('[data-slot="navigator-secondary-strip"]')
    ).toBeTruthy()
  })

  it('does not duplicate the strip into a non-top pane header', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item value='/foundations/colors'>
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>
            <Pane.Header />
            List
          </Pane>
          <Pane role='detail' current>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    await flushViewportMeasurement()
    expect(
      document.querySelectorAll('[data-slot="navigator-secondary-strip"]')
    ).toHaveLength(1)
  })

  it('draws no header at all when there is no section nav to host', async () => {
    render(
      <Navigator value='/'>
        <Navigator.Primary aria-label='Docs'>
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
    // An element that renders nothing is not the same as no chrome — a header
    // with neither would be ~24px of empty sticky bar.
    expect(document.querySelector('[data-slot="pane-header"]')).toBeNull()
  })

  // Panes stay mounted as the stack moves, so the header's measurement effect
  // has to follow its own visibility rather than its mount.
  it('moves the published header height as the top of the stack moves', async () => {
    const tree = (current: boolean) => (
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
            Foundations
            <Navigator.Secondary aria-label='Foundations pages'>
              <Navigator.Item value='/foundations/colors'>
                Colors
              </Navigator.Item>
            </Navigator.Secondary>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='list'>
            <Pane.Header />
            List
          </Pane>
          <Pane role='detail' current={current}>
            <Pane.Header />
            Detail
          </Pane>
        </Navigator.Content>
      </Navigator>
    )
    const heights = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>('[data-slot="pane"]')
      ).map((pane) => pane.style.getPropertyValue('--pane-header-height'))

    const { rerender } = render(tree(true))
    await flushViewportMeasurement()
    // jsdom measures 0, but the property's presence is what sticky content
    // offsets against.
    expect(heights()).toEqual(['', '0px'])

    rerender(tree(false))
    await flushViewportMeasurement()

    expect(heights()).toEqual(['0px', ''])
  })
})

describe('active-tab tap on a Pane stack', () => {
  const tree = (onValueChange = vi.fn()) => (
    <Navigator value='/' onValueChange={onValueChange}>
      <Navigator.Primary aria-label='Main'>
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
    container.querySelector<HTMLElement>('[data-slot="navigator-tab-bar"]')!

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
  const tabBarOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="navigator-tab-bar"]')

  const tree = () => (
    <Navigator value='/'>
      <Navigator.Primary aria-label='Main'>
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

    const bar = tabBarOf(container)!
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

// Pins the bug report's acceptance criteria directly, so a future change that
// silently reopens any one of them fails a named test rather than waiting to
// be rediscovered by a consumer. Criterion 1 — a pane nested inside a
// wrapper receives a stack position — is Task 13's
// `describe('pane registration through a wrapper', ...)` in Pane.test.tsx;
// not duplicated here.
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

  // Criterion 5: primaryNav and the mobile section nav resolve against the
  // true top pane, even when that pane is wrapped.
  it('resolves primaryNav and the section nav against a wrapped top pane', async () => {
    render(
      <Navigator value='/foundations/colors'>
        <Navigator.Primary aria-label='Docs'>
          <Navigator.Item value='/foundations' icon={<FakeIcon />}>
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
    const top = document.querySelectorAll('[data-slot="pane"]')[1]
    expect(top).toHaveAttribute('data-primary-nav', 'hidden')
    expect(
      top?.querySelector('[data-slot="navigator-secondary-strip"]')
    ).toBeTruthy()
    expect(
      document.querySelector('[data-slot="navigator-tab-bar"]')
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
          <Navigator.Secondary aria-label='Token pages'>
            <Navigator.Item value='/tokens/color' href='/tokens/color'>
              Color
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  const railLink = (name: string) =>
    within(
      document.querySelector('[data-slot="navigator-rail"]') as HTMLElement
    ).getByRole('link', { name })

  it('starts every section on its declared href', async () => {
    render(nav('/components'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens')
  })

  it('retargets a section you have left to where you left it', async () => {
    const { rerender } = render(nav('/components'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/components/button'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens/color')
  })

  it('leaves the section you are in on its declared href', async () => {
    const { rerender } = render(nav('/tokens/color'))
    await flushViewportMeasurement()
    rerender(nav('/tokens/color'))
    await flushViewportMeasurement()
    expect(railLink('Tokens')).toHaveAttribute('href', '/tokens')
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

  // A panel item has no Secondary, so `isBranchActive` can still light it up
  // via the route-prefix clause when a page mounts beneath its value outside
  // the declared tree — that must not make it a section for memory purposes.
  describe('panel items', () => {
    const navWithPanel = (value: string) => (
      <Navigator value={value}>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/a' href='/a'>
            A
          </Navigator.Item>
          <Navigator.Item value='/account'>
            Account
            <Navigator.Panel aria-label='Account menu'>
              <p>Menu</p>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.Primary>
      </Navigator>
    )

    const tabBarOf = () =>
      document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

    it('does not turn a panel tab into a link after leaving a route mounted beneath it', async () => {
      const { rerender } = render(navWithPanel('/account/billing'))
      await flushViewportMeasurement()
      rerender(navWithPanel('/a'))
      await flushViewportMeasurement()
      expect(
        within(tabBarOf()).queryByRole('link', { name: 'Account' })
      ).toBeNull()
      expect(
        within(tabBarOf()).getByRole('button', { name: 'Account' })
      ).toBeInTheDocument()
    })

    it('never gives the panel tab an href, so the Map never held its value', async () => {
      const { rerender } = render(navWithPanel('/account/billing'))
      await flushViewportMeasurement()
      rerender(navWithPanel('/a'))
      await flushViewportMeasurement()
      const tab = within(tabBarOf())
        .getByText('Account')
        .closest('[data-slot="navigator-item"]')
      expect(tab).not.toHaveAttribute('href')
    })
  })
})

describe('a panel item is not a page', () => {
  const tabBarOf = () =>
    document.querySelector('[data-slot="navigator-tab-bar"]') as HTMLElement

  const nav = (value: string) => (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Item value='/home' href='/home'>
          Home
        </Navigator.Item>
        <Navigator.Item value='/account'>
          Account
          <Navigator.Panel aria-label='Account'>
            <List>
              <List.Item title='Log out' />
            </List>
          </Navigator.Panel>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )

  it('does not announce a panel tab as the current page', async () => {
    render(nav('/account/billing'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('button', { name: 'Account' })
    expect(tab).not.toHaveAttribute('aria-current', 'page')
  })

  it('still announces a real section as the current page', async () => {
    render(nav('/home'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('link', { name: 'Home' })
    expect(tab).toHaveAttribute('aria-current', 'page')
  })

  it('still announces an open panel as expanded, not current', async () => {
    render(nav('/home'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('button', { name: 'Account' })
    await userEvent.click(tab)
    expect(tab).toHaveAttribute('aria-expanded', 'true')
    expect(tab).toHaveAttribute('aria-current', 'true')
    expect(tab).not.toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not render a folded panel item as current in the overflow list', async () => {
    const navWithOverflow = (value: string) => (
      <Navigator value={value}>
        <Navigator.Primary aria-label='Main' tabs={['/home']}>
          <Navigator.Item value='/home' href='/home'>
            Home
          </Navigator.Item>
          <Navigator.Item value='/account'>
            Account
            <Navigator.Panel aria-label='Account'>
              <List>
                <List.Item title='Log out' />
              </List>
            </Navigator.Panel>
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Pane role='detail' current>
            Detail
          </Pane>
          <Navigator.Overflow>
            <Navigator.OverflowItems />
          </Navigator.Overflow>
        </Navigator.Content>
      </Navigator>
    )

    render(navWithOverflow('/account/billing'))
    await flushViewportMeasurement()
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    const overflow = document.querySelectorAll('[data-slot="pane"]')[1]!
    const item = within(overflow as HTMLElement).getByRole('button', {
      name: 'Account'
    })
    expect(item).not.toHaveAttribute('aria-current')
  })

  it('does not announce a lone End panel tab as the current page', async () => {
    // No rail overflow, one End item: `generatesPane` is false, so this tab
    // takes the destination branch — the shape a lone `Navigator.End` panel
    // produces. It still carries `aria-expanded` (false, since the panel
    // isn't open) because a panel tab is a disclosure regardless of which
    // branch renders it — only `aria-current='page'` is what must never fire.
    const navWithEndPanel = (value: string) => (
      <Navigator value={value}>
        <Navigator.Primary aria-label='Main'>
          <Navigator.Item value='/home' href='/home'>
            Home
          </Navigator.Item>
          <Navigator.End>
            <Navigator.Item value='/account'>
              Account
              <Navigator.Panel aria-label='Account'>
                <List>
                  <List.Item title='Log out' />
                </List>
              </Navigator.Panel>
            </Navigator.Item>
          </Navigator.End>
        </Navigator.Primary>
      </Navigator>
    )

    render(navWithEndPanel('/account/billing'))
    await flushViewportMeasurement()
    const tab = within(tabBarOf()).getByRole('button', { name: 'Account' })
    expect(tab).toHaveAttribute('aria-expanded', 'false')
    expect(tab).not.toHaveAttribute('aria-current', 'true')
    expect(tab).not.toHaveAttribute('aria-current', 'page')
  })
})

describe('indicator track offsetParent guard', () => {
  // `useSlidingIndicator` measures via `offsetLeft`/`offsetTop` up the
  // `offsetParent` chain rather than `getBoundingClientRect()`, precisely
  // because that survives a `translate`/`scale` in the collapse animation —
  // but only because every track below is `position: relative`, so it is
  // itself an `offsetParent`. jsdom always reports a null `offsetParent`, so
  // that regression can't be caught live here; this guards the one thing
  // that keeps it from resurfacing — none of the three tracks silently loses
  // `relative` and falls back to the transform-inclusive rect path.
  it('keeps every indicator track position: relative', () => {
    expect(navigatorTabBarTrackVariants()).toContain('relative')
    expect(navigatorRailViewportVariants()).toContain('relative')
    expect(navigatorSecondaryStripViewportVariants()).toContain('relative')
  })
})
