'use client'

import NextLink from 'next/link'

import {
  RoadieLinkProvider,
  ThemeProvider,
  type RoadieLinkComponent
} from '@oztix/roadie-components'

// `next/link` accepts a superset of the `RoadieLinkProps` shape (it
// adds `prefetch`, `replace`, `scroll`, etc.). Cast through a minimal
// alias so TypeScript treats it as a valid `RoadieLinkComponent`
// without forcing consumers to wrap it.
const NextLinkAsRoadieLink = NextLink as unknown as RoadieLinkComponent

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoadieLinkProvider Link={NextLinkAsRoadieLink}>
      <ThemeProvider followSystem>{children}</ThemeProvider>
    </RoadieLinkProvider>
  )
}
