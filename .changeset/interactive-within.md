---
'@oztix/roadie-core': minor
---

Add `is-interactive-within`, for a surface whose main link sits inside it,
such as a card that also holds other actions. Mark the link with
`data-interactive-target`. Its overlay covers the surface, so a click anywhere
follows it, and other links, buttons and fields sit above it and stay
clickable. The surface takes the same hover, press and focus states as
`is-interactive` while its main link is hovered, pressed or focused, from the
same emphasis rules, so the values live in one place. It does nothing until a
target is present.

`is-interactive` now reads its transition list from `--interactive-transition`,
which both utilities share.
