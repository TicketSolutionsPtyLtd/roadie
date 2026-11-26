---
'@oztix/roadie-components': patch
---

`Card variant='ticket'` moves at 60fps in a `Carousel` and scrolls smoothly in a long list. It drew its edge and shadow with seven stacked `drop-shadow()` filters, which the browser redraws on every frame the card moves. It now draws the shadow with a `box-shadow` on the card and the edge from its parts. Two small changes to how it looks: the faint shadow inside each notch is gone, and a raised ticket's outline is as dark along its sides as it was around the notches. Apps that added `will-change: transform` to ticket cards to work around the frame rate can remove it.
