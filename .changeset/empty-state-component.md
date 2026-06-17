---
'@oztix/roadie-components': minor
---

Add **EmptyState** — a compound component for empty/zero states that scales
from a small empty section to a whole-page empty/404 screen via a single
`size` token (sm/md/lg).

Sub-components: `EmptyState.IconTile` (Phosphor icon in a tinted circle),
`EmptyState.Illustration` (SpotIllustration or custom hero), `EmptyState.Title`
(size-scaled, heading level overridable via `render`), `EmptyState.Description`,
and `EmptyState.Actions`. Size flows through context, so each slot scales
itself; the recommended media pairing is sm→IconTile, md→SpotIllustration,
lg→hero. The root takes an optional `intent` prop (no default — omit to
inherit the palette from an ancestor), so the IconTile and Buttons inside
share one colour context. Available from the barrel and the
`@oztix/roadie-components/empty-state` subpath.
