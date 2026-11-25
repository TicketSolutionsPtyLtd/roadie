---
'@oztix/roadie-core': patch
---

`cn()` now lets `text-mark` and `bg-mark` replace another semantic text or background colour, so `cn('text-normal', 'text-mark')` returns `text-mark` instead of keeping both.
