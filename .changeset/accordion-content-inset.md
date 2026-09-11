---
'@oztix/roadie-components': minor
---

`Accordion` now publishes `--content-inset` (16px) and both its trigger and
content read it, so content dropped into `Accordion.Content` lines up with the
trigger without extra padding. Override the variable on the root to change both
at once. In Safari, an open panel whose content changes size, such as a filtered
list, now resizes with it instead of clipping.
