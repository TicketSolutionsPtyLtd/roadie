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
  // Tokens, not a count: a release after the ceiling has nothing left to take.
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

  // The ceiling belongs to the wait, so a pane stuck `pending` gives up too.
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
    // A second click keeps the first's clock, so the indicator can't blink between hops.
    start: () => open(wait?.startedAt ?? Date.now(), false),
    settle: () => {
      if (wait !== null) wait.settled = true
      publish()
    },
    // Nothing in flight: a pane's own wait, kept alive only by holds.
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

/** Settles on a traversal, a leaving document, a hidden tab or a committed URL; a pane's `pending` still holds. */
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
  // Deferred a microtask: this fires inside React's commit, where notifying would schedule an update.
  if (typeof entries?.addEventListener === 'function') {
    on(entries, 'currententrychange', () => queueMicrotask(settle))
  }
  return () => off.forEach((remove) => remove())
}
