---
'@oztix/roadie-components': patch
---

Stop shipping the touch, pointer, and contrast test helpers, and the Vitest copy they bundled, in the published package. Nothing imported them, so nothing changes at runtime.
