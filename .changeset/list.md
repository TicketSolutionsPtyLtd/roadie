---
'@oztix/roadie-components': minor
---

Add `List`, the vertical row primitive: a title with optional description,
leading and trailing slots, a drill-in chevron, grouped sections with titles,
and `href` rows that route through `RoadieLinkProvider`. A row's description is
announced as its description rather than as part of its name, the leading and
trailing slots carry `data-slot`, and `List.GroupTitle` is an `<h2>` whose level
`render` changes, such as `render={<h3 />}`.
