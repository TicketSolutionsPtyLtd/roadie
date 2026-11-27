---
'@oztix/roadie-components': patch
---

`Card`'s horizontal and auto directions share one grid rule in the stylesheet instead of two copies, so the shipped CSS is about 450 bytes smaller. Nothing looks different.
