import {
  RoadieRoutedLink,
  type RoadieRoutedLinkProps
} from './RoadieRoutedLink'

export type LinkProps = RoadieRoutedLinkProps

/**
 * An anchor that routes like every link-bearing Roadie component: internal
 * hrefs through the Link given to `RoadieProvider`, external ones in a new
 * tab, and unsafe ones refused. It has no styles of its own.
 */
export function Link(props: LinkProps) {
  return <RoadieRoutedLink {...props} />
}
