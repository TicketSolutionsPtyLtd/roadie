---
'@oztix/roadie-components': patch
---

A `Carousel` with `autoPlay` now moves to the next slide once the delay has
passed. Before, it never advanced: Embla re-initialises when the slides
mount, the carousel resizes, or slides change, and each time it stopped the
autoplay timer without starting it again. Autoplay now resumes after each of
these, unless the user has paused it with `Carousel.PlayPause` or the pointer
or focus is inside the carousel, in which case it resumes when they leave. A
user who prefers reduced motion still gets no autoplay.
