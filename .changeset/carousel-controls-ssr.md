---
'@oztix/roadie-components': patch
---

`Carousel.Previous`, `Carousel.Next`, `Carousel.Dots`, and `Carousel.Controls` now render on the server, so a carousel no longer jumps when it loads. Once the carousel has measured and every slide fits, they hide with a `data-hidden` attribute, as before out of the tab order and the accessibility tree.
