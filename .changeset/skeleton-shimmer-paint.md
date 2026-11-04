---
'@oztix/roadie-core': patch
---

`animate-shimmer`, which Skeleton uses, no longer repaints every placeholder on every frame. A loading list of 90 placeholders dropped a third of its frames on a slowed CPU and now drops none. Each placeholder's highlight now runs on a gradient twice the viewport wide rather than one anchored to the viewport, so every band moves at the same speed and placeholders that share a left edge, such as the rows of a list, still sweep together. Placeholders at different left edges show the band slightly apart. The sweep also now runs right to left in a right-to-left page.
