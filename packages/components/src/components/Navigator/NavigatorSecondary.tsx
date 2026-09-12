import type { ReactNode } from 'react'

export type NavigatorSecondaryRoot = 'list' | 'page'

export type NavigatorSecondaryProps = {
  /** Names the section's navigation landmark, e.g. 'Events pages'. */
  'aria-label': string
  /** Adds a search field to the section's pane that filters rows by label. */
  searchable?: boolean
  /** What the section route shows: the generated list, or the page alone. @default 'list' */
  root?: 'list' | 'page'
  className?: string
  children?: ReactNode
}

/**
 * A section's sub-pages, declared inside its `Navigator.Item` and read by
 * `Navigator.Primary`. They open in a list pane that `Navigator.Content`
 * generates; override one section with `Navigator.SecondaryPane`. Author the
 * tree in a client component — it is found by element identity.
 */
export function NavigatorSecondary(_props: NavigatorSecondaryProps): null {
  return null
}

NavigatorSecondary.displayName = 'Navigator.Secondary'
