// Server-safe entry. Smart-href components compose `RoadieRoutedLink` from
// its own file; `Link` is the public anchor, for links in rendered content.
export { Link, type LinkProps } from './Link'
// The routed anchor under `Link`, with no link styling: for a package's own
// link-shaped part, such as a map pin, that routes as Roadie's links do.
export {
  RoadieRoutedLink,
  type RoadieRoutedLinkProps
} from './RoadieRoutedLink'
