---
'@oztix/roadie-components': minor
---

Add `List`, the vertical row primitive: a title with optional subtitle, leading
and trailing slots, a drill-in chevron, grouped sections with titles, and
`href` rows that route through `RoadieLinkProvider`. The subtitle is read as the
row's description rather than part of its name, the leading and trailing slots
carry `data-slot`, and `List.GroupTitle` is an `<h2>` whose level `render`
changes, such as `render={<h3 />}`.
