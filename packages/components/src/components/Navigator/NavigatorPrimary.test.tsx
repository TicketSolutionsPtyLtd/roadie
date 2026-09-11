import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navigator } from '.'
import { FakeIcon, flushViewportMeasurement, primaryOf } from './testUtils'

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
})
