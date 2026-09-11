import { StrictMode } from 'react'

import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NAVIGATOR_EXPANDED_SCOPE } from '@oztix/roadie-core/navigator'

import { Navigator } from '.'
import { FakeIcon, flushViewportMeasurement, primaryOf } from './testUtils'
import {
  navigatorCapsuleVariants,
  navigatorGroupTitleVariants,
  navigatorItemLabelClass,
  navigatorItemVariants,
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
  lowGroup = false
}: {
  value?: string
  lowGroup?: boolean
}) {
  return (
    <Navigator value={value}>
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

  it('keeps group titles for screen readers only while collapsed', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    expect(within(region('cluster')).getByText('Extra')).toHaveClass('sr-only')
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

  it('renders More duotone at size-6 and its rows duotone at size-5', async () => {
    const user = userEvent.setup()
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const more = within(region('cluster')).getByRole('button', { name: 'More' })
    const moreIcon = more.querySelector('svg')!
    expect(moreIcon).toHaveClass('size-6')
    // Phosphor draws duotone's second tone as a 0.2-opacity path.
    expect(moreIcon.querySelector('[opacity="0.2"]')).not.toBeNull()
    await user.click(more)
    const rowIcons = document.querySelectorAll(
      '[data-slot="navigator-overflow-items"] [data-testid="fake-icon"]'
    )
    expect(rowIcons.length).toBeGreaterThan(0)
    for (const icon of rowIcons) {
      expect(icon).toHaveAttribute('data-weight', 'duotone')
      expect(icon).toHaveClass('size-5')
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
  it('puts the More capsule last in the cluster', async () => {
    render(<Six />)
    await flushViewportMeasurement()
    reportClusterHeight(192)
    const content = region('cluster').querySelector(
      '[data-slot="scroll-area-content"]'
    )!
    const last = content.lastElementChild as HTMLElement
    expect(last).toHaveAttribute('data-slot', 'navigator-capsule')
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

function Expandable(props: {
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (next: boolean) => void
  expandedFromDocument?: boolean
}) {
  return (
    <Navigator value='/a' {...props}>
      <Navigator.Primary aria-label='Main'>
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
        <Navigator.ExpandToggle placement='pinned' />
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
    const toggle = within(region('pinned')).getByRole('button', {
      name: 'Expand sidebar'
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', vertical().id)
    await user.click(toggle)
    expect(vertical()).toHaveAttribute('data-expanded')
    expect(toggle).toHaveAccessibleName('Collapse sidebar')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })

  it('draws the toggle icon duotone at size-6, subtle', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    const toggle = within(region('pinned')).getByRole('button', {
      name: 'Expand sidebar'
    })
    const icon = toggle.querySelector('svg')!
    expect(icon).toHaveClass('size-6')
    expect(icon.querySelector('[opacity="0.2"]')).not.toBeNull()
    expect(toggle).toHaveClass('text-subtle')
  })

  it('is controlled by expanded and reports changes', async () => {
    const user = userEvent.setup()
    const onExpandedChange = vi.fn()
    render(<Expandable expanded onExpandedChange={onExpandedChange} />)
    await flushViewportMeasurement()
    await user.click(
      within(region('pinned')).getByRole('button', {
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
          <Navigator.Item value='/a' href='/a'>
            Outer
          </Navigator.Item>
        </Navigator.Primary>
        <Navigator.Content>
          <Navigator value='/x'>
            <Navigator.Primary aria-label='Inner'>
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
      navigatorGroupTitleVariants()
    ].join(' ')
    expect(classes).toContain('navigator-expanded:w-60')
    expect(classes).toContain('navigator-expanded:not-sr-only')
    expect(classes).not.toMatch(/\[html\[|data-\[expanded|expanded=false/)
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

  it('never renders the toggle on the phone bar', async () => {
    render(<Expandable />)
    await flushViewportMeasurement()
    expect(
      within(horizontal()).queryByRole('button', { name: /sidebar/ })
    ).toBeNull()
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
      within(region('pinned')).getByRole('button', {
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
      within(region('pinned')).getByRole('button', { name: 'Expand sidebar' })
    )
    expect(document.documentElement).toHaveAttribute('data-navigator-expanded')
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
      within(region('pinned')).getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument()
  })
})
