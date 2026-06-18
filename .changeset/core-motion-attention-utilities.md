---
'@oztix/roadie-core': minor
---

Add generalized motion utilities to `motion.css`: `animate-nudge` and
`animate-pop` (one-shot attention cues) plus `motion-pop-in` (fade + slide-up +
scale entrance, pair with `origin-*`). Token-driven for duration/easing and
covered by the global `prefers-reduced-motion` reset. These replace the
cart-drawer widget's bespoke keyframes.
