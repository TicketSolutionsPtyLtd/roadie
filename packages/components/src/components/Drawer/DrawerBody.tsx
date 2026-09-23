'use client'

import { type RefAttributes, useMemo } from 'react'

import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'

import { cn } from '@oztix/roadie-core/utils'

import { mergeRefs } from '../../utils/mergeRefs'
import { ScrollArea } from '../ScrollArea'

export type DrawerBodyProps = DrawerPrimitive.Content.Props &
  RefAttributes<HTMLDivElement>

const OVERFLOW_EDGES = {
  'data-overflow-y-start': 'data-body-overflow-y-start',
  'data-overflow-y-end': 'data-body-overflow-y-end'
}

// Copies the body's scroll edges onto the popup for the header and footer shadows.
// A `:has()` that flips on scroll would restyle the whole drawer each time.
function mirrorOverflowEdges(body: HTMLElement | null) {
  const popup = body?.closest('[data-slot="drawer-popup"]')
  if (!body || !popup) return () => {}
  const mirror = () => {
    for (const [edge, mirrored] of Object.entries(OVERFLOW_EDGES)) {
      popup.toggleAttribute(mirrored, body.hasAttribute(edge))
    }
  }
  mirror()
  const observer = new MutationObserver(mirror)
  observer.observe(body, { attributeFilter: Object.keys(OVERFLOW_EDGES) })
  return () => {
    observer.disconnect()
    for (const mirrored of Object.values(OVERFLOW_EDGES)) {
      popup.removeAttribute(mirrored)
    }
  }
}

// Base UI's `Content` is the viewport that scrolls, so a drag that starts here scrolls, not dismisses.
export function DrawerBody({
  className,
  children,
  ref,
  ...props
}: DrawerBodyProps) {
  const bodyRef = useMemo(
    () => mergeRefs<HTMLDivElement>(ref, mirrorOverflowEdges),
    [ref]
  )
  return (
    <ScrollArea className='grid flex-1'>
      <ScrollArea.Viewport
        render={
          <DrawerPrimitive.Content
            data-slot='drawer-body'
            ref={bodyRef}
            {...props}
          />
        }
      >
        <ScrollArea.Content
          fitWidth={false}
          className={cn('grid gap-3 px-(--content-inset) py-2', className)}
        >
          {children}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

DrawerBody.displayName = 'Drawer.Body'
