'use client'

import {
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useState
} from 'react'

import type { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { Drawer } from '../Drawer'

// The column's CSS decides the yield from the whole stack, so read the result rather than redo the maths.
export function useColumnYielded(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  const [yielded, setYielded] = useState(false)
  useLayoutEffect(() => {
    const node = ref.current
    if (!enabled || !node || typeof ResizeObserver === 'undefined') return
    const measure = () => setYielded(getComputedStyle(node).display === 'none')
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, enabled])
  return enabled && yielded
}

type PaneInspectorDrawerProps = {
  handle: DrawerPrimitive.Handle<unknown>
  yielded: boolean
  reveal?: boolean
  onRevealChange?: (reveal: boolean) => void
  'aria-label'?: string
  'aria-labelledby'?: string
  children: ReactNode
}

// Subtle: an inspector supplements the page, so the page stays readable behind it.
export function PaneInspectorDrawer({
  handle,
  yielded,
  reveal,
  onRevealChange,
  children,
  ...label
}: PaneInspectorDrawerProps) {
  const [ownReveal, setOwnReveal] = useState(false)
  const [wasYielded, setWasYielded] = useState(yielded)
  // Uncontrolled, the column coming back answers the reveal, so it doesn't reopen on the next yield.
  if (wasYielded !== yielded) {
    setWasYielded(yielded)
    if (!yielded) setOwnReveal(false)
  }
  const revealed = reveal ?? ownReveal
  const setRevealed = (next: boolean) => {
    if (reveal === undefined) setOwnReveal(next)
    onRevealChange?.(next)
  }

  return (
    <Drawer
      handle={handle}
      emphasis='subtle'
      open={yielded && revealed}
      onOpenChange={setRevealed}
    >
      <Drawer.Content {...label}>
        <Drawer.Body>{children}</Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
