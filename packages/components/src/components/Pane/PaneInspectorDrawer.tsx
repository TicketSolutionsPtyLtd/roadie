'use client'

import {
  type ReactNode,
  type RefObject,
  Suspense,
  useLayoutEffect,
  useState
} from 'react'

import type { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { XIcon } from '@phosphor-icons/react'

import { IconButton } from '../Button/IconButton'
import { Drawer } from '../Drawer'
import type { DrawerSize } from '../Drawer/variants'
import { PaneFallback } from './PaneFallback'
import { PaneInspectorDrawerContext } from './PaneInspectorContext'

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
  size: DrawerSize
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
  size,
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
      <Drawer.Content
        data-inspector-yielded=''
        size={size}
        className='[--pane-surface:var(--intent-bg-raised)]'
        {...label}
      >
        {/* Content with its own Pane.Header closes from there instead. */}
        <Drawer.Header className='[[data-slot=drawer-popup]:has([data-slot=pane-header])_&]:hidden'>
          <Drawer.Close
            render={
              <IconButton aria-label='Close' emphasis='normal'>
                <XIcon weight='bold' className='size-5' />
              </IconButton>
            }
          />
        </Drawer.Header>
        {/* A Pane.Body fills the drawer as it fills a pane. */}
        <Drawer.Body className='has-[>[data-slot=pane-body]]:flex has-[>[data-slot=pane-body]]:min-h-full has-[>[data-slot=pane-body]]:flex-col has-[>[data-slot=pane-header]]:pt-0'>
          <PaneInspectorDrawerContext value>
            <Suspense fallback={<PaneFallback header />}>{children}</Suspense>
          </PaneInspectorDrawerContext>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
