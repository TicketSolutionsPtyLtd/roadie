---
'@oztix/roadie-core': patch
---

`animate-shimmer`, which Skeleton uses, costs less to paint. It still repaints each placeholder on every frame, but with a gradient as tall as the placeholder rather than as tall as the viewport. A loading list of 90 placeholders dropped a third of its frames on a slowed CPU and now holds its frame budget. Each placeholder's highlight now runs on a gradient twice the viewport wide rather than one anchored to the viewport, so every band moves at the same speed and placeholders that start at the same edge, such as the rows of a list, still sweep together. Placeholders that start at different points show the band slightly apart. The sweep also now runs right to left in a right-to-left page, where lines start at the right edge.
