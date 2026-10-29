---
'@oztix/roadie-components': patch
---

Show a focus ring on `Tabs.Panel` and the `Carousel.Content` track when the keyboard reaches them. Both took focus with no visible ring. The track's ring sits inside its box, so a clipping parent or the screen edge can't cut it.
