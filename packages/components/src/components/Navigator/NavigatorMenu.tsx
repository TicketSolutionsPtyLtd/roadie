import type { ReactNode } from 'react'

export type NavigatorMenuProps = {
  /** Names the menu. Falls back to the item's own label. */
  'aria-label'?: string
  className?: string
  children?: ReactNode
}

/**
 * A menu owned by a `Navigator.Item`; the item opens it instead of navigating.
 * Renders nothing itself, so author the tree in a client component — see
 * COMPOUND_PATTERNS.md §1.2. Declare `Navigator.MenuItem`s as direct
 * children; one nested in a Fragment or another component keeps a stale
 * `onClick` after the menu re-renders.
 */
export function NavigatorMenu(_props: NavigatorMenuProps): null {
  return null
}

NavigatorMenu.displayName = 'Navigator.Menu'
