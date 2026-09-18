import type { ReactNode } from 'react'

import { act, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { Navigator } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { forgetPaneScroll } from '../Pane/paneScroll'

// ScrollArea measures in a microtask outside act().
export async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

export const FakeIcon = ({
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
    data-classname={className ?? ''}
    className={className}
    data-slot={dataSlot}
  />
)

export const primaryOf = (orientation: 'vertical' | 'horizontal') =>
  document.querySelector<HTMLElement>(
    `[data-slot="navigator-primary"][data-orientation="${orientation}"]`
  )!

// Follows no link, so jsdom never logs a navigation it can't perform.
export const StubLink: RoadieLinkComponent = ({ href, children, ...rest }) => (
  <a
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

export const withStubLink = (ui: ReactNode) => (
  <RoadieLinkProvider Link={StubLink}>{ui}</RoadieLinkProvider>
)

// An element, not a component, so Primary's type walk still recognises it.
export const testBrand = <Navigator.Brand>Brand</Navigator.Brand>

type ObserverArgs = ConstructorParameters<typeof IntersectionObserver>
type SentinelWatch = {
  root: Element | Document | null
  callback: ObserverArgs[0]
  targets: Set<Element>
  observer: IntersectionObserver
}
const sentinelWatches = new Set<SentinelWatch>()

class SentinelIntersectionObserver {
  readonly root: Element | Document | null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = [0]
  private readonly watch: SentinelWatch
  constructor(callback: ObserverArgs[0], options?: ObserverArgs[1]) {
    this.root = options?.root ?? null
    this.watch = {
      root: this.root,
      callback,
      targets: new Set(),
      observer: this as unknown as IntersectionObserver
    }
    sentinelWatches.add(this.watch)
  }
  observe(target: Element) {
    this.watch.targets.add(target)
  }
  unobserve(target: Element) {
    this.watch.targets.delete(target)
  }
  disconnect() {
    sentinelWatches.delete(this.watch)
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

/** Lets `scrollViewport` drive the panes' scroll sentinels; jsdom has no layout to intersect. */
export function withScrollSentinels() {
  let original: typeof IntersectionObserver
  beforeEach(() => {
    original = globalThis.IntersectionObserver
    globalThis.IntersectionObserver =
      SentinelIntersectionObserver as unknown as typeof IntersectionObserver
  })
  afterEach(() => {
    globalThis.IntersectionObserver = original
    sentinelWatches.clear()
  })
}

/** Scrolls a pane viewport to `top` as a browser would: sentinels report, then `scroll` fires. */
export function scrollViewport(viewport: HTMLElement, top: number) {
  let current = top
  Object.defineProperty(viewport, 'scrollTop', {
    configurable: true,
    get: () => current,
    set: (next: number) => {
      current = next
      reportScroll(viewport, next)
    }
  })
  reportScroll(viewport, top)
}

function reportScroll(viewport: HTMLElement, top: number) {
  for (const watch of sentinelWatches) {
    if (watch.root !== viewport) continue
    const entries = Array.from(watch.targets, (target) => {
      const bottom = Number((target as HTMLElement).dataset.scrollAt) - top
      return {
        target,
        isIntersecting: bottom >= 0,
        rootBounds: { top: 0, height: VIEWPORT_HEIGHT },
        boundingClientRect: { bottom }
      } as unknown as IntersectionObserverEntry
    })
    watch.callback(entries, watch.observer)
  }
  fireEvent.scroll(viewport)
}

const VIEWPORT_HEIGHT = 600

/** The first report a browser sends for a pane an ancestor hides: no box, so every rect reads zero. */
export function reportUnrenderedSentinels(viewport: HTMLElement) {
  for (const watch of sentinelWatches) {
    if (watch.root !== viewport) continue
    const entries = Array.from(watch.targets, (target) => {
      return {
        target,
        isIntersecting: false,
        rootBounds: { top: 0, height: 0 },
        boundingClientRect: { bottom: 0 }
      } as unknown as IntersectionObserverEntry
    })
    watch.callback(entries, watch.observer)
  }
}

/** What the pane stylesheet lays a level-0 row out from; the browser suite pins the layout of each shape. */
export function rowShape() {
  const row = document.querySelector<HTMLElement>(
    '[data-slot="navigator-panes"][data-level="0"]'
  )!
  const panes = row.querySelectorAll<HTMLElement>(
    '[data-slot="pane"][data-stack][data-level="0"]'
  )
  return {
    overflow: row.hasAttribute('data-overflow'),
    reveal: row.hasAttribute('data-reveal'),
    panes: Array.from(panes, (pane) =>
      [
        pane.hasAttribute('data-overflow')
          ? 'More'
          : (pane.dataset.navigatorSecondary ?? pane.dataset.column),
        pane.dataset.depth,
        pane.hasAttribute('data-reached') ? 'reached' : null
      ]
        .filter(Boolean)
        .join(' ')
    )
  }
}

/** Puts a Navigation API on `window`, or takes one away, without leaving a hole. */
export function setNavigation(value: unknown) {
  Object.defineProperty(window, 'navigation', {
    configurable: true,
    writable: true,
    value
  })
}

export function restoreNavigation(was: PropertyDescriptor | undefined) {
  if (was) Object.defineProperty(window, 'navigation', was)
  else delete (window as { navigation?: unknown }).navigation
}

/** jsdom has no Navigation API; this gives the tests entries to move between. */
export function withHistoryEntries() {
  let minted = 0
  let was: PropertyDescriptor | undefined
  const entry = { key: 'entry-0' }
  beforeEach(() => {
    minted = 0
    entry.key = 'entry-0'
    was = Object.getOwnPropertyDescriptor(window, 'navigation')
    setNavigation({ currentEntry: entry })
    forgetPaneScroll()
  })
  afterEach(() => {
    restoreNavigation(was)
    forgetPaneScroll()
  })
  return {
    goTo() {
      minted += 1
      entry.key = `entry-${minted}`
      return entry.key
    },
    traverseTo(key: string) {
      entry.key = key
    },
    get key() {
      return entry.key
    }
  }
}

/** Lets the rAF-throttled scroll readers run: a pane takes its place down a frame late. */
export async function flushScrollFrame() {
  await act(async () => {
    await new Promise((settle) => requestAnimationFrame(() => settle(null)))
  })
}
