'use client'

import type { ReactNode } from 'react'

import { usePathname } from 'next/navigation'

import { Navigator } from '@oztix/roadie-components/navigator'

// Permanent canary for route-driven pane motion, the shape no docs demo has:
// `Navigator.Content` is in the outermost layout, every deeper pane is its own
// route segment, and the router owns the unmount. A demo where Roadie renders
// the panes itself proves nothing about a shell, which is how a pop that did
// not retain its pane and a scroll that reset on Back both reached a release.
// See docs/solutions/pane-motion/route-driven-shells.md.
//
// This one is nested: its panes sit inside the docs' own pane viewport.
// `/debug/bare` is the same stack with the frame owning the window, which
// is the shape an app has. Measure anything about the frame itself there.
export default function StackLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <Navigator value={pathname}>
      <Navigator.Primary aria-label='Debug'>
        <Navigator.Item value='/debug/stack/evt' href='/debug/stack/evt'>
          Stack
        </Navigator.Item>
      </Navigator.Primary>
      <Navigator.Content>{children}</Navigator.Content>
    </Navigator>
  )
}
