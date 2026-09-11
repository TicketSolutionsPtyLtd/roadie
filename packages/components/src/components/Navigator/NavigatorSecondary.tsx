import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { wrapPrimaryRun } from './primaryList'
import { navigatorSecondaryVariants } from './variants'

export type NavigatorSecondaryProps = {
  /** Names the nested landmark, e.g. 'Events sections'. */
  'aria-label': string
  className?: string
  children?: ReactNode
}

/**
 * An item's sub-pages: beneath its row on desktop, a strip in the top pane's
 * header on phones. Author the tree in a client component — it is found by
 * element identity.
 */
export function NavigatorSecondary({
  'aria-label': ariaLabel,
  className,
  children
}: NavigatorSecondaryProps) {
  return (
    <nav
      data-slot='navigator-secondary'
      aria-label={ariaLabel}
      className={cn(navigatorSecondaryVariants(), className)}
    >
      {wrapPrimaryRun(children)}
    </nav>
  )
}

NavigatorSecondary.displayName = 'Navigator.Secondary'
