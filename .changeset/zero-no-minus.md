---
'@oztix/roadie-core': patch
---

Fix `formatValue` showing a minus on a value that rounds to zero: `-0.4` with no decimals now reads `0`, and a tiny negative amount `$0`, not `-0` and `-$0`, in every format.
