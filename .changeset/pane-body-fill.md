---
'@oztix/roadie-components': minor
---

`Pane.Body` now renders a `<div>` that fills the height the header leaves,
and takes `className` and the other div props. A band or background on it
reaches the pane's bottom edge, and a child with `grow` inside a
`flex flex-col` body does too, so apps no longer need to restyle the pane's
scroll content. A pane without a `Pane.Body` keeps its content height, as
before.
