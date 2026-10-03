// Server-safe entry for the internal Link folder.
//
// `RoadieRoutedLink` is **not** part of the public Roadie API — it is the
// internal delegation target every smart-href component composes. Consumers
// pass `href` directly to Button / IconButton / Card / Breadcrumb.Link /
// Carousel.TitleLink / Tabs.Tab and never touch this primitive themselves.
//
// A public `<Link>` is deferred until a consumer needs one; custom links use
// `useRoadieLink`. Flipping later is a one-line export change here.

export type { RoadieRoutedLinkProps } from './RoadieRoutedLink'
export { RoadieRoutedLink } from './RoadieRoutedLink'
