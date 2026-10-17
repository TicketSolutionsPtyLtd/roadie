---
'@oztix/roadie-core': patch
---

The reduced-motion reset now sets `animation-delay` and `transition-delay` to
`0s` on every element and its `::before` and `::after`, as well as shortening
durations. For a user who prefers reduced motion, a staggered list or any other
delayed CSS animation or transition now starts at once instead of waiting out
its delay. Delays timed in JavaScript, such as Tooltip's `delay`, still wait.
