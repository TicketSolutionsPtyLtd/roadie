'use client'

import { type ReactNode, use, useEffect, useRef, useState } from 'react'

import { isDev } from '../utils/isDev'
import { PendingNavigationContext } from './PendingNavigationContext'
import {
  type RoadieLinkComponent,
  RoadieLinkContext
} from './RoadieLinkContext'
import {
  createPendingNavigationStore,
  watchNavigation
} from './pendingNavigationStore'

export type { RoadieLinkComponent, RoadieLinkProps } from './RoadieLinkContext'
export { useRoadieLink } from './RoadieLinkContext'

export type RoadieLinkProviderProps = {
  /**
   * The Link component used for internal routing. Pass
   * `import Link from 'next/link'`, an in-app shim that wraps
   * `next/link`, or any component that accepts `href` and renders an
   * anchor-shaped element. Pass `null` (or omit the provider entirely)
   * to fall back to plain `<a>` for internal hrefs.
   */
  Link: RoadieLinkComponent | null
  /**
   * Draws the pending indicator on a `Navigator` frame while an internal link
   * navigation is in flight. @default true
   */
  pendingIndicator?: boolean
  children: ReactNode
}

/**
 * Supplies the configured Link component to every Roadie surface that
 * accepts `href` (Button, IconButton, Card, Breadcrumb.Link,
 * Carousel.TitleLink, Tabs.Tab). Components fall back to plain `<a>`
 * when no provider is wired or `Link` is `null`.
 *
 * Mount once at the app root, alongside `ThemeProvider`. Pass a stable
 * Link reference — swapping it across renders triggers a dev warning.
 */
export function RoadieLinkProvider({
  Link,
  pendingIndicator = true,
  children
}: RoadieLinkProviderProps) {
  const [store] = useState(createPendingNavigationStore)
  const pending = pendingIndicator ? store : null
  useEffect(() => {
    if (pending === null) return
    return watchNavigation(pending)
  }, [pending])

  // Track the previous Link in a ref updated only after commit
  // (useEffect), not during render. This avoids spurious warnings under
  // React 19 concurrent rendering when a render attempt is discarded.
  const previousLink = useRef<RoadieLinkComponent | null>(Link)
  useEffect(() => {
    if (
      isDev() &&
      previousLink.current !== Link &&
      previousLink.current !== null &&
      Link !== null
    ) {
      console.warn(
        '[Roadie] RoadieLinkProvider received a new Link reference. Pass a stable component (typically `import Link from "next/link"` at module scope) — recreating Link on every render will defeat React rendering optimizations.'
      )
    }
    previousLink.current = Link
  }, [Link])

  // Pass `Link` straight through. React.context bails on unchanged
  // references already; an extra useMemo would just wrap the identity.
  return (
    <RoadieLinkContext.Provider value={Link}>
      <PendingNavigationContext value={pending}>
        {children}
      </PendingNavigationContext>
    </RoadieLinkContext.Provider>
  )
}

RoadieLinkProvider.displayName = 'RoadieLinkProvider'

/**
 * Reports a navigation Roadie cannot see: one your own code starts with
 * `router.push`, or one from a link that is not a Roadie surface. `stop` is the
 * same signal as the route landing, so it never cuts short a pane's `pending`.
 *
 * Call these from an event handler. Calling `start` from a layout or insertion
 * effect schedules a render from a commit, which React refuses.
 */
export function usePendingNavigation(): {
  start: () => void
  stop: () => void
} {
  const store = use(PendingNavigationContext)
  return {
    start: () => store?.start(),
    stop: () => store?.settle()
  }
}
