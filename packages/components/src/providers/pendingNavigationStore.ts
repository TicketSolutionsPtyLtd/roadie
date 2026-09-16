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
  let wait: { startedAt: number; settled: boolean } | null = null
  let holds = 0
  let shown: PendingNavigation | null = null
  let ceiling: ReturnType<typeof setTimeout> | undefined
  let warned = false

  const publish = () => {
    // A landed route nothing is holding is not a wait any more.
    if (wait?.settled === true && holds === 0) {
      wait = null
      clearTimeout(ceiling)
    }
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

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get: () => shown,
    start: () => {
      clearTimeout(ceiling)
      ceiling = setTimeout(() => {
        if (isDev() && !warned) {
          warned = true
          console.warn(
            `[Roadie] A navigation was still pending after ${PENDING_CEILING}ms, so Roadie stopped reporting it.`
          )
        }
        wait = null
        publish()
      }, PENDING_CEILING)
      // A second click keeps the first one's clock, so the indicator cannot
      // blink between two slow hops.
      wait = { startedAt: wait?.startedAt ?? Date.now(), settled: false }
      publish()
    },
    settle: () => {
      if (wait !== null) wait.settled = true
      publish()
    },
    end: () => {
      wait = null
      publish()
    },
    // With nothing in flight this is a pane reporting a wait of its own, so it
    // opens one that only the holds keep alive.
    hold: () => {
      holds += 1
      wait ??= { startedAt: Date.now(), settled: true }
      publish()
      let mine = true
      return () => {
        if (!mine) return
        mine = false
        holds -= 1
        publish()
      }
    }
  }
}

/**
 * Watches the window for the things that end a navigation whatever the router
 * does: a traversal, a document leaving, a backgrounded tab. Where the
 * Navigation API exists, a committed URL is also the route landing, which
 * covers a navigation that draws the same panes it left.
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
  on(window, 'popstate', () => store.end())
  on(window, 'pagehide', () => store.end())
  on(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') store.end()
  })
  const entries = (window as { navigation?: EventTarget }).navigation
  // A router pushes the URL inside React's commit and this event fires from
  // there, where telling a subscriber is an update scheduled out of an
  // insertion effect. A microtask lands after the commit instead.
  if (typeof entries?.addEventListener === 'function') {
    on(entries, 'currententrychange', (event) => {
      const traverse =
        (event as { navigationType?: string }).navigationType === 'traverse'
      queueMicrotask(() => (traverse ? store.end() : store.settle()))
    })
  }
  return () => off.forEach((remove) => remove())
}
