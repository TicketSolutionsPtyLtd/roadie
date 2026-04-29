// Server-safe entry for the internal Link folder.
//
// `RoadieRoutedLink` is **not** part of the public Roadie API — it is the
// internal delegation target every smart-href component composes. Consumers
// pass `href` directly to Button / IconButton / Card / Breadcrumb.Link /
// Carousel.TitleLink / Tabs.Tab and never touch this primitive themselves.
//
// Whether to expose a public `<Link>` primitive is intentionally deferred —
// see `docs/plans/2026-04-28-001-feat-roadie-link-provider-and-tracking-pattern-plan.md`
// (Open Questions). Flipping later is a one-line export change here.

export type { RoadieRoutedLinkProps } from './RoadieRoutedLink'
export { RoadieRoutedLink } from './RoadieRoutedLink'
