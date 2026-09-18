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
  /** The route landed, or the navigation is off: over unless a pane holds it. */
  settle: () => void
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

/**
 * The wait being reported, or `null`. Re-renders the caller when it changes.
 * `watching` false subscribes to nothing, so a frame that never draws the
 * indicator does not re-render for one that does.
 */
export function usePendingNavigationSnapshot(
  watching = true
): PendingNavigation | null {
  const store = use(PendingNavigationContext)
  const live = watching ? store : null
  return useSyncExternalStore(
    live?.subscribe ?? NO_STORE,
    live?.get ?? NO_NAVIGATION,
    NO_NAVIGATION
  )
}
