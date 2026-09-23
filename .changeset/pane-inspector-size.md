---
'@oztix/roadie-components': minor
---

Add `size` to an inspector `Pane`: `sm` (14rem, the default), `md` (20rem) or
`lg` (24rem). Each size has its own thresholds, so the stack's panes keep
their minimum widths beside it and `pane-inspector-yielded:` flips at the
right width. Use `size` rather than widening the column with a class, which
leaves the thresholds assuming 14rem.
