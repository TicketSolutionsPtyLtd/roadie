import type { AnchorHTMLAttributes, Ref } from 'react'

import { RoadieRoutedLink } from './RoadieRoutedLink'

// Its own type, so an internal prop added to RoadieRoutedLink stays internal.
export type LinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> & {
  href: string
  /**
   * Opens in a new tab when `true`, or routes through the Link given to
   * `RoadieProvider` when `false`. Unset, an `http(s)://` or `//` href is
   * external and any other is internal.
   */
  external?: boolean
  ref?: Ref<HTMLAnchorElement>
}

/**
 * An anchor that routes like every link-bearing Roadie component: internal
 * hrefs through the Link given to `RoadieProvider`, external ones in a new
 * tab, and unsafe ones refused. It has no styles of its own.
 */
export function Link(props: LinkProps) {
  return <RoadieRoutedLink {...props} />
}
