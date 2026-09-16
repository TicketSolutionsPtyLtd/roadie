'use client'

import { type RefObject, use } from 'react'

import {
  NavigatorDisclosureContext,
  NavigatorSelectionContext
} from './NavigatorContext'
import { useSlidingIndicator } from './useSlidingIndicator'
import {
  type NavigatorIndicatorSurface,
  navigatorIndicatorVariants
} from './variants'

export type NavigatorIndicatorProps = {
  /** The element the active destination is measured against. */
  trackRef: RefObject<HTMLElement | null>
  surface: NavigatorIndicatorSurface
  /** Suppress without unmounting, e.g. while the tab bar is collapsed. */
  hidden?: boolean
}

/** Decorative; aria-current on the destination conveys currency. */
export function NavigatorIndicator({
  trackRef,
  surface,
  hidden = false
}: NavigatorIndicatorProps) {
  const { value } = use(NavigatorSelectionContext)
  const { openMenu, overflowOpen } = use(NavigatorDisclosureContext)
  const { style, ready, settled } = useSlidingIndicator(
    trackRef,
    `${value}|${openMenu}|${overflowOpen}`
  )
  const visible = ready && !hidden

  return (
    <span
      aria-hidden='true'
      data-slot='navigator-indicator'
      data-ready={String(ready)}
      data-settled={String(settled)}
      style={style}
      className={navigatorIndicatorVariants({ surface, visible })}
    />
  )
}

NavigatorIndicator.displayName = 'NavigatorIndicator'
