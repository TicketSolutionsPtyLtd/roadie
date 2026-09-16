import type { ReactNode } from 'react'

import { act, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { Navigator } from '.'
import {
  type RoadieLinkComponent,
  RoadieLinkProvider
} from '../../providers/RoadieLinkProvider'
import { columnTier, renderPaneColumnsCss } from '../Pane/paneColumns'
import { forgetPaneScroll } from '../Pane/paneScroll'

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

/** Scrolls a pane viewport to `top`: its sentinels report as a browser's would, then it fires `scroll`. Writing `scrollTop` afterwards does the same. */
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

const compileCondition = (condition: string) => {
  const query = condition.match(
    /^@container panes \(width (>=|<) ([\d.]+)rem\)/
  )
  if (!query) return () => true
  const value = Number(query[2])
  return query[1] === '>='
    ? (contentRem: number) => contentRem >= value
    : (contentRem: number) => contentRem < value
}

type CompiledRule = {
  rule: PaneColumnsRule
  holds: (contentRem: number) => boolean
}

// Cached per sweep: re-parsing and re-matching every 1px step was the slowest test.
const candidatesByLevel = new WeakMap<
  PaneColumnsRule[],
  Map<number, CompiledRule[]>
>()
const candidateRulesFor = (rules: PaneColumnsRule[], level: number) => {
  let byLevel = candidatesByLevel.get(rules)
  if (!byLevel) {
    byLevel = new Map()
    candidatesByLevel.set(rules, byLevel)
  }
  let candidates = byLevel.get(level)
  if (!candidates) {
    const prefix = `[data-slot="navigator-panes"][data-level="${level}"]`
    candidates = rules
      .filter(
        (rule) =>
          rule.body.includes('--pane-back') && rule.selector.startsWith(prefix)
      )
      .map((rule) => {
        const conditions = rule.conditions.map(compileCondition)
        return {
          rule,
          holds: (contentRem: number) =>
            conditions.every((holds) => holds(contentRem))
        }
      })
    byLevel.set(level, candidates)
  }
  return candidates
}

const matchesByPane = new WeakMap<
  Element,
  WeakMap<PaneColumnsRule[], Map<number, boolean[]>>
>()
const matchFlagsFor = (
  rules: PaneColumnsRule[],
  pane: Element,
  level: number,
  candidates: CompiledRule[]
) => {
  let byRules = matchesByPane.get(pane)
  if (!byRules) {
    byRules = new WeakMap()
    matchesByPane.set(pane, byRules)
  }
  let byLevel = byRules.get(rules)
  if (!byLevel) {
    byLevel = new Map()
    byRules.set(rules, byLevel)
  }
  let flags = byLevel.get(level)
  if (!flags) {
    flags = candidates.map(({ rule }) => pane.matches(rule.selector))
    byLevel.set(level, flags)
  }
  return flags
}

/** The column rule that wins for a level's stack pane at a content width: pane rules share a specificity, so the last that applies. */
export function paneRuleAt(
  rules: PaneColumnsRule[],
  pane: Element,
  contentRem: number,
  level = 0
) {
  const candidates = candidateRulesFor(rules, level)
  const flags = matchFlagsFor(rules, pane, level, candidates)
  let result: PaneColumnsRule | undefined
  for (const [index, candidate] of candidates.entries()) {
    if (flags[index] && candidate.holds(contentRem)) result = candidate.rule
  }
  return result
}

/** The level-0 stack panes the generated stylesheet would put on screen where `columns` columns first fit. */
export function panesShownAt(columns: number) {
  const rules = paneColumnsRulesOf(renderPaneColumnsCss())
  const hiding = rules.filter(
    (rule) =>
      rule.body === 'display: none !important;' &&
      !rule.selector.includes('[data-role="inspector"]')
  )
  if (
    hiding.some((rule) => rule.conditions.some((c) => !c.startsWith('@layer')))
  ) {
    throw new Error(
      'panesShownAt reads display: none from unconditional rules only'
    )
  }
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="pane"][data-stack][data-level="0"]'
    )
  )
    .filter((pane) => {
      const rule = paneRuleAt(rules, pane, columnTier(columns))
      return (
        !hiding.some((hides) => pane.matches(hides.selector)) &&
        rule !== undefined &&
        !rule.body.includes('visibility: hidden')
      )
    })
    .map((pane) =>
      pane.hasAttribute('data-overflow')
        ? 'More'
        : (pane.dataset.navigatorSection ?? pane.dataset.role)
    )
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
