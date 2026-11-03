---
'@oztix/roadie-components': patch
---

Fix `Kbd` quietly ignoring `combined` without `keys`. It now warns in development, since `combined` only joins `keys` into one keycap. The `separator` docs now say only a string with a word is read aloud; an element separator stays hidden.
