'use client'

import type { ReactNode } from 'react'

import { useRoute } from '@/lib/route'

import { Navigator } from '@oztix/roadie-components/navigator'

// Route-driven pane motion canary, nested in the docs' pane; `/debug/bare` owns the window. See docs/solutions/pane-motion/route-driven-shells.md.
export default function StackLayout({ children }: { children: ReactNode }) {
  const route = useRoute()
  return (
    <Navigator value={route}>
      <Navigator.Primary aria-label='Debug'>
        <Navigator.Item value='/debug/stack/evt' href='/debug/stack/evt'>
          Stack
        </Navigator.Item>
      </Navigator.Primary>
      {children}
    </Navigator>
  )
}
