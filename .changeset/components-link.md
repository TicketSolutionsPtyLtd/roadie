---
'@oztix/roadie-components': minor
---

New `Link` in `@oztix/roadie-components/link`, the anchor every
link-bearing component already renders. Internal hrefs route through the
Link given to `RoadieProvider`, external ones open in a new tab, and unsafe
ones are refused. It has no styles of its own, so use it for text links such
as those in rendered content.
