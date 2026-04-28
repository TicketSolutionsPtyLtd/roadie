'use client'

// `createContext` at module scope makes this a client module under Next's
// rules. The provider component lives in a sibling file; consumers read
// the context through the `useRoadieLink` hook also exported from
// `RoadieLinkProvider.tsx`.
import {
  type AnchorHTMLAttributes,
  type ComponentType,
  type Ref,
  createContext
} from 'react'

/**
 * The shape of the Link component a consumer app injects via
 * `RoadieLinkProvider`. Mirrors the contract `next/link` exposes so
 * most consumers can pass `import Link from 'next/link'` directly, but
 * accepts any component whose props are a superset of an anchor: a
 * required `href` plus the standard React anchor attributes and a
 * forwarded `ref`.
 */
export type RoadieLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  ref?: Ref<HTMLAnchorElement>
}

export type RoadieLinkComponent = ComponentType<RoadieLinkProps>

/**
 * The configured Link component, or `null` when no provider is wired.
 * Components that opt into routing call `useRoadieLink()` and fall
 * back to `<a>` when the value is `null`.
 */
export const RoadieLinkContext = createContext<RoadieLinkComponent | null>(null)
