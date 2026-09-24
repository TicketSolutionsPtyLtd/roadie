---
'@oztix/roadie-components': minor
---

Add `Checkbox` and `CheckboxGroup`, built on Base UI's checkbox primitives and
styled as siblings of `RadioGroup`. `Checkbox` takes a `label` and
`description`, shows a tick or, when `indeterminate`, a dash, and picks up
`invalid`, `required` and `disabled` from a surrounding `Field`.
`CheckboxGroup` tracks an array of ticked values, lays out vertically or
horizontally in `subtler` or `normal` emphasis, and supports a parent "select
all" item through `allValues` and `parent`.
