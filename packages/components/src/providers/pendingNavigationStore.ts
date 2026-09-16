'use client'

import { isDev } from '../utils/isDev'
import type {
  PendingNavigation,
  PendingNavigationStore
} from './PendingNavigationContext'

/** A navigation that never lands stops being reported. */
export const PENDING_CEILING = 10_000

export function createPendingNavigationStore(): PendingNavigationStore {
  const listeners = new Set<() => void>()
  // Tokens, not a count: the ceiling drops every hold at once, and a release
  // that arrives after that has nothing left to take.
  const holds = new Set<symbol>()
  let wait: { startedAt: number; settled: boolean } | null = null
  let shown: PendingNavigation | null = null
  let ceiling: ReturnType<typeof setTimeout> | undefined
  let warned = false

  const publish = () => {
    // A landed route nothing is holding is not a wait any more.
    if (wait?.settled === true && holds.size === 0) wait = null
    if (wait === null) clearTimeout(ceiling)
    const next =
      wait === null
        ? null
        : shown?.startedAt === wait.startedAt
          ? shown
          : { startedAt: wait.startedAt }
    if (next === shown) return
    shown = next
    for (const listener of [...listeners]) listener()
  }

  // The ceiling belongs to the wait, not to the click: a pane left reporting
  // `pending` for ever gives up on the same terms a navigation does.
  const open = (startedAt: number, settled: boolean) => {
    wait = { startedAt, settled }
    clearTimeout(ceiling)
    ceiling = setTimeout(() => {
      if (isDev() && !warned) {
        warned = true
        console.warn(
          `[Roadie] A wait was still open after ${PENDING_CEILING}ms, so Roadie stopped reporting it. A navigation that never lands, or a Pane left with \`pending\`.`
        )
      }
      holds.clear()
      wait = null
      publish()
    }, PENDING_CEILING)
    publish()
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get: () => shown,
    // A second click keeps the first one's clock, so the indicator cannot blink
    // between two slow hops.
    start: () => open(wait?.startedAt ?? Date.now(), false),
    settle: () => {
      if (wait !== null) wait.settled = true
      publish()
    },
    // With nothing in flight this is a pane reporting a wait of its own, so it
    // opens one that only the holds keep alive.
    hold: () => {
      const token = Symbol('pending hold')
      holds.add(token)
      if (wait === null) open(Date.now(), true)
      else publish()
      return () => {
        holds.delete(token)
        publish()
      }
    }
  }
}

/**
 * Watches the window for the things that end a navigation whatever the router
 * does: a traversal, a document leaving, a backgrounded tab. Where the
 * Navigation API exists, a committed URL is the route landing, which covers a
 * navigation that draws the same panes it left.
 *
 * Each of these settles the navigation. A pane still reporting `pending` keeps
 * the wait open, because a Back press does not make its content arrive.
 */
export function watchNavigation(store: PendingNavigationStore): () => void {
  if (typeof window === 'undefined') return () => {}
  const off: (() => void)[] = []
  const on = (
    target: EventTarget,
    type: string,
    run: (event: Event) => void
  ) => {
    target.addEventListener(type, run)
    off.push(() => target.removeEventListener(type, run))
  }
  const settle = () => store.settle()
  on(window, 'popstate', settle)
  on(window, 'pagehide', settle)
  on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') settle()
  })
  const entries = (window as { navigation?: EventTarget }).navigation
  // A router pushes the URL inside React's commit and this event fires from
  // there, where telling a subscriber is an update scheduled out of an
  // insertion effect. A microtask lands after the commit instead.
  if (typeof entries?.addEventListener === 'function') {
    on(entries, 'currententrychange', () => queueMicrotask(settle))
  }
  return () => off.forEach((remove) => remove())
}
