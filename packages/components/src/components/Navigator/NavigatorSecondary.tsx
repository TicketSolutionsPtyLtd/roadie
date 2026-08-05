import type { ReactNode } from 'react'

import { cn } from '@oztix/roadie-core/utils'

import { wrapRailRun } from './railList'
import { navigatorSecondaryVariants } from './variants'

export type NavigatorSecondaryProps = {
  /** Names the nested landmark, e.g. 'Events sections'. */
  'aria-label': string
  className?: string
  children?: ReactNode
}

/**
 * The nested layer under a primary item: nested beneath its row in the rail on
 * desktop, hoisted into the top pane's header as a horizontal strip on mobile.
 * Declaring one anywhere in the tree also switches the whole rail to its
 * nested form.
 *
 * Right for a handful of flat sub-pages. Once the list is long, grouped,
 * filterable, or its rows carry more than a label, declare a `Pane` of your
 * own inside `Navigator.Content` instead and leave the section without a
 * Secondary — a section's `value` matches as a route prefix, so it stays
 * branch-active across sub-pages it never declares.
 *
 * Renders unconditionally — `Navigator.Item` mounts it only while it is the
 * active item, and `Navigator.Primary` reads the same declaration to build
 * the mobile strip. Keeping the gate in the parents lets one authored
 * element drive both presentations.
 *
 * Author the Navigator tree inside a client component. Both parents find
 * this element by reference, and Flight replaces the type of every element
 * authored in a server component with a `React.lazy` wrapper — a `'use
 * client'` directive here does not change that. See the canary in
 * `docs/src/app/debug/rsc-smoke/`.
 *
 * Only ever rendered in the rail: the strip renders `secondaryNav.children`
 * directly rather than this element, so it needs no presentation branch.
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
      {wrapRailRun(children)}
    </nav>
  )
}

NavigatorSecondary.displayName = 'Navigator.Secondary'
