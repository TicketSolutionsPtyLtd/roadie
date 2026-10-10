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

/** jsdom keeps scrollTop but never scrolls; this sets it and fires `scroll` as a browser would. */
export function scrollViewport(viewport: HTMLElement, top: number) {
  viewport.scrollTop = top
  fireEvent.scroll(viewport)
}

export function rowLayoutInputs() {
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
