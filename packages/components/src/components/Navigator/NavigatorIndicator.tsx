'use client'

import type { RefObject } from 'react'

import { cn } from '@oztix/roadie-core/utils'

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
  className?: string
}

/**
 * Purely presentational: `aria-hidden` because `aria-current` on the
 * destination itself is what conveys currency. The pill is decoration.
 */
export function NavigatorIndicator({
  trackRef,
  surface,
  hidden = false,
  className
}: NavigatorIndicatorProps) {
  const { style, ready, settled } = useSlidingIndicator(trackRef)
  const visible = ready && !hidden

  return (
    <span
      aria-hidden='true'
      data-slot='navigator-indicator'
      data-ready={String(ready)}
      data-settled={String(settled)}
      style={style}
      className={cn(
        navigatorIndicatorVariants({ surface, visible }),
        className
      )}
    />
  )
}

NavigatorIndicator.displayName = 'NavigatorIndicator'
