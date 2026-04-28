'use client'

import { type ReactNode, use, useEffect, useRef } from 'react'

import { isDev } from '../utils/isDev'
import {
  type RoadieLinkComponent,
  RoadieLinkContext
} from './RoadieLinkContext'

export type { RoadieLinkComponent, RoadieLinkProps } from './RoadieLinkContext'

export type RoadieLinkProviderProps = {
  /**
   * The Link component used for internal routing. Pass
   * `import Link from 'next/link'`, an in-app shim that wraps
   * `next/link`, or any component that accepts `href` and renders an
   * anchor-shaped element. Pass `null` (or omit the provider entirely)
   * to fall back to plain `<a>` for internal hrefs.
   */
  Link: RoadieLinkComponent | null
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
  children
}: RoadieLinkProviderProps) {
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
      {children}
    </RoadieLinkContext.Provider>
  )
}

RoadieLinkProvider.displayName = 'RoadieLinkProvider'

/**
 * Returns the Link component configured by the nearest
 * {@link RoadieLinkProvider}, or `null` when no provider is wired.
 */
export function useRoadieLink(): RoadieLinkComponent | null {
  return use(RoadieLinkContext)
}
