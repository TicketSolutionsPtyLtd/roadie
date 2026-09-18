import {
  type ReactElement,
  StrictMode,
  use,
  useLayoutEffect,
  useRef
} from 'react'

import { act, render, within } from '@testing-library/react'
import { type Root, hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { Pane } from '../Pane'
import { PaneContext } from '../Pane/PaneContext'
import { renderPaneColumnsCss } from '../Pane/paneColumns'
import {
  FakeIcon,
  flushViewportMeasurement,
  paneColumnsRulesOf,
  panesShownAt,
  restoreNavigation,
  setNavigation,
  testBrand
} from './testUtils'

function Docs({
  value,
  showList,
  override = false
}: {
  value: string
  showList?: boolean
  override?: boolean
}) {
  const primary = (
    <Navigator.Primary aria-label='Docs'>
      {testBrand}
      <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
        Home
      </Navigator.Item>
      <Navigator.Item
        value='/components'
        href='/components'
        icon={<FakeIcon />}
      >
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
            <Navigator.Item value='/components/input' href='/components/input'>
              Input
            </Navigator.Item>
          </Navigator.Group>
        </Navigator.Secondary>
      </Navigator.Item>
    </Navigator.Primary>
  )
  return (
    <Navigator value={value} showList={showList}>
      {primary}
      <Navigator.Content>
        {override ? (
          <Navigator.SecondaryPane value='/components'>
            <p>Promo</p>
            <Navigator.SecondaryItems showDescriptions={false} />
          </Navigator.SecondaryPane>
        ) : null}
        <Pane>
          <Pane.Header />
          Detail
        </Pane>
        <Pane column='inspector' aria-label='On this page'>
          Contents
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

const serverRender = (ui: ReactElement) => {
  const container = document.createElement('div')
  container.innerHTML = renderToString(ui)
  document.body.append(container)
  return container
}

const paneOf = (container: HTMLElement, column: string) =>
  container.querySelector<HTMLElement>(
    `[data-slot="pane"][data-column="${column}"]`
  )

const positions = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="pane"]'),
    (pane) => [
      pane.dataset.navigatorSecondary ?? pane.dataset.column,
      pane.dataset.stackPosition ?? null
    ]
  )

afterEach(() => {
  document.body.replaceChildren()
})

describe('Navigator server render', () => {
  it("renders the destination's list pane, rows and all, on its own route", () => {
    const container = serverRender(<Docs value='/components' />)
    const list = paneOf(container, 'list')!
    expect(list).toHaveAttribute('data-navigator-secondary', '/components')
    expect(
      within(list).getByRole('heading', { name: 'Components' })
    ).toBeInTheDocument()
    expect(within(list).getByText('Actions')).toBeInTheDocument()
    expect(within(list).getByRole('link', { name: 'Button' })).toHaveAttribute(
      'href',
      '/components/button'
    )
    expect(
      within(list).getByRole('link', { name: 'Input' })
    ).toBeInTheDocument()
    expect(positions(container)).toEqual([
      ['/components', 'top'],
      ['detail', 'ahead'],
      ['inspector', null]
    ])
  })

  it('puts the list behind the detail on a sub-page', () => {
    const container = serverRender(<Docs value='/components/button' />)
    expect(positions(container)).toEqual([
      ['/components', 'behind'],
      ['detail', 'top'],
      ['inspector', null]
    ])
    expect(
      within(paneOf(container, 'list')!).getByRole('link', { name: 'Button' })
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(paneOf(container, 'detail')!).getByLabelText(/^Back\b/)
    ).toHaveAttribute('href', '/components')
  })

  it('gives the detail no Back link where it is the root', () => {
    for (const ui of [
      <Docs key='route' value='/components' />,
      <Docs key='list' value='/components/button' showList />,
      <Docs key='none' value='/' />
    ]) {
      const container = serverRender(ui)
      expect(
        within(paneOf(container, 'detail')!).queryByLabelText(/^Back\b/)
      ).toBeNull()
      container.remove()
    }
  })

  it('puts the list on top of a sub-page when showList is set', () => {
    const container = serverRender(<Docs value='/components/button' showList />)
    expect(positions(container)).toEqual([
      ['/components', 'top'],
      ['detail', 'ahead'],
      ['inspector', null]
    ])
  })

  it('renders only the detail on a route with no secondary nav', () => {
    const container = serverRender(<Docs value='/' />)
    expect(positions(container)).toEqual([
      ['detail', 'top'],
      ['inspector', null]
    ])
  })

  it('renders a SecondaryPane override in place of the generated pane', () => {
    const container = serverRender(<Docs value='/components' override />)
    expect(
      container.querySelectorAll('[data-navigator-secondary]')
    ).toHaveLength(1)
    const list = paneOf(container, 'list')!
    expect(within(list).getByText('Promo')).toBeInTheDocument()
    expect(
      within(list).getByRole('link', { name: 'Input' })
    ).toBeInTheDocument()
    expect(positions(container)).toEqual([
      ['/components', 'top'],
      ['detail', 'ahead'],
      ['inspector', null]
    ])

    const subPage = serverRender(<Docs value='/components/button' override />)
    expect(positions(subPage)).toEqual([
      ['/components', 'behind'],
      ['detail', 'top'],
      ['inspector', null]
    ])
  })
})

describe('Navigator hydration', () => {
  let root: Root | null = null

  afterEach(() => {
    act(() => root?.unmount())
    root = null
    vi.restoreAllMocks()
  })

  it.each([
    ['/components', undefined],
    ['/components/button', undefined],
    ['/components/button', true],
    ['/', undefined]
  ])(
    'hydrates %s (showList %s) without a mismatch or a position change',
    async (value, showList) => {
      const ui = (
        <StrictMode>
          <Docs value={value} showList={showList} />
        </StrictMode>
      )
      const host = serverRender(ui)
      const before = positions(host)
      const backOf = () =>
        paneOf(host, 'detail')!
          .querySelector('[aria-label^="Back"]')
          ?.getAttribute('href') ?? null
      const back = backOf()
      const listNode = paneOf(host, 'list')
      const error = vi.spyOn(console, 'error')
      const recoverable = vi.fn()

      await act(async () => {
        root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
      })
      await flushViewportMeasurement()

      expect(recoverable).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(positions(host)).toEqual(before)
      expect(backOf()).toBe(back)
      expect(paneOf(host, 'list')).toBe(listNode)
    }
  )
})

function PageRootDocs({ value }: { value: string }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/' href='/' icon={<FakeIcon />}>
          Home
          <Navigator.Secondary aria-label='Home pages' overview>
            <Navigator.Item
              value='/overview/philosophy'
              href='/overview/philosophy'
            >
              Philosophy
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          <Pane.Header />
          Detail
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator server render of an overview', () => {
  it('renders no list pane on the root, where the page is top with no Back', () => {
    const container = serverRender(<PageRootDocs value='/' />)
    expect(positions(container)).toEqual([['detail', 'top']])
    expect(
      within(paneOf(container, 'detail')!).queryByLabelText(/^Back\b/)
    ).toBeNull()
  })

  it('renders the list behind the page on a sub-page, with Back to the root', () => {
    const container = serverRender(
      <PageRootDocs value='/overview/philosophy' />
    )
    expect(positions(container)).toEqual([
      ['/', 'behind'],
      ['detail', 'top']
    ])
    expect(
      within(paneOf(container, 'detail')!).getByLabelText(/^Back\b/)
    ).toHaveAttribute('href', '/')
  })

  it.each(['/', '/overview/philosophy'])(
    'hydrates %s without a mismatch or a position change',
    async (value) => {
      const ui = (
        <StrictMode>
          <PageRootDocs value={value} />
        </StrictMode>
      )
      const host = serverRender(ui)
      const before = positions(host)
      const error = vi.spyOn(console, 'error')
      const recoverable = vi.fn()
      let root: Root | null = null
      await act(async () => {
        root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
      })
      await flushViewportMeasurement()
      expect(recoverable).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
      expect(positions(host)).toEqual(before)
      act(() => root?.unmount())
      vi.restoreAllMocks()
    }
  )
})

const depths = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-slot="pane"]')).map((pane) => [
    pane.getAttribute('data-navigator-secondary') ??
      pane.getAttribute('data-column'),
    pane.getAttribute('data-depth'),
    pane.hasAttribute('data-reached')
  ])

function ThreeLevels({ value }: { value: string }) {
  return (
    <Navigator value={value}>
      <Navigator.Primary aria-label='Docs'>
        {testBrand}
        <Navigator.Item value='/tickets' href='/tickets' icon={<FakeIcon />}>
          Tickets
          <Navigator.Secondary aria-label='Events'>
            <Navigator.Item value='/tickets/glamping' href='/tickets/glamping'>
              Glamping
            </Navigator.Item>
          </Navigator.Secondary>
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          <Pane.Header />
          Glamping
        </Pane>
        <Pane depth={2}>
          <Pane.Header backHref='/tickets/glamping' backLabel='Glamping' />
          Sam
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

describe('Navigator server render of depths', () => {
  it('writes declared and default depths, and the reveal, before any pane registers', () => {
    const container = serverRender(<ThreeLevels value='/tickets/glamping' />)
    expect(depths(container)).toEqual([
      ['/tickets', '0', true],
      ['detail', '1', true],
      ['detail', '2', true]
    ])
    expect(
      container.querySelector('[data-slot="navigator-panes"]')
    ).not.toHaveAttribute('data-reveal')
    const revealed = serverRender(<ThreeLevels value='/tickets' />)
    expect(
      revealed.querySelector('[data-slot="navigator-panes"]')
    ).toHaveAttribute('data-reveal')
  })

  it('gives the depth-1 pane the destination route and label, and the deeper pane its own from backHref', () => {
    const container = serverRender(<ThreeLevels value='/tickets/glamping' />)
    const [glamping, sam] = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-slot="pane"][data-column="detail"]'
      )
    )
    expect(within(glamping!).getByLabelText('Back to Tickets')).toHaveAttribute(
      'href',
      '/tickets'
    )
    expect(within(glamping!).getByLabelText('Close')).toHaveAttribute(
      'href',
      '/tickets'
    )
    const back = within(sam!).getByLabelText('Back to Glamping')
    expect(back).toHaveAttribute('href', '/tickets/glamping')
    expect(back).toHaveAttribute('data-slot', 'icon-button')
    expect(back).toHaveTextContent('')
    expect(within(sam!).getByLabelText('Close')).toHaveAttribute(
      'href',
      '/tickets/glamping'
    )
    expect(sam!.querySelector('[data-slot="pane-header"]')).toHaveClass(
      '[display:var(--pane-edge)]'
    )
  })

  it('hydrates without a mismatch or a depth change', async () => {
    const ui = (
      <StrictMode>
        <ThreeLevels value='/tickets/glamping' />
      </StrictMode>
    )
    const host = serverRender(ui)
    const before = depths(host)
    const error = vi.spyOn(console, 'error')
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
    })
    await flushViewportMeasurement()
    expect(recoverable).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(depths(host)).toEqual(before)
    act(() => root?.unmount())
    vi.restoreAllMocks()
  })
})

describe('a declared depth out of document order', () => {
  const OutOfOrder = () => (
    <StrictMode>
      <Navigator value='/a'>
        <Navigator.Content>
          <Pane column='list'>List</Pane>
          <Pane depth={2}>Sub</Pane>
          <Pane>Detail</Pane>
        </Navigator.Content>
      </Navigator>
    </StrictMode>
  )

  it('writes the declared depths and hydrates to the same top', async () => {
    const host = serverRender(<OutOfOrder />)
    const before = depths(host)
    expect(before.map(([, depth]) => depth)).toEqual(['0', '2', '1'])
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, <OutOfOrder />, {
        onRecoverableError: recoverable
      })
    })
    await flushViewportMeasurement()
    expect(recoverable).not.toHaveBeenCalled()
    expect(depths(host)).toEqual(before)
    expect(positions(host).map(([, position]) => position)).toEqual([
      'behind',
      'top',
      'behind'
    ])
    act(() => root?.unmount())
  })
})

describe('an overview with its own backHref', () => {
  const PageFirst = () => (
    <Navigator value='/a'>
      <Navigator.Content>
        <Pane>
          <Pane.Header backHref='/elsewhere' />
          Page
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
  const tierRules = paneColumnsRulesOf(renderPaneColumnsCss()).filter(
    (rule) =>
      rule.body.includes('--pane-back') &&
      rule.selector.startsWith('[data-slot="navigator-panes"][data-level="0"]')
  )

  it('never draws Back or Close, before or after hydration', async () => {
    const host = serverRender(<PageFirst />)
    const pane = paneOf(host, 'detail')!
    expect(pane).toHaveAttribute('data-depth', '1')
    const drawn = tierRules
      .filter((rule) => pane.matches(rule.selector))
      .map((rule) => rule.body)
    // Stacked, and columns: a lone pane has no third column to take.
    expect(drawn).toHaveLength(2)
    for (const body of drawn) {
      expect(body).toContain(
        '--pane-back: none; --pane-close: none; --pane-edge: none;'
      )
    }
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, <PageFirst />)
    })
    await flushViewportMeasurement()
    expect(pane).toHaveAttribute('data-depth', '0')
    expect(pane.querySelector('[data-slot="pane-back"]')).toBeNull()
    expect(pane.querySelector('[data-slot="pane-close"]')).toBeNull()
    act(() => root?.unmount())
  })
})

describe('a lone pane that is not reached', () => {
  const Lone = () => (
    <Navigator value='/a'>
      <Navigator.Content>
        <Pane reached={false}>Solo</Pane>
      </Navigator.Content>
    </Navigator>
  )

  const stackedRules = paneColumnsRulesOf(renderPaneColumnsCss()).filter(
    (rule) =>
      rule.body.includes('--pane-back') &&
      rule.selector.startsWith(
        '[data-slot="navigator-panes"][data-level="0"]'
      ) &&
      !rule.conditions.some((condition) => condition.startsWith('@container'))
  )
  const stackedBodyOf = (pane: Element) =>
    stackedRules
      .filter((rule) => pane.matches(rule.selector))
      .map((rule) => rule.body)

  it('is on screen in the server HTML', () => {
    const host = serverRender(<Lone />)
    const pane = paneOf(host, 'detail')!
    expect(pane).toHaveAttribute('data-depth', '1')
    expect(pane).not.toHaveAttribute('data-reached')
    expect(panesShownAt(1)).toEqual(['detail'])
    expect(stackedBodyOf(pane)).toEqual([
      expect.stringContaining('translate: 0 0;')
    ])
  })

  it('stays put through hydration, so nothing slides in', async () => {
    const host = serverRender(<Lone />)
    const pane = paneOf(host, 'detail')!
    const seen: string[][] = [stackedBodyOf(pane)]
    const observer = new MutationObserver(() => seen.push(stackedBodyOf(pane)))
    observer.observe(host, { attributes: true, subtree: true })
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, <Lone />, { onRecoverableError: recoverable })
    })
    await flushViewportMeasurement()
    observer.disconnect()
    expect(recoverable).not.toHaveBeenCalled()
    expect(pane).toHaveAttribute('data-depth', '0')
    for (const bodies of seen) {
      expect(bodies).toEqual([expect.stringContaining('translate: 0 0;')])
    }
    expect(panesShownAt(1)).toEqual(['detail'])
    act(() => root?.unmount())
  })
})

describe('More open from the first render', () => {
  function DepthProbe({ log }: { log: (string | null)[] }) {
    use(PaneContext)
    const ref = useRef<HTMLSpanElement>(null)
    useLayoutEffect(() => {
      log.push(
        ref.current
          ?.closest('[data-slot="pane"]')
          ?.getAttribute('data-depth') ?? null
      )
    })
    return <span ref={ref} data-slot='depth-probe' />
  }

  const PageFirst = ({ log }: { log: (string | null)[] }) => (
    <Navigator value='/a' showMore>
      <Navigator.Primary aria-label='Main'>
        {testBrand}
        {['/a', '/b', '/c', '/d', '/e', '/f'].map((v) => (
          <Navigator.Item key={v} value={v} href={v} icon={<FakeIcon />}>
            {v}
          </Navigator.Item>
        ))}
      </Navigator.Primary>
      <Navigator.Content>
        <Pane>
          <DepthProbe log={log} />
        </Pane>
      </Navigator.Content>
    </Navigator>
  )

  it('keeps a page-first detail beside More from its first client commit', async () => {
    const log: (string | null)[] = []
    render(<PageFirst log={log} />)
    await flushViewportMeasurement()
    await flushViewportMeasurement()
    expect(log).not.toContain('0')
    expect(log.at(-1)).toBe('1')
    expect(panesShownAt(2)).toEqual(['detail', 'More'])
  })

  it('keeps it there through hydration', async () => {
    const serverLog: (string | null)[] = []
    const host = serverRender(<PageFirst log={serverLog} />)
    expect(
      host
        .querySelector('[data-slot="depth-probe"]')
        ?.closest('[data-slot="pane"]')
    ).toHaveAttribute('data-depth', '1')
    const log: (string | null)[] = []
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, <PageFirst log={log} />, {
        onRecoverableError: recoverable
      })
    })
    await flushViewportMeasurement()
    await flushViewportMeasurement()
    expect(recoverable).not.toHaveBeenCalled()
    expect(log).not.toContain('0')
    expect(log.at(-1)).toBe('1')
    expect(panesShownAt(2)).toEqual(['detail', 'More'])
    act(() => root?.unmount())
  })
})

function Nested({ value }: { value: string }) {
  return (
    <Navigator value='/a'>
      <Navigator.Content>
        <Pane column='list'>Outer list</Pane>
        <Pane>
          <Navigator value={value}>
            <Navigator.Content>
              <Pane column='list'>Inner list</Pane>
              <Pane>Inner detail</Pane>
            </Navigator.Content>
          </Navigator>
        </Pane>
      </Navigator.Content>
    </Navigator>
  )
}

// A slide on a first paint is the bug the exit mechanism could reintroduce: the
// row would hold a pane that never had a place on screen to leave from.
describe('nothing slides in or out on a server render or its hydration', () => {
  const MOTION = [
    '[data-exiting]',
    '[data-exit]',
    '[data-pushing]',
    '[data-instant]'
  ].join(', ')
  const moving = (host: HTMLElement) =>
    Array.from(host.querySelectorAll(MOTION), (node) => node.outerHTML)

  it.each([
    ['a deep route', <Docs key='deep' value='/components/button' />],
    ['a destination route', <Docs key='root' value='/components' />],
    [
      'an overview sub-page',
      <PageRootDocs key='page' value='/overview/philosophy' />
    ],
    ['a nested Navigator', <Nested key='nested' value='/x/1' />]
  ])('leaves %s still, through hydration', async (_, ui) => {
    const tree = <StrictMode>{ui}</StrictMode>
    const host = serverRender(tree)
    expect(moving(host)).toEqual([])

    const error = vi.spyOn(console, 'error')
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, tree, { onRecoverableError: recoverable })
    })
    await flushViewportMeasurement()

    expect(recoverable).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    expect(moving(host)).toEqual([])
    act(() => root?.unmount())
    vi.restoreAllMocks()
  })
})

// Restoring reads the Navigation API, which the server has not got, and a store
// a fresh document starts empty. Neither may reach the render.
describe('scroll restoration stays out of the server render', () => {
  it('renders a deep route with no history entry to read', () => {
    const was = Object.getOwnPropertyDescriptor(window, 'navigation')
    restoreNavigation(undefined)
    const container = serverRender(<Docs value='/components/button' />)
    expect(positions(container)).toEqual([
      ['/components', 'behind'],
      ['detail', 'top'],
      ['inspector', null]
    ])
    restoreNavigation(was)
  })

  it('hydrates a deep route with an entry no pane has been scrolled on', async () => {
    const was = Object.getOwnPropertyDescriptor(window, 'navigation')
    setNavigation({ currentEntry: { key: 'fresh-load' } })
    const ui = (
      <StrictMode>
        <Docs value='/components/button' />
      </StrictMode>
    )
    const host = serverRender(ui)
    const error = vi.spyOn(console, 'error')
    const recoverable = vi.fn()
    let root: Root | null = null
    await act(async () => {
      root = hydrateRoot(host, ui, { onRecoverableError: recoverable })
    })
    await flushViewportMeasurement()
    expect(recoverable).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    for (const viewport of host.querySelectorAll<HTMLElement>(
      '[data-slot="pane-viewport"]'
    )) {
      expect(viewport.scrollTop).toBe(0)
    }
    act(() => root?.unmount())
    restoreNavigation(was)
    vi.restoreAllMocks()
  })
})
