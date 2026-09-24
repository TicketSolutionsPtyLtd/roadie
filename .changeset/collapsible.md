---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Collapsible`, a single panel that a trigger shows and hides, built on Base
UI's collapsible primitive. `Collapsible.Trigger` shows a trailing caret that
turns when open (`showIndicator={false}` hides it) and renders onto a Roadie
`Button` through `render` for "Show more" patterns. `Collapsible.Panel` passes
`keepMounted` and `hiddenUntilFound` through. It opens and closes with the same
height motion and caret turn as `Accordion`: `is-disclosure-animated` in core now
also animates a Base UI collapsible panel, and both carets share
`disclosureCaretClass`.
