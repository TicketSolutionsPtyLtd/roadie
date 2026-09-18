import type { ReactNode } from 'react'

export type NavigatorSecondaryProps = {
  /** Names the navigation landmark, e.g. 'Events pages'. */
  'aria-label': string
  /** Adds a search field to the generated pane that filters rows by label. */
  searchable?: boolean
  /**
   * The destination's own route is an overview page: it shows alone, with no
   * list beside it. The list comes back on its sub-pages. Needs an `href` on
   * the item; without one the list always shows.
   * @default false
   */
  overview?: boolean
  className?: string
  children?: ReactNode
}

/** The pages inside one destination, declared inside its item. Author it in a client component. */
export function NavigatorSecondary(_props: NavigatorSecondaryProps): null {
  return null
}

NavigatorSecondary.displayName = 'Navigator.Secondary'
