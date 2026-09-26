'use client'

import NextLink from 'next/link'

import { RoadieProvider } from '@oztix/roadie-components'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <RoadieProvider link={NextLink} theme={{ followSystem: true }}>
      {children}
    </RoadieProvider>
  )
}
