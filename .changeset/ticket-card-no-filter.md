---
'@oztix/roadie-components': patch
---

`Card variant='ticket'` moves at 60fps in a `Carousel` and scrolls smoothly in a long list. It drew its edge and shadow with seven stacked `drop-shadow()` filters, which the browser redraws on every frame the card moves; it now draws the shadow with a `box-shadow` on the card and the edge from its parts, inside their own boxes. It looks the same, but for the faint shadow inside each notch, and a raised ticket's soft shadow now runs under a notch's mouth. Apps that added `will-change: transform` to ticket cards to work around it can remove it.
