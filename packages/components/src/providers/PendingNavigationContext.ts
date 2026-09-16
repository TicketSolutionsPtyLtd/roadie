'use client'

import { createContext, use, useSyncExternalStore } from 'react'

/** A wait in progress, from a click or from a pane that says it is loading. */
export type PendingNavigation = {
  /** The frame arms from here, not from when it mounted. */
  startedAt: number
}

export type PendingNavigationStore = {
  subscribe: (listener: () => void) => () => void
  get: () => PendingNavigation | null
  /** A link was clicked. */
  start: () => void
  /** The route landed. Over unless a pane still holds it. */
  settle: () => void
  /** Over outright: a traversal, a hidden tab, the ceiling. */
  end: () => void
  /** Keeps the wait open, opening one if nothing else has. Returns the release. */
  hold: () => () => void
}

export const PendingNavigationContext =
  createContext<PendingNavigationStore | null>(null)
PendingNavigationContext.displayName = 'PendingNavigationContext'

/** The store `RoadieLinkProvider` mounts, or `null` where none is wired. */
export function usePendingNavigationStore(): PendingNavigationStore | null {
  return use(PendingNavigationContext)
}

const NO_STORE = () => () => {}
const NO_NAVIGATION = (): PendingNavigation | null => null

/** The wait being reported, or `null`. Re-renders the caller when it changes. */
export function usePendingNavigation(): PendingNavigation | null {
  const store = use(PendingNavigationContext)
  return useSyncExternalStore(
    store?.subscribe ?? NO_STORE,
    store?.get ?? NO_NAVIGATION,
    NO_NAVIGATION
  )
}
