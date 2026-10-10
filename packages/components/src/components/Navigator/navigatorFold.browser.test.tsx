import { type ReactNode, useState } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Navigator } from '.'
import roadieCss from '../../../vitest.browser.css?inline'
import { useStylesheet } from '../Pane/testUtils'
import { FakeIcon, withStubLink } from './testUtils'

const WIDE = 1280

let removeStylesheet = () => {}
beforeEach(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await page.viewport(WIDE, 800)
})
afterEach(() => {
  cleanup()
  removeStylesheet()
  document.documentElement.removeAttribute('data-navigator-expanded')
})
afterAll(() => page.viewport(1920, 1080))

const frames = (count = 4) =>
  new Promise<void>((settle) => {
    const step = (left: number) =>
      left === 0 ? settle() : requestAnimationFrame(() => step(left - 1))
    step(count)
  })

async function settle() {
  await frames()
  for (const animation of document.getAnimations()) animation.finish()
  await frames()
}

const vertical = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="navigator-primary"][data-orientation="vertical"]'
  )!
const horizontal = () =>
  document.querySelector<HTMLElement>(
    '[data-slot="navigator-primary"][data-orientation="horizontal"]'
  )!
const region = (name: string) =>
  vertical().querySelector<HTMLElement>(
    `[data-slot="navigator-primary-${name}"]`
  )!
const cluster = () => within(region('cluster'))
const moreTile = () => cluster().getByRole('button', { name: 'More' })
const tiles = () => cluster().queryAllByRole('link')
const overflowPane = () =>
  document.querySelector<HTMLElement>('[data-slot="pane"][id]')!
const panesRow = () => document.querySelector('[data-slot="navigator-panes"]')

/** Sizes the window so the cluster gets `rem` of height; the rail is as tall as the window. */
async function fitCluster(rem: number) {
  await settle()
  const viewport = region('cluster').querySelector(
    '[data-slot="navigator-primary-cluster-viewport"]'
  )!
  const chrome = window.innerHeight - viewport.getBoundingClientRect().height
  await page.viewport(WIDE, Math.round(rem * 16 + chrome))
  await settle()
}

type SixProps = {
  value?: string
  lowGroup?: boolean
  onValueChange?: (next: string) => void
}

function Six({ value = '/a', lowGroup = false, onValueChange }: SixProps) {
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
    </Navigator>
  )
}

function RoutedSix() {
  const [value, setValue] = useState('/a')
  return <Six value={value} onValueChange={setValue} />
}

function Expandable(props: {
  expanded?: boolean
  defaultExpanded?: boolean
  expandedFromDocument?: boolean
}) {
  return (
    <Navigator value='/Alpha' {...props}>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Logo</Navigator.Brand>
        <Navigator.Group>
          <Navigator.GroupTitle>Docs</Navigator.GroupTitle>
          {['Alpha', 'Beta', 'Gamma'].map((name) => (
            <Navigator.Item
              key={name}
              value={`/${name}`}
              href={`/${name}`}
              icon={<FakeIcon />}
            >
              {name}
            </Navigator.Item>
          ))}
        </Navigator.Group>
        <Navigator.ExpandToggle />
      </Navigator.Primary>
    </Navigator>
  )
}

function WithMenu() {
  return (
    <Navigator value='/a'>
      <Navigator.Primary aria-label='Main'>
        <Navigator.Brand>Logo</Navigator.Brand>
        {['/a', '/b', '/c', '/d', '/e'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
        <Navigator.Item
          value='account'
          icon={<FakeIcon />}
          visibilityPriority='low'
        >
          Account
          <Navigator.Menu>
            <Navigator.MenuItem>Sign out</Navigator.MenuItem>
          </Navigator.Menu>
        </Navigator.Item>
      </Navigator.Primary>
    </Navigator>
  )
}

function WithSecondary({ expanded }: { expanded?: boolean }) {
  const [value, setValue] = useState('/a')
  return (
    <Navigator value={value} onValueChange={setValue} expanded={expanded}>
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
        {['/a', '/b', '/c', '/d'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
    </Navigator>
  )
}

function MoreWithSecondary({ expanded = false }: { expanded?: boolean }) {
  return (
    <Navigator value='/s' expanded={expanded}>
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
        {['/a', '/b', '/c'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
    </Navigator>
  )
}

const show = (ui: ReactNode) => render(withStubLink(ui))

describe('the vertical navigation folds into More', () => {
  // 12rem fits two tiles and More; 18.5rem fits four loose tiles and More.
  it.each([
    ['its lowest-ranked items', () => <Six />, 12, ['/a', '/b'], true, '/a'],
    [
      'the current destination, lighting More',
      () => <Six value='/f' />,
      12,
      ['/a', '/b'],
      true,
      'More'
    ],
    [
      'a capsule whose items all go',
      () => <Six lowGroup />,
      18.5,
      ['/a', '/b', '/c', '/d'],
      true,
      '/a'
    ],
    [
      'nothing while expanded',
      () => <Expandable defaultExpanded />,
      2.5,
      ['Alpha', 'Beta', 'Gamma'],
      false,
      'Alpha'
    ],
    [
      'nothing while the document says expanded',
      () => {
        document.documentElement.setAttribute('data-navigator-expanded', '')
        return <Expandable expandedFromDocument expanded={false} />
      },
      2.5,
      ['Alpha', 'Beta', 'Gamma'],
      false,
      'Alpha'
    ]
  ])('%s', async (_, ui, rem, shown, folds, lit) => {
    show(ui())
    await fitCluster(rem)
    const capsules = [
      ...region('cluster').querySelectorAll(
        '[data-slot="navigator-primary-cluster-track"] > [data-slot="navigator-capsule"]'
      )
    ]
    const more = cluster().queryByRole('button', { name: 'More' })

    expect(tiles().map((tile) => tile.textContent)).toEqual(shown)
    for (const capsule of capsules) {
      expect(capsule.querySelector('a, button')).not.toBeNull()
    }
    if (folds) expect(capsules.at(-1)).toContainElement(more)
    else expect(more).toBeNull()
    expect(region('cluster').querySelector('[data-current]')).toHaveTextContent(
      lit
    )
  })

  it('opens More from its tile, listing the folded rows in duotone', async () => {
    show(<Six />)
    await fitCluster(12)
    const icon = () => moreTile().querySelector('svg')!
    expect(icon().getBoundingClientRect().width).toBe(24)
    // Phosphor draws duotone's second tone as a 0.2-opacity path.
    expect(icon().querySelector('[opacity="0.2"]')).not.toBeNull()

    await userEvent.click(moreTile())

    expect(moreTile()).toHaveAttribute('aria-expanded', 'true')
    expect(icon().getAnimations()).not.toHaveLength(0)
    const rows = overflowPane().querySelector<HTMLElement>(
      '[data-slot="navigator-overflow-items"].max-md\\:hidden'
    )!
    expect(within(rows).getAllByRole('link')).toHaveLength(4)
    for (const row of rows.querySelectorAll('[data-testid="fake-icon"]')) {
      expect(row).toHaveAttribute('data-weight', 'duotone')
    }
  })

  it.each([
    ['a current tile', '/a', () => cluster().getByRole('link', { name: '/a' })],
    [
      'a current pinned tile',
      '/me',
      () => within(region('pinned')).getByRole('link', { name: 'Me' })
    ]
  ])('takes the pill from %s while More is open', async (_, value, held) => {
    show(<Six value={value} />)
    await fitCluster(12)
    expect(held()).toHaveAttribute('data-current')

    await userEvent.click(moreTile())

    expect(moreTile()).toHaveAttribute('data-current')
    expect(held()).not.toHaveAttribute('data-current')
    expect(held()).toHaveAttribute('aria-current', 'page')
  })

  it('scrolls an open More to the top when its tile is chosen again, and stays open', async () => {
    show(<Six />)
    await fitCluster(12)
    await userEvent.click(moreTile())
    const scrollTo = vi.spyOn(
      overflowPane().querySelector<HTMLElement>('[data-slot="pane-viewport"]')!,
      'scrollTo'
    )

    await userEvent.click(moreTile())

    expect(moreTile()).toHaveAttribute('aria-expanded', 'true')
    expect(moreTile()).toHaveAttribute('data-current')
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})

describe('an open More closes', () => {
  it.each([
    [
      'choosing a cluster tile',
      () => userEvent.click(cluster().getByRole('link', { name: '/b' })),
      () => cluster().getByRole('link', { name: '/b' })
    ],
    [
      'choosing the current tile',
      () => userEvent.click(cluster().getByRole('link', { name: '/a' })),
      () => cluster().getByRole('link', { name: '/a' })
    ],
    [
      'choosing the pinned tile',
      () =>
        userEvent.click(
          within(region('pinned')).getByRole('link', { name: 'Me' })
        ),
      () => within(region('pinned')).getByRole('link', { name: 'Me' })
    ],
    [
      'Escape, back on its tile',
      () => userEvent.keyboard('{Escape}'),
      () => cluster().getByRole('link', { name: '/a' })
    ]
  ])('on %s', async (name, choose, lit) => {
    show(<RoutedSix />)
    await fitCluster(12)
    await userEvent.click(moreTile())
    expect(panesRow()).toHaveAttribute('data-overflow')

    await choose()

    expect(moreTile()).toHaveAttribute('aria-expanded', 'false')
    expect(moreTile()).not.toHaveAttribute('data-current')
    expect(lit()).toHaveAttribute('data-current')
    expect(panesRow()).not.toHaveAttribute('data-overflow')
    if (name.includes('Escape')) expect(moreTile()).toHaveFocus()
  })

  it('when the value changes from outside, as on Back', async () => {
    const { rerender } = show(<Six />)
    await fitCluster(12)
    await userEvent.click(moreTile())

    rerender(withStubLink(<Six value='/b' />))

    expect(moreTile()).toHaveAttribute('aria-expanded', 'false')
    expect(cluster().getByRole('link', { name: '/b' })).toHaveAttribute(
      'data-current'
    )
  })

  it('and brings back the chosen destination’s own pane', async () => {
    show(<WithSecondary />)
    await fitCluster(12)
    await userEvent.click(moreTile())
    expect(document.querySelector('[data-navigator-secondary]')).toBeNull()

    await userEvent.click(cluster().getByRole('link', { name: 'Secondary' }))

    expect(
      document.querySelector('[data-navigator-secondary="/s"]')
    ).toBeInTheDocument()
    expect(panesRow()).not.toHaveAttribute('data-overflow')
  })

  it.each([
    ['expanding unfolds every item', true],
    ['the window grows until every item fits', false]
  ])('when %s', async (_, expand) => {
    const { rerender } = show(<MoreWithSecondary />)
    await fitCluster(12)
    await userEvent.click(moreTile())
    expect(document.querySelector('[data-navigator-secondary]')).toBeNull()

    if (expand) rerender(withStubLink(<MoreWithSecondary expanded />))
    else await page.viewport(WIDE, 1000)
    await settle()

    expect(cluster().queryByRole('button', { name: 'More' })).toBeNull()
    expect(document.querySelector('[aria-expanded="true"]')).toBeNull()
    expect(
      document.querySelector('[data-navigator-secondary="/s"]')
    ).toHaveAttribute('data-stack-position', 'top')

    if (expand) rerender(withStubLink(<MoreWithSecondary />))
    else await fitCluster(12)
    await settle()
    expect(moreTile()).toHaveAttribute('aria-expanded', 'false')
  })

  it('but stays open when the vertical navigation hides and the bar still folds', async () => {
    show(<Six />)
    await fitCluster(12)
    await userEvent.click(moreTile())

    await page.viewport(390, 844)
    await settle()

    expect(
      within(horizontal()).getByRole('button', { name: 'More' })
    ).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('a menu item folded into More', () => {
  it('opens one menu from a row folded in both orientations', async () => {
    show(<WithMenu />)
    await fitCluster(18.5)
    await userEvent.click(moreTile())
    const [barRows, railRows] = overflowPane().querySelectorAll<HTMLElement>(
      '[data-slot="navigator-overflow-items"]'
    )

    await userEvent.click(
      within(railRows!).getByRole('button', { name: 'Account' })
    )

    await screen.findByRole('menu')
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(
      within(barRows!).getByRole('button', { name: 'Account', hidden: true })
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('gives the pill back when its open menu’s tile folds away', async () => {
    show(<WithMenu />)
    await fitCluster(30)
    const a = cluster().getByRole('link', { name: '/a' })
    await userEvent.click(cluster().getByRole('button', { name: 'Account' }))
    await screen.findByRole('menu')
    expect(a).not.toHaveAttribute('data-current')

    await fitCluster(18.5)

    expect(cluster().queryByRole('button', { name: 'Account' })).toBeNull()
    expect(a).toHaveAttribute('data-current')
    expect(
      within(horizontal()).getByRole('link', { name: '/a', hidden: true })
    ).toHaveAttribute('data-current')
  })
})

describe('collapsing the vertical navigation', () => {
  it('folds once, as it collapses, against the height the cluster settles at', async () => {
    const { rerender } = show(<Expandable expanded />)
    // Expanded, 12rem; collapsed, the toggle row takes 3rem, which fits one tile and More.
    await fitCluster(12)
    expect(tiles()).toHaveLength(3)
    const counts = new Set<number>()
    const watch = new MutationObserver(() => counts.add(tiles().length))
    watch.observe(region('cluster'), { childList: true, subtree: true })

    rerender(withStubLink(<Expandable expanded={false} />))
    expect(tiles()).toHaveLength(1)
    await settle()
    watch.disconnect()

    expect(tiles()).toHaveLength(1)
    expect(moreTile()).toBeInTheDocument()
    expect([...counts].filter((count) => count !== 3)).toEqual([1])
  })
})

describe('the More tile’s label', () => {
  it('shows on hover', async () => {
    show(<Six />)
    await fitCluster(12)

    await userEvent.hover(moreTile())

    expect(
      await screen.findByText(
        'More',
        { selector: '[data-slot="tooltip-popup"]' },
        { timeout: 2000 }
      )
    ).toBeInTheDocument()
  })

  it('stays shut while its pane is open', async () => {
    show(<Six />)
    await fitCluster(12)
    await userEvent.click(moreTile())
    await userEvent.unhover(moreTile())
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    await userEvent.hover(moreTile())
    vi.advanceTimersByTime(1500)
    vi.useRealTimers()
    await frames()

    expect(document.querySelector('[data-slot="tooltip-popup"]')).toBeNull()
  })
})
