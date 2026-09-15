import type { ReactNode } from 'react'

export type NavigatorMenuProps = {
  /** Names the menu. Falls back to the item's own label. */
  'aria-label'?: string
  className?: string
  children?: ReactNode
}

/** A menu an item opens instead of navigating. Takes `Navigator.MenuItem`s as direct children. */
export function NavigatorMenu(_props: NavigatorMenuProps): null {
  return null
}

NavigatorMenu.displayName = 'Navigator.Menu'
