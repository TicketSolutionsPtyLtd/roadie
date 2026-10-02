---
'@oztix/roadie-components': minor
---

`Pane` publishes `--pane-sticky-bottom`, the height of its `Pane.Footer`, so
sticky content at the bottom of a pane can clear the footer. A direct child of
`Pane.Body` marked `data-pane-fill` takes the height the rest of the body
leaves; give it its own overflow and it scrolls while the pane stays put.
