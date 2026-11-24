---
'@oztix/roadie-components': patch
---

`Card variant='ticket'` moves at 60fps in a `Carousel` and scrolls smoothly in a long list. It drew its edge and shadow with seven stacked `drop-shadow()` filters, which the browser redraws on every frame the card moves; it now draws them with a `box-shadow` and a ring around each notch. It looks the same, without the faint shadow inside the notch. Apps that added `will-change: transform` to ticket cards to work around it can remove it.
