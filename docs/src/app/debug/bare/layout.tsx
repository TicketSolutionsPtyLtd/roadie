'use client'

import type { ReactNode } from 'react'

import { useRoute } from '@/lib/route'

import { Navigator } from '@oztix/roadie-components/navigator'

// A top-level Navigator owning the window, as an app has it; `/debug/stack` nests one in the docs frame.
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
