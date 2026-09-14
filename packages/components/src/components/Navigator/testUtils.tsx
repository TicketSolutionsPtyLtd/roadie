import type { ReactNode } from 'react'

import { act, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { Navigator } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { columnTier, renderPaneColumnsCss } from '../Pane/paneColumns'

// A ScrollArea Viewport measures in a microtask scheduled from a layout
// effect, outside act(); flushing it here keeps synchronous tests quiet.
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

// Records what it observes and reports only when `scrollViewport` says so.
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

/** Scrolls a pane viewport to `top`: its sentinels report as a browser's would, then it fires `scroll`. */
export function scrollViewport(viewport: HTMLElement, top: number) {
  Object.defineProperty(viewport, 'scrollTop', {
    value: top,
    configurable: true,
    writable: true
  })
  for (const watch of sentinelWatches) {
    if (watch.root !== viewport) continue
    const entries = Array.from(watch.targets, (target) => {
      const bottom = Number((target as HTMLElement).dataset.scrollAt) - top
      return {
        target,
        isIntersecting: bottom >= 0,
        rootBounds: { top: 0 },
        boundingClientRect: { bottom }
      } as unknown as IntersectionObserverEntry
    })
    watch.callback(entries, watch.observer)
  }
  fireEvent.scroll(viewport)
}

export type PaneColumnsRule = {
  selector: string
  body: string
  conditions: string[]
}

export function paneColumnsRulesOf(css: string): PaneColumnsRule[] {
  const text = css.slice(css.indexOf('@layer components {'))
  const rules: PaneColumnsRule[] = []
  const conditions: string[] = []
  const token = /([^{}]*)([{}])/g
  let match: RegExpExecArray | null
  while ((match = token.exec(text))) {
    const [, before = '', brace] = match
    const prelude = before.trim()
    if (brace === '}') {
      conditions.pop()
    } else if (prelude.startsWith('@')) {
      conditions.push(prelude)
    } else {
      const close = text.indexOf('}', token.lastIndex)
      rules.push({
        selector: prelude,
        body: text.slice(token.lastIndex, close).trim(),
        conditions: [...conditions]
      })
      token.lastIndex = close + 1
    }
  }
  return rules
}

/** The level-0 stack panes the generated stylesheet would put on screen at `columns` columns. */
export function panesShownAt(columns: number) {
  const rules = paneColumnsRulesOf(renderPaneColumnsCss())
  const tier = rules.filter(
    (rule) =>
      rule.body.includes('--pane-back') &&
      rule.selector.startsWith(
        '[data-slot="navigator-panes"][data-level="0"]'
      ) &&
      (columns === 1
        ? !rule.conditions.some((c) => c.startsWith('@container'))
        : rule.conditions.includes(
            `@container panes (width >= ${columnTier(columns)}rem)`
          ))
  )
  const hiding = rules.filter((rule) => rule.body === 'display: none;')
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="pane"][data-stack][data-level="0"]'
    )
  )
    .filter(
      (pane) =>
        !hiding.some((rule) => pane.matches(rule.selector)) &&
        tier.some(
          (rule) =>
            pane.matches(rule.selector) &&
            !rule.body.includes('visibility: hidden')
        )
    )
    .map((pane) =>
      pane.hasAttribute('data-overflow')
        ? 'More'
        : (pane.dataset.navigatorSection ?? pane.dataset.role)
    )
}
