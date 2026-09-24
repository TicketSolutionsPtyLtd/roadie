---
'@oztix/roadie-components': minor
'@oztix/roadie-core': minor
---

Add `Collapsible`, a single panel that a trigger shows and hides.
`Collapsible.Trigger` shows a trailing caret that turns when open (`showCaret={false}`
hides it) and renders onto a Roadie `Button` through `render`.
`Collapsible.Panel` passes `keepMounted` and `hiddenUntilFound` through.

`is-disclosure-animated` now also animates Base UI panels that aren't `<details>`,
by height from `--collapsible-panel-height`.
