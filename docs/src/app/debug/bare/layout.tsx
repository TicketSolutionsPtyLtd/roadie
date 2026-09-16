'use client'

import type { ReactNode } from 'react'

import { useRoute } from '@/lib/route'

import { Navigator } from '@oztix/roadie-components/navigator'

// The second canary, and the one an app matches: a top-level Navigator owning
// the window, with no pane around it. `/debug/stack` is the same route-driven
// stack nested inside the docs' own frame, which hides anything that only goes
// wrong when the frame is the outermost thing on the page.
export default function BareLayout({ children }: { children: ReactNode }) {
  const route = useRoute()
  return (
    <Navigator value={route}>
      <Navigator.Primary aria-label='Bare'>
        <Navigator.Item value='/debug/bare/evt' href='/debug/bare/evt'>
          Events
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>{children}</Navigator.Content>
    </Navigator>
  )
}
