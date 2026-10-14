---
'@oztix/roadie-components': patch
---

Carousel runs on Embla 9.0.0-rc04. When the carousel or a slide resizes,
Embla now re-initialises on the next animation frame, once per frame, instead
of inside the `ResizeObserver` callback. Code that listens for `reinit`
through `useCarouselUnsafeEmbla()` sees it a frame later.
