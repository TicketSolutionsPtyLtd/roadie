import type { ReactNode } from 'react'

import { previewArt } from '@/components/CataloguePreview'
import {
  RELEASED_PACKAGES,
  type ReleaseView,
  getReleaseViews
} from '@/lib/releases'

import { ChangelogTimeline } from './ChangelogTimeline'

/** Each card's index art, drawn once per page however many releases name it. */
export function releaseArt(releases: ReleaseView[]) {
  const art: Record<string, ReactNode> = {}
  for (const { cards } of releases)
    for (const { art: route } of cards) {
      if (!route || route in art) continue
      const catalogue = route.slice(0, route.lastIndexOf('/'))
      const name = route.slice(route.lastIndexOf('/') + 1)
      const drawn = previewArt(catalogue, { name })
      if (drawn) art[route] = drawn
    }
  return art
}

/** Every release, newest first, with what's pending at the top, filterable by package. */
export function Changelog() {
  const releases = getReleaseViews()
  return (
    <ChangelogTimeline
      releases={releases}
      art={releaseArt(releases)}
      packages={RELEASED_PACKAGES.map(({ dir, label }) => ({
        key: dir,
        label
      }))}
    />
  )
}
